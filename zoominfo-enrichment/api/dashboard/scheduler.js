/**
 * Scheduler Settings Endpoint
 * GET /api/dashboard/scheduler - Get current settings
 * POST /api/dashboard/scheduler - Update settings
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

  const runStore = new RunLogStore();

  try {
    if (req.method === 'GET') {
      // Get current scheduler settings
      const settings = await runStore.getSchedulerSettings();

      if (!settings) {
        return res.status(200).json({
          success: true,
          settings: {
            enabled: false,
            intervalMinutes: 120,
            batchSize: 50,
            lastRunAt: null,
            nextRunAt: null
          }
        });
      }

      return res.status(200).json({
        success: true,
        settings
      });

    } else if (req.method === 'POST') {
      // Update scheduler settings
      const { enabled, intervalMinutes, batchSize } = req.body;

      // Validate inputs
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }

      const interval = parseInt(intervalMinutes);
      if (isNaN(interval) || interval < 15 || interval > 1440) {
        return res.status(400).json({ error: 'intervalMinutes must be between 15 and 1440 (24 hours)' });
      }

      const batch = parseInt(batchSize);
      if (isNaN(batch) || batch < 1 || batch > 100) {
        return res.status(400).json({ error: 'batchSize must be between 1 and 100' });
      }

      const updatedSettings = await runStore.updateSchedulerSettings({
        enabled,
        intervalMinutes: interval,
        batchSize: batch
      });

      if (!updatedSettings) {
        return res.status(500).json({ error: 'Failed to update settings' });
      }

      console.log(`Scheduler settings updated: enabled=${enabled}, interval=${interval}min, batch=${batch}`);

      return res.status(200).json({
        success: true,
        settings: updatedSettings
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Scheduler settings error:', error);
    return res.status(500).json({
      error: 'Failed to process scheduler settings',
      message: error.message
    });
  }
};
