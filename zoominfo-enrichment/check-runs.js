const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local'), override: true });
const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon(process.env.DATABASE_URL);

  // Find stuck/running runs
  const runningRuns = await sql`
    SELECT id, status, trigger, start_time, summary
    FROM runs
    WHERE status = 'running'
    ORDER BY start_time DESC
  `;

  console.log('Running runs:', runningRuns.length);
  for (const run of runningRuns) {
    console.log('  -', run.id, '| started:', run.start_time, '| summary:', JSON.stringify(run.summary));
  }

  // Get the most recent run regardless of status
  const recentRun = await sql`
    SELECT id, status, trigger, start_time, end_time, error_message, summary
    FROM runs
    ORDER BY start_time DESC
    LIMIT 1
  `;

  if (recentRun.length > 0) {
    console.log('\nMost recent run:');
    console.log('  ID:', recentRun[0].id);
    console.log('  Status:', recentRun[0].status);
    console.log('  Error:', recentRun[0].error_message || 'none');
    console.log('  Summary:', JSON.stringify(recentRun[0].summary));
  }

  // Mark stuck runs as failed
  if (runningRuns.length > 0) {
    console.log('\nMarking stuck runs as failed...');
    await sql`UPDATE runs SET status = 'failed', end_time = NOW(), error_message = 'Marked as failed - stuck run' WHERE status = 'running'`;
    console.log('Done!');
  }
}

check().catch(console.error);
