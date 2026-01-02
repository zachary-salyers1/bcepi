/**
 * Dashboard Trigger Endpoint
 * POST /api/dashboard/trigger
 *
 * Manually trigger a batch enrichment run
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
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth
  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const runStore = new RunLogStore();

    // Check if a run is already in progress
    const currentRun = await runStore.getCurrentRun();
    if (currentRun) {
      return res.status(409).json({
        error: 'Run already in progress',
        runId: currentRun.id,
        startTime: currentRun.startTime
      });
    }

    // Import and call the cron handler directly
    // We'll pass a mock request with manual trigger header
    const enrichHandler = require('../cron/enrich-contacts');

    // Create a mock request that looks like a manual trigger
    const mockReq = {
      headers: {
        'x-webhook-secret': process.env.WEBHOOK_SECRET,
        'x-trigger-source': 'manual'
      }
    };

    // Create a response collector
    let responseData = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          responseData = { code, data };
        }
      })
    };

    // Run the enrichment (this will block until complete)
    await enrichHandler(mockReq, mockRes);

    if (responseData) {
      return res.status(responseData.code).json({
        success: responseData.code === 200,
        trigger: 'manual',
        ...responseData.data
      });
    }

    return res.status(500).json({ error: 'No response from enrichment handler' });

  } catch (error) {
    console.error('Error triggering run:', error);
    return res.status(500).json({
      error: 'Failed to trigger run',
      message: error.message
    });
  }
};
