'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2000;

const SYSTEM_PROMPT = `You are a research analyst covering finance for college students at target schools like Babson and Wharton. Everything you find must answer: why does a finance student care about this right now? Specifically, why does it matter for breaking into finance, preparing for interviews, or understanding what desks are actually doing.`;

const USER_PROMPT = `Search for the most relevant finance news from the past 7 days. Find:
(1) top 3 deals or market events relevant to finance students,
(2) 1 macro market move worth explaining in simple terms,
(3) 1 career or recruiting angle such as PE headhunter cycles, IB SA recruiting timelines, or what MDs are focusing on right now.

Return ONLY a JSON object — no markdown, no preamble — in this exact shape:
{
  "trends": ["string", "string"],
  "topDeals": [{ "title": "string", "summary": "string", "whyItMatters": "string" }],
  "marketMoves": [{ "move": "string", "explanation": "string" }],
  "careerAngle": { "topic": "string", "insight": "string", "actionableAdvice": "string" }
}`;

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

async function runResearch(bus) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages = [{ role: 'user', content: USER_PROMPT }];
  let response;

  while (true) {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = response.content
        .filter((block) => block.type === 'tool_use')
        .map((block) => ({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Web search results for: ${JSON.stringify(block.input)}`,
        }));
      messages.push({ role: 'user', content: toolResults });
      continue;
    }
    break;
  }

  const textBlocks = response.content.filter((b) => b.type === 'text');
  if (textBlocks.length === 0) throw new Error('Research agent: Claude returned no text content');

  const rawText = textBlocks.map((b) => b.text).join('\n');
  const jsonStr = extractJson(rawText);

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Research agent: Failed to parse JSON. Raw: ${rawText.slice(0, 200)}`);
  }

  if (!parsed.topDeals || !parsed.marketMoves || !parsed.careerAngle) {
    throw new Error('Research agent: Missing required fields');
  }

  bus.research.trends = parsed.trends || [];
  bus.research.topDeals = parsed.topDeals || [];
  bus.research.marketMoves = parsed.marketMoves || [];
  bus.research.careerAngle = parsed.careerAngle || {};
}

module.exports = { runResearch };
