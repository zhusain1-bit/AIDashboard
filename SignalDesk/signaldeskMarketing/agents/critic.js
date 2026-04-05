'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs/promises');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { getVoicePrompt } = require('../foundation/brand');

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2000;
const PERFORMANCE_PATH = path.join(__dirname, '../memory/performance.json');
const DRAFT_KEYS = ['linkedin', 'newsletter', 'tweet_thread'];

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) return fenced[1];
  if (trimmed.startsWith('{')) return trimmed;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function averageScore(scores) {
  const values = Object.values(scores).filter((v) => typeof v === 'number');
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function allCriteriaPass(scores) {
  return Object.values(scores).every((v) => typeof v === 'number' && v >= 7);
}

async function loadPerformanceHistory() {
  try {
    const raw = await fs.readFile(PERFORMANCE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

function buildHistorySummary(history) {
  if (!history || history.length === 0) return 'No previous run data available.';
  return history.slice(-5)
    .map((r) => `Run ${r.runId} (${r.weekOf}): scores=${JSON.stringify(r.criticScores)}, notes=${r.notes || 'none'}`)
    .join('\n');
}

async function scoreDraft(client, draftKey, draftContent, historySummary) {
  const systemPrompt = `You are a content quality critic for SignalDesk, a finance platform for college students.

${getVoicePrompt()}

HISTORICAL PERFORMANCE CONTEXT:
${historySummary}

Your job is to score a ${draftKey.replace('_', ' ')} draft and rewrite it if quality is insufficient.`;

  const userPrompt = `Score this ${draftKey.replace('_', ' ')} draft on 4 criteria, each from 1-10:
1. brandVoice: Sharp, direct, career-first — not academic or bro-y?
2. specificNotGeneric: References a specific deal, number, or event?
3. studentCareerAngle: Embeds a clear "what this means for your career" message?
4. scrollStopping: Would a finance student actually stop scrolling?

DRAFT:
---
${draftContent}
---

If any criterion scores below 7, you MUST rewrite the draft to bring all criteria to 8+.

Return ONLY JSON — no markdown:
{
  "scores": { "brandVoice": <1-10>, "specificNotGeneric": <1-10>, "studentCareerAngle": <1-10>, "scrollStopping": <1-10> },
  "rewritten": "<full rewritten draft if any score < 7, otherwise null>"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = JSON.parse(extractJson(text));
  return { scores: parsed.scores || {}, finalDraft: parsed.rewritten || draftContent };
}

async function runCritic(bus) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const history = await loadPerformanceHistory();
  const historySummary = buildHistorySummary(history);

  for (const key of DRAFT_KEYS) {
    const draft = bus.drafts[key];
    if (!draft || draft === '[DRAFT_FAILED]') {
      console.error(`[WARN] Critic: skipping ${key} — draft failed or missing`);
      continue;
    }

    const { scores, finalDraft } = await scoreDraft(client, key, draft, historySummary);
    bus.criticScores[key] = averageScore(scores);
    bus.drafts[key] = finalDraft;
    if (allCriteriaPass(scores)) bus.approved.push(key);
  }
}

module.exports = { runCritic };
