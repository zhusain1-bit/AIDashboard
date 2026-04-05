'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { createBus } = require('./context/bus');
const { runPipeline } = require('./agents/orchestrator');

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[ERROR] ANTHROPIC_API_KEY is not set in your .env file.');
    console.error('        Add ANTHROPIC_API_KEY=sk-ant-... to signaldeskMarketing/.env');
    process.exit(1);
    return;
  }

  const goal = process.argv[2];
  if (!goal || goal.trim().length === 0) {
    console.error('[ERROR] Missing required goal argument.');
    console.error('        Usage: node run.js "focus on PE deal flow this week"');
    process.exit(1);
    return;
  }

  const runId = String(Date.now());
  const weekOf = new Date().toISOString().slice(0, 10);

  const bus = createBus({ runId, weekOf, goal: goal.trim() });

  console.log(`\nSignalDesk Marketing — Run ${runId}`);
  console.log(`Goal: ${goal}`);
  console.log(`Week of: ${weekOf}\n`);

  try {
    const result = await runPipeline(bus);
    console.log(`\nSummary: outputs/summary_${runId}.json`);
    return result;
  } catch (err) {
    console.error('[ERROR] Pipeline failed:', err.message);
    process.exit(1);
  }
}

// Execute immediately (tests will override process.argv before requiring this)
main();
