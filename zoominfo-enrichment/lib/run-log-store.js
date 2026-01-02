/**
 * Run Log Store - Vercel KV storage for enrichment run history
 *
 * Keys:
 * - runs:list -> Array of last 100 run IDs (newest first)
 * - run:{id} -> Full run details object
 * - stats:cache -> Cached enrichment stats with TTL
 */

let kv;
try {
  kv = require('@vercel/kv');
} catch (e) {
  kv = null;
}

// In-memory fallback for local development
const memoryStore = {
  data: {},
  get: async (key) => memoryStore.data[key] || null,
  set: async (key, value) => { memoryStore.data[key] = value; },
  del: async (key) => { delete memoryStore.data[key]; }
};

class RunLogStore {
  constructor() {
    this.store = kv || memoryStore;
    this.maxRuns = 100;
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
    const runId = this.generateRunId();
    const run = {
      id: runId,
      trigger,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      summary: {
        processed: 0,
        enriched: 0,
        skipped: 0,
        errors: 0
      },
      contacts: [],
      cursor: null,
      nextCursor: null,
      error: null
    };

    await this.store.set(`run:${runId}`, run);

    // Add to runs list
    let runsList = await this.store.get('runs:list') || [];
    runsList.unshift(runId);

    // Keep only last N runs
    if (runsList.length > this.maxRuns) {
      const toDelete = runsList.splice(this.maxRuns);
      for (const oldRunId of toDelete) {
        await this.store.del(`run:${oldRunId}`);
      }
    }

    await this.store.set('runs:list', runsList);

    return { runId, run };
  }

  /**
   * Add a contact result to a run
   * @param {string} runId
   * @param {Object} contact - { id, email, status, reason, fieldsUpdated, validation }
   */
  async addContact(runId, contact) {
    const run = await this.store.get(`run:${runId}`);
    if (!run) return;

    run.contacts.push({
      id: contact.id,
      email: contact.email || 'unknown',
      status: contact.status, // 'enriched', 'skipped', 'error'
      reason: contact.reason || null,
      fieldsUpdated: contact.fieldsUpdated || [],
      validation: contact.validation || null,
      timestamp: new Date().toISOString()
    });

    // Update summary counts
    run.summary.processed++;
    if (contact.status === 'enriched') run.summary.enriched++;
    else if (contact.status === 'skipped') run.summary.skipped++;
    else if (contact.status === 'error') run.summary.errors++;

    await this.store.set(`run:${runId}`, run);
  }

  /**
   * Complete a run
   * @param {string} runId
   * @param {Object} options - { nextCursor }
   */
  async completeRun(runId, options = {}) {
    const run = await this.store.get(`run:${runId}`);
    if (!run) return;

    run.status = 'completed';
    run.endTime = new Date().toISOString();
    run.duration = Date.now() - new Date(run.startTime).getTime();
    run.nextCursor = options.nextCursor || null;

    await this.store.set(`run:${runId}`, run);
    return run;
  }

  /**
   * Mark a run as failed
   * @param {string} runId
   * @param {string} error
   */
  async failRun(runId, error) {
    const run = await this.store.get(`run:${runId}`);
    if (!run) return;

    run.status = 'failed';
    run.endTime = new Date().toISOString();
    run.duration = Date.now() - new Date(run.startTime).getTime();
    run.error = error;

    await this.store.set(`run:${runId}`, run);
    return run;
  }

  /**
   * Get a run by ID
   * @param {string} runId
   */
  async getRun(runId) {
    return await this.store.get(`run:${runId}`);
  }

  /**
   * Get recent runs (summaries only, no contact details)
   * @param {number} limit
   */
  async getRecentRuns(limit = 20) {
    const runsList = await this.store.get('runs:list') || [];
    const runs = [];

    for (const runId of runsList.slice(0, limit)) {
      const run = await this.store.get(`run:${runId}`);
      if (run) {
        // Return summary only, not full contact details
        runs.push({
          id: run.id,
          trigger: run.trigger,
          status: run.status,
          startTime: run.startTime,
          endTime: run.endTime,
          duration: run.duration,
          summary: run.summary,
          error: run.error
        });
      }
    }

    return runs;
  }

  /**
   * Get the currently running run (if any)
   */
  async getCurrentRun() {
    const runsList = await this.store.get('runs:list') || [];
    if (runsList.length === 0) return null;

    const latestRun = await this.store.get(`run:${runsList[0]}`);
    if (latestRun && latestRun.status === 'running') {
      return latestRun;
    }
    return null;
  }

  /**
   * Cache enrichment stats
   * @param {Object} stats - { unenrichedCount, totalCount }
   */
  async cacheStats(stats) {
    await this.store.set('stats:cache', {
      ...stats,
      cachedAt: new Date().toISOString()
    });
  }

  /**
   * Get cached stats
   */
  async getCachedStats() {
    return await this.store.get('stats:cache');
  }
}

module.exports = RunLogStore;
