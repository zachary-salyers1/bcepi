/**
 * Dashboard Stats Endpoint
 * GET /api/dashboard/stats
 *
 * Returns enrichment progress stats for list 151
 */

const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
require('dotenv').config({ path: envPath, override: true });

const HubSpotClient = require('../../lib/hubspot-client');
const RunLogStore = require('../../lib/run-log-store');

const HUBSPOT_LIST_ID = process.env.HUBSPOT_LIST_ID || '151';
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Verify dashboard password
 */
function verifyAuth(req) {
  const password = req.headers['x-dashboard-password'];
  const expectedPassword = process.env.DASHBOARD_PASSWORD;

  if (!expectedPassword) {
    // No password configured, allow access
    return true;
  }

  return password === expectedPassword;
}

module.exports = async (req, res) => {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth
  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const runStore = new RunLogStore();

    // Check for cached stats
    const cachedStats = await runStore.getCachedStats();
    const cacheAge = cachedStats
      ? Date.now() - new Date(cachedStats.cachedAt).getTime()
      : Infinity;

    let stats;

    // Use cache if available, unless force refresh requested with ?refresh=full
    // Normal ?refresh=true just returns cached data to avoid HubSpot rate limits
    if (cachedStats && cacheAge < STATS_CACHE_TTL && !req.query.refresh) {
      stats = cachedStats;
    } else if (cachedStats && req.query.refresh !== 'full') {
      // Use cache even on refresh to avoid rate limits
      // Full stats update happens after each batch run
      stats = cachedStats;
    } else {
      // Fetch fresh stats from HubSpot (slow for large lists, may hit rate limits)
      console.log('Fetching fresh enrichment stats from HubSpot...');
      try {
        const hubspot = new HubSpotClient();
        const freshStats = await hubspot.getEnrichmentStats(HUBSPOT_LIST_ID);

        stats = {
          ...freshStats,
          listId: HUBSPOT_LIST_ID,
          percentComplete: freshStats.totalCount > 0
            ? ((freshStats.enrichedCount / freshStats.totalCount) * 100).toFixed(1)
            : 0
        };

        // Cache the stats
        await runStore.cacheStats(stats);
      } catch (hubspotError) {
        console.error('HubSpot error:', hubspotError.message);
        // If we have cached stats, use them
        if (cachedStats) {
          stats = { ...cachedStats, stale: true };
        } else {
          // Return placeholder
          stats = {
            totalCount: 7000,
            enrichedCount: 0,
            unenrichedCount: 7000,
            listId: HUBSPOT_LIST_ID,
            percentComplete: 0,
            error: 'Rate limited - stats will update after next batch'
          };
        }
      }
    }

    // Get last run info
    const recentRuns = await runStore.getRecentRuns(1);
    const lastRun = recentRuns[0] || null;

    // Check if a run is currently in progress
    const currentRun = await runStore.getCurrentRun();

    return res.status(200).json({
      success: true,
      stats: {
        totalCount: stats.totalCount,
        enrichedCount: stats.enrichedCount,
        unenrichedCount: stats.unenrichedCount,
        percentComplete: parseFloat(stats.percentComplete),
        listId: stats.listId
      },
      lastRun: lastRun ? {
        id: lastRun.id,
        status: lastRun.status,
        startTime: lastRun.startTime,
        summary: lastRun.summary
      } : null,
      currentRun: currentRun ? {
        id: currentRun.id,
        startTime: currentRun.startTime,
        processed: currentRun.summary.processed
      } : null,
      cachedAt: stats.cachedAt || new Date().toISOString(),
      cacheAge: cacheAge < Infinity ? Math.round(cacheAge / 1000) : null
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
};
