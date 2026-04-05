'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs/promises');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2000;
const PERFORMANCE_PATH = path.join(__dirname, '../memory/performance.json');
const INSIGHTS_PATH = path.join(__dirname, '../memory/insights.md');
const INSIGHTS_THRESHOLD = 3;

async function loadHistory() {
  try {
    const raw = await fs.readFile(PERFORMANCE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

function buildRecord(bus) {
  const topResearchAngles = [
    ...(bus.research.topDeals || []).map((d) => d.title),
    ...(bus.research.marketMoves || []).map((m) => m.move),
    bus.research.careerAngle?.topic,
  ].filter(Boolean);

  const scores = bus.criticScores || {};
  const highScorers = Object.entries(scores).filter(([, v]) => v >= 8).map(([k]) => k);
  const lowScorers = Object.entries(scores).filter(([, v]) => v < 7).map(([k]) => k);
  const approved = bus.approved || [];

  const notes = [
    highScorers.length > 0 ? `High performers: ${highScorers.join(', ')}` : null,
    lowScorers.length > 0 ? `Needed rewrite: ${lowScorers.join(', ')}` : null,
    approved.length < 3 ? `Not all pieces approved: only ${approved.join(', ')}` : 'All pieces approved',
  ].filter(Boolean).join('. ');

  return {
    runId: bus.runId,
    weekOf: bus.weekOf,
    goal: bus.goal,
    topResearchAngles,
    criticScores: bus.criticScores || {},
    notes,
  };
}

async function synthesizeInsights(client, history) {
  const historyText = history
    .map((r, i) => `Run ${i + 1} (${r.weekOf}): goal="${r.goal}", scores=${JSON.stringify(r.criticScores)}, angles=${r.topResearchAngles?.join(', ') || 'none'}, notes="${r.notes}"`)
    .join('\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: 'You are a marketing analyst synthesizing patterns from weekly content runs for SignalDesk, a finance platform for college students. Be concise and direct.',
    messages: [{
      role: 'user',
      content: `Analyze these ${history.length} marketing run records and identify patterns. Focus on:
1. Which content pillars (linkedin, newsletter, tweet_thread) consistently score highest
2. What types of research angles keep appearing
3. What the critic keeps rewriting (recurring weak spots)
4. What has worked best overall

RUN HISTORY:
${historyText}

Return a well-formatted markdown document titled "# SignalDesk Marketing Insights" with clear sections for each pattern area.`,
    }],
  });

  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

async function runMemory(bus) {
  const history = await loadHistory();
  const record = buildRecord(bus);
  const updatedHistory = [...history, record];

  await fs.writeFile(PERFORMANCE_PATH, JSON.stringify(updatedHistory, null, 2), 'utf8');

  if (updatedHistory.length >= INSIGHTS_THRESHOLD) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const insightsMarkdown = await synthesizeInsights(client, updatedHistory);
    await fs.writeFile(INSIGHTS_PATH, insightsMarkdown, 'utf8');
  }
}

module.exports = { runMemory };
