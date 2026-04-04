'use strict';

const path = require('path');
const fs = require('fs/promises');
const { runResearch } = require('./research');
const { runContent } = require('./content');
const { runCritic } = require('./critic');
const { runPublisher } = require('./publisher');
const { runMemory } = require('./memory');

const OUTPUTS_DIR = path.join(__dirname, '../outputs');

async function withRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

async function runPipeline(bus) {
  let stage = 'init';
  try {
    stage = 'research';
    process.stdout.write('[1/5] Research...      ');
    await withRetry(() => runResearch(bus), 3);
    await bus.flush();
    const dealCount = Array.isArray(bus.research.topDeals) ? bus.research.topDeals.length : 0;
    const moveCount = Array.isArray(bus.research.marketMoves) ? bus.research.marketMoves.length : 0;
    console.log(`✓ ${dealCount} deals, ${moveCount} macro move, 1 career angle found`);

    stage = 'content';
    process.stdout.write('[2/5] Content...       ');
    await withRetry(() => runContent(bus), 3);
    await bus.flush();
    const draftCount = Object.values(bus.drafts).filter((d) => d && d !== '[DRAFT_FAILED]').length;
    console.log(`✓ ${draftCount} drafts generated`);

    stage = 'critic';
    process.stdout.write('[3/5] Critic...        ');
    await withRetry(() => runCritic(bus), 3);
    await bus.flush();
    console.log(`✓ linkedin=${bus.criticScores.linkedin}, newsletter=${bus.criticScores.newsletter}, tweets=${bus.criticScores.tweet_thread}`);

    stage = 'publisher';
    process.stdout.write('[4/5] Publisher...     ');
    await withRetry(() => runPublisher(bus), 3);
    await bus.flush();
    console.log(`✓ outputs/linkedin_${bus.runId}.txt`);

  } catch (err) {
    console.error(`\n[ERROR] Stage "${stage}" failed: ${err.message}`);
    await writeFailedSummary(bus, stage, err);
    throw err;
  } finally {
    process.stdout.write('[5/5] Memory...        ');
    try {
      await runMemory(bus);
      let runCount = '?';
      try {
        const raw = require('fs').readFileSync(path.join(__dirname, '../memory/performance.json'), 'utf8');
        runCount = JSON.parse(raw).length;
      } catch (_) {}
      console.log(`✓ run logged (${runCount} total runs)`);
    } catch (memErr) {
      console.error(`[WARN] Memory agent failed: ${memErr.message}`);
    }
  }
}

async function writeFailedSummary(bus, failedStage, err) {
  try {
    await fs.mkdir(OUTPUTS_DIR, { recursive: true });
    const summary = {
      runId: bus.runId, weekOf: bus.weekOf, goal: bus.goal,
      status: 'failed', failedStage, error: err.message,
      partialResearch: bus.research, partialDrafts: bus.drafts,
    };
    await fs.writeFile(path.join(OUTPUTS_DIR, `summary_${bus.runId}.json`), JSON.stringify(summary, null, 2), 'utf8');
  } catch (writeErr) {
    console.error(`[ERROR] Could not write failed summary: ${writeErr.message}`);
  }
}

module.exports = { withRetry, runPipeline };
