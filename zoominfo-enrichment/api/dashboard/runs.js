/**
 * Dashboard Runs Endpoint
 * GET /api/dashboard/runs
 *
 * Returns list of recent enrichment runs
 */

const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
require('dotenv').config({ path: envPath, override: true });

const RunLogStore = require('../../lib/run-log-store');

/**
 * Verify dashboard password
 */
function verifyAuth(req) {
  const password = req.headers['x-dashboard-password'];
  const expectedPassword = process.env.DASHBOARD_PASSWORD;

  if (!expectedPassword) {
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
    const limit = parseInt(req.query.limit) || 20;

    const runs = await runStore.getRecentRuns(limit);

    return res.status(200).json({
      success: true,
      runs,
      count: runs.length
    });

  } catch (error) {
    console.error('Error fetching runs:', error);
    return res.status(500).json({
      error: 'Failed to fetch runs',
      message: error.message
    });
  }
};
