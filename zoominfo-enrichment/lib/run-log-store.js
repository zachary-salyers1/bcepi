/**
 * Run Log Store - Neon PostgreSQL storage for enrichment run history
 *
 * Tables:
 * - runs -> Run metadata and summaries
 * - run_contacts -> Individual contact processing results
 * - stats_cache -> Cached enrichment stats
 */

// Ensure dotenv is loaded before accessing DATABASE_URL
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local'), override: true });

const { neon } = require('@neondatabase/serverless');

class RunLogStore {
  constructor() {
    this.sql = null;
    this.maxRuns = 100;
  }

  /**
   * Get SQL client (lazy initialization)
   */
  getClient() {
    if (!this.sql) {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.warn('DATABASE_URL not set - run logging disabled');
        return null;
      }
      this.sql = neon(databaseUrl);
    }
    return this.sql;
  }

  /**
   * Generate a unique run ID
   */
  generateRunId() {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Start a new run
   * @param {string} trigger - 'cron' or 'manual'
   * @returns {Object} { runId, run }
   */
  async startRun(trigger = 'cron') {
    const sql = this.getClient();
    if (!sql) {
      const runId = this.generateRunId();
      return { runId, run: { id: runId, status: 'running' } };
    }

    const runId = this.generateRunId();
    const summary = { processed: 0, enriched: 0, skipped: 0, errors: 0 };

    try {
      await sql`
        INSERT INTO runs (id, trigger, status, summary)
        VALUES (${runId}, ${trigger}, 'running', ${JSON.stringify(summary)})
      `;

      // Clean up old runs (keep last N)
      await sql`
        DELETE FROM runs
        WHERE id IN (
          SELECT id FROM runs
          ORDER BY start_time DESC
          OFFSET ${this.maxRuns}
        )
      `;

      return {
        runId,
        run: {
          id: runId,
          trigger,
          status: 'running',
          startTime: new Date().toISOString(),
          summary
        }
      };
    } catch (error) {
      console.error('Failed to start run:', error.message);
      return { runId, run: { id: runId, status: 'running' } };
    }
  }

  /**
   * Add a contact result to a run
   * @param {string} runId
   * @param {Object} contact - { id, email, status, reason, fieldsUpdated, validation }
   */
  async addContact(runId, contact) {
    const sql = this.getClient();
    if (!sql) return;

    try {
      // Insert contact record
      await sql`
        INSERT INTO run_contacts (run_id, contact_id, email, status, reason, error_message, fields_updated, validation)
        VALUES (
          ${runId},
          ${contact.id},
          ${contact.email || 'unknown'},
          ${contact.status},
          ${contact.reason || null},
          ${contact.errorMessage || null},
          ${JSON.stringify(contact.fieldsUpdated || [])},
          ${contact.validation ? JSON.stringify(contact.validation) : null}
        )
      `;

      // Update run summary counts
      const statusField = contact.status === 'enriched' ? 'enriched'
        : contact.status === 'skipped' ? 'skipped'
        : 'errors';

      await sql`
        UPDATE runs
        SET summary = jsonb_set(
          jsonb_set(
            summary,
            '{processed}',
            to_jsonb((summary->>'processed')::int + 1)
          ),
          ${'{' + statusField + '}'},
          to_jsonb((summary->>${statusField})::int + 1)
        )
        WHERE id = ${runId}
      `;
    } catch (error) {
      console.error('Failed to add contact:', error.message);
    }
  }

  /**
   * Complete a run
   * @param {string} runId
   * @param {Object} options - { nextCursor }
   */
  async completeRun(runId, options = {}) {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      const result = await sql`
        UPDATE runs
        SET status = 'completed',
            end_time = NOW(),
            next_cursor = ${options.nextCursor || null}
        WHERE id = ${runId}
        RETURNING *
      `;

      if (result.length > 0) {
        const run = result[0];
        return {
          id: run.id,
          status: run.status,
          startTime: run.start_time,
          endTime: run.end_time,
          summary: run.summary,
          nextCursor: run.next_cursor
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to complete run:', error.message);
      return null;
    }
  }

  /**
   * Mark a run as failed
   * @param {string} runId
   * @param {string} error
   */
  async failRun(runId, error) {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      const result = await sql`
        UPDATE runs
        SET status = 'failed',
            end_time = NOW(),
            error_message = ${error}
        WHERE id = ${runId}
        RETURNING *
      `;

      if (result.length > 0) {
        const run = result[0];
        return {
          id: run.id,
          status: run.status,
          startTime: run.start_time,
          endTime: run.end_time,
          summary: run.summary,
          error: run.error_message
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fail run:', error.message);
      return null;
    }
  }

  /**
   * Get a run by ID (including contacts)
   * @param {string} runId
   */
  async getRun(runId) {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      // Get run
      const runResult = await sql`
        SELECT * FROM runs WHERE id = ${runId}
      `;

      if (runResult.length === 0) return null;

      const run = runResult[0];

      // Get contacts for this run
      const contacts = await sql`
        SELECT * FROM run_contacts
        WHERE run_id = ${runId}
        ORDER BY processed_at ASC
      `;

      return {
        id: run.id,
        trigger: run.trigger,
        status: run.status,
        startTime: run.start_time,
        endTime: run.end_time,
        duration: run.end_time
          ? new Date(run.end_time).getTime() - new Date(run.start_time).getTime()
          : null,
        summary: run.summary,
        nextCursor: run.next_cursor,
        error: run.error_message,
        contacts: contacts.map(c => ({
          id: c.contact_id,
          email: c.email,
          status: c.status,
          reason: c.reason,
          errorMessage: c.error_message,
          fieldsUpdated: c.fields_updated,
          validation: c.validation,
          timestamp: c.processed_at
        }))
      };
    } catch (error) {
      console.error('Failed to get run:', error.message);
      return null;
    }
  }

  /**
   * Get recent runs (summaries only, no contact details)
   * @param {number} limit
   */
  async getRecentRuns(limit = 20) {
    const sql = this.getClient();
    if (!sql) return [];

    try {
      const runs = await sql`
        SELECT id, trigger, status, start_time, end_time, summary, error_message
        FROM runs
        ORDER BY start_time DESC
        LIMIT ${limit}
      `;

      return runs.map(run => ({
        id: run.id,
        trigger: run.trigger,
        status: run.status,
        startTime: run.start_time,
        endTime: run.end_time,
        duration: run.end_time
          ? new Date(run.end_time).getTime() - new Date(run.start_time).getTime()
          : null,
        summary: run.summary,
        error: run.error_message
      }));
    } catch (error) {
      console.error('Failed to get recent runs:', error.message);
      return [];
    }
  }

  /**
   * Get the currently running run (if any)
   */
  async getCurrentRun() {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      const result = await sql`
        SELECT id, trigger, status, start_time, summary
        FROM runs
        WHERE status = 'running'
        ORDER BY start_time DESC
        LIMIT 1
      `;

      if (result.length === 0) return null;

      const run = result[0];
      return {
        id: run.id,
        trigger: run.trigger,
        status: run.status,
        startTime: run.start_time,
        summary: run.summary
      };
    } catch (error) {
      console.error('Failed to get current run:', error.message);
      return null;
    }
  }

  /**
   * Cache enrichment stats
   * @param {Object} stats - { totalCount, enrichedCount, unenrichedCount }
   */
  async cacheStats(stats) {
    const sql = this.getClient();
    if (!sql) return;

    try {
      const percentComplete = stats.totalCount > 0
        ? ((stats.enrichedCount / stats.totalCount) * 100).toFixed(1)
        : 0;

      await sql`
        INSERT INTO stats_cache (id, total_count, enriched_count, unenriched_count, percent_complete, list_id, cached_at)
        VALUES (1, ${stats.totalCount}, ${stats.enrichedCount}, ${stats.unenrichedCount}, ${percentComplete}, ${stats.listId || null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          total_count = ${stats.totalCount},
          enriched_count = ${stats.enrichedCount},
          unenriched_count = ${stats.unenrichedCount},
          percent_complete = ${percentComplete},
          list_id = ${stats.listId || null},
          cached_at = NOW()
      `;
    } catch (error) {
      console.error('Failed to cache stats:', error.message);
    }
  }

  /**
   * Get cached stats
   */
  async getCachedStats() {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      const result = await sql`
        SELECT * FROM stats_cache WHERE id = 1
      `;

      if (result.length === 0) return null;

      const stats = result[0];
      return {
        totalCount: stats.total_count,
        enrichedCount: stats.enriched_count,
        unenrichedCount: stats.unenriched_count,
        percentComplete: parseFloat(stats.percent_complete),
        listId: stats.list_id,
        cachedAt: stats.cached_at
      };
    } catch (error) {
      console.error('Failed to get cached stats:', error.message);
      return null;
    }
  }

  /**
   * Get scheduler settings
   */
  async getSchedulerSettings() {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      const result = await sql`
        SELECT * FROM scheduler_settings WHERE id = 1
      `;

      if (result.length === 0) return null;

      const settings = result[0];
      return {
        enabled: settings.enabled,
        intervalMinutes: settings.interval_minutes,
        batchSize: settings.batch_size,
        lastRunAt: settings.last_run_at,
        nextRunAt: settings.next_run_at,
        updatedAt: settings.updated_at
      };
    } catch (error) {
      console.error('Failed to get scheduler settings:', error.message);
      return null;
    }
  }

  /**
   * Update scheduler settings
   * @param {Object} settings - { enabled, intervalMinutes, batchSize }
   */
  async updateSchedulerSettings(settings) {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      // Calculate next run time if enabling
      let nextRunAt = null;
      if (settings.enabled) {
        nextRunAt = new Date(Date.now() + (settings.intervalMinutes * 60 * 1000));
      }

      const result = await sql`
        UPDATE scheduler_settings
        SET
          enabled = ${settings.enabled},
          interval_minutes = ${settings.intervalMinutes},
          batch_size = ${settings.batchSize},
          next_run_at = ${nextRunAt},
          updated_at = NOW()
        WHERE id = 1
        RETURNING *
      `;

      if (result.length === 0) return null;

      const updated = result[0];
      return {
        enabled: updated.enabled,
        intervalMinutes: updated.interval_minutes,
        batchSize: updated.batch_size,
        lastRunAt: updated.last_run_at,
        nextRunAt: updated.next_run_at,
        updatedAt: updated.updated_at
      };
    } catch (error) {
      console.error('Failed to update scheduler settings:', error.message);
      return null;
    }
  }

  /**
   * Check if scheduler should run now
   * @returns {Object|null} Settings if should run, null otherwise
   */
  async shouldRunNow() {
    const sql = this.getClient();
    if (!sql) return null;

    try {
      const result = await sql`
        SELECT * FROM scheduler_settings
        WHERE id = 1
          AND enabled = true
          AND (next_run_at IS NULL OR next_run_at <= NOW())
      `;

      if (result.length === 0) return null;

      const settings = result[0];
      return {
        enabled: settings.enabled,
        intervalMinutes: settings.interval_minutes,
        batchSize: settings.batch_size
      };
    } catch (error) {
      console.error('Failed to check scheduler:', error.message);
      return null;
    }
  }

  /**
   * Update last run time and calculate next run
   */
  async updateLastRun() {
    const sql = this.getClient();
    if (!sql) return;

    try {
      await sql`
        UPDATE scheduler_settings
        SET
          last_run_at = NOW(),
          next_run_at = NOW() + (interval_minutes || ' minutes')::interval
        WHERE id = 1
      `;
    } catch (error) {
      console.error('Failed to update last run:', error.message);
    }
  }
}

module.exports = RunLogStore;
