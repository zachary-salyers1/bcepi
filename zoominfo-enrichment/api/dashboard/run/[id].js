/**
 * Dashboard Run Details Endpoint
 * GET /api/dashboard/run/:id
 *
 * Returns full details for a specific run including all contact results
 */

const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
require('dotenv').config({ path: envPath, override: true });

const RunLogStore = require('../../../lib/run-log-store');

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

    // Get run ID from URL path
    const runId = req.query.id;

    if (!runId) {
      return res.status(400).json({ error: 'Run ID required' });
    }

    const run = await runStore.getRun(runId);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    return res.status(200).json({
      success: true,
      run
    });

  } catch (error) {
    console.error('Error fetching run:', error);
    return res.status(500).json({
      error: 'Failed to fetch run',
      message: error.message
    });
  }
};
