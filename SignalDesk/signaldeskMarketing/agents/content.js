'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Anthropic = require('@anthropic-ai/sdk');
const { getVoicePrompt } = require('../foundation/brand');

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2000;

function extractText(response) {
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

function buildResearchContext(research) {
  const deals = (research.topDeals || [])
    .map((d) => `- ${d.title}: ${d.summary} (why it matters: ${d.whyItMatters})`)
    .join('\n');
  const moves = (research.marketMoves || []).map((m) => `- ${m.move}: ${m.explanation}`).join('\n');
  const career = research.careerAngle
    ? `Topic: ${research.careerAngle.topic}. Insight: ${research.careerAngle.insight}. Advice: ${research.careerAngle.actionableAdvice}`
    : 'No career angle available.';
  return `RESEARCH DATA FOR THIS WEEK:\n\nTop Deals:\n${deals}\n\nMarket Move:\n${moves}\n\nCareer Angle:\n${career}`;
}

async function runContent(bus) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const voicePrompt = getVoicePrompt();
  const researchContext = buildResearchContext(bus.research);

  const baseSystem = `You are a finance content writer for SignalDesk, a platform for college students breaking into finance at schools like Babson and Wharton.

${voicePrompt}

${researchContext}

Rules:
- You MUST reference a specific deal, number, or data point from the research data above.
- Write like you are a sharp senior analyst talking to a smart junior — not a professor, not a bro.
- Every piece must embed "here's what it means for your career" in some form.`;

  const linkedinPrompt = `Write a LinkedIn post. Format: hook line (1 sentence, scroll-stopping) + 3 insight bullets + CTA. Max 200 words. Reference a specific deal or data point from this week's research.`;
  const newsletterPrompt = `Write a newsletter intro section using the "Deal of the Week" pillar. Format: sharp lead sentence + 2-3 sentences of deal breakdown + 1 career implication sentence. Max 150 words. Reference a specific deal or data point.`;
  const tweetPrompt = `Write a tweet thread of exactly 5 tweets. Tweet 1: hook. Tweets 2-4: deal/concept breakdown (one insight per tweet). Tweet 5: career angle. Each tweet max 280 chars. Separate tweets with "---". Reference a specific deal or data point.`;

  async function callClaude(userPrompt, label) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: baseSystem,
        messages: [{ role: 'user', content: userPrompt }],
      });
      return extractText(response);
    } catch (err) {
      console.error(`[WARN] Content agent: ${label} draft failed — ${err.message}`);
      return '[DRAFT_FAILED]';
    }
  }

  const [linkedin, newsletter, tweet_thread] = await Promise.all([
    callClaude(linkedinPrompt, 'linkedin'),
    callClaude(newsletterPrompt, 'newsletter'),
    callClaude(tweetPrompt, 'tweet_thread'),
  ]);

  bus.drafts.linkedin = linkedin;
  bus.drafts.newsletter = newsletter;
  bus.drafts.tweet_thread = tweet_thread;
}

module.exports = { runContent };
