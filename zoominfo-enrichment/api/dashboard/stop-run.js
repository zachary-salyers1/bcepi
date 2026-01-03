/**
 * Stop Run Endpoint
 * POST /api/dashboard/stop-run - Mark a running run as stopped/failed
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
  // Verify auth
  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const runStore = new RunLogStore();

  try {
    const { runId } = req.body;

    if (runId) {
      // Stop a specific run
      const result = await runStore.failRun(runId, 'Manually stopped by user');

      if (!result) {
        return res.status(404).json({ error: 'Run not found or already completed' });
      }

      console.log(`Run ${runId} manually stopped`);
      return res.status(200).json({
        success: true,
        message: 'Run stopped',
        run: result
      });
    } else {
      // Stop any currently running run
      const currentRun = await runStore.getCurrentRun();

      if (!currentRun) {
        return res.status(404).json({ error: 'No running run found' });
      }

      const result = await runStore.failRun(currentRun.id, 'Manually stopped by user');

      console.log(`Current run ${currentRun.id} manually stopped`);
      return res.status(200).json({
        success: true,
        message: 'Run stopped',
        run: result
      });
    }

  } catch (error) {
    console.error('Stop run error:', error);
    return res.status(500).json({
      error: 'Failed to stop run',
      message: error.message
    });
  }
};
