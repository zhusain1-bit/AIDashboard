import Anthropic from "@anthropic-ai/sdk";
import { Article, BriefContent, FlashCard } from "@/types/signaldesk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function extractJsonBlock(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  return trimmed;
}

function normalizeBrief(parsed: Partial<BriefContent>, article: Article, sector: string): BriefContent {
  const baseHeadline = article.title.split(":")[0].trim().slice(0, 70);
  const normalizedTalkingPoints = parsed.talking_points?.filter(Boolean).slice(0, 3) ?? [];
  const talkingPoints =
    normalizedTalkingPoints.length === 3
      ? normalizedTalkingPoints
      : ["Financing market shift", "Valuation implications", "Sponsor response"];

  return {
    headline: parsed.headline?.trim() || baseHeadline || `${sector} market update`,
    deck:
      parsed.deck?.trim() ||
      `${article.description || article.title} Focus on the implications for financing conditions, valuation, and investor behavior.`,
    talking_points: talkingPoints,
    interview_angle:
      parsed.interview_angle?.trim() ||
      `Frame this as a ${sector} signal: explain what changed, who benefits, and how it affects capital formation or valuation.`
  };
}

function defaultFlashCards(brief: BriefContent, sector: string): FlashCard[] {
  return [
    {
      question: `How would you explain this ${sector} development to an MD?`,
      answer:
        "I would start with the catalyst in the market, then connect it to financing conditions, valuation, and buyer behavior. The key is showing how this changes underwriting or execution decisions rather than just summarizing the news."
    },
    {
      question: "What is the main investment implication here?",
      answer:
        "The core implication is how capital providers and buyers will price risk after this development. A strong answer ties the headline to spreads, leverage, multiples, liquidity, or expected returns depending on the strategy."
    }
  ];
}

async function requestClaudeJson(system: string, user: string) {
  if (!anthropic) {
    return null;
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system,
    messages: [
      {
        role: "user",
        content: user
      }
    ]
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return extractJsonBlock(text);
}

export async function generateBrief(article: Article, sector: string): Promise<BriefContent> {
  const system =
    "You are a senior finance analyst briefing a junior analyst before interviews. Be direct, use precise finance terminology, and always frame insights in terms of what an MD or interviewer at a top PE or IB firm would care about. Return only valid JSON.";

  const user = `Generate an interview-ready brief for this article.
Title: ${article.title}
Description: ${article.description}
Sector: ${sector}

Return a JSON object with exactly these fields:
- headline: string (punchy rewrite of the headline, max 12 words)
- deck: string (2-sentence summary, max 40 words, written for a finance analyst)
- talking_points: string[] (exactly 3 items, each max 4 words, noun-phrase format e.g. 'Spread compression dynamics')
- interview_angle: string (exactly 1 sentence - what to say if an MD asks you about this topic in an interview)`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await requestClaudeJson(system, user);
      if (!text) {
        break;
      }

      const parsed = JSON.parse(text) as Partial<BriefContent>;
      return normalizeBrief(parsed, article, sector);
    } catch {
      continue;
    }
  }

  return normalizeBrief({}, article, sector);
}

export async function generateFlashCards(brief: BriefContent, sector: string): Promise<FlashCard[]> {
  const system =
    "You are a senior finance analyst briefing a junior analyst before interviews. Be direct, use precise finance terminology, and always frame insights in terms of what an MD or interviewer at a top PE or IB firm would care about. Return only valid JSON.";

  const user = `Based on this finance brief, generate exactly 2 interview flash cards.
Headline: ${brief.headline}
Deck: ${brief.deck}
Sector: ${sector}

Return a JSON array of exactly 2 objects, each with:
- question: string (what an MD would ask in an interview, max 20 words)
- answer: string (technically precise, 2-3 sentences, the correct answer a top candidate would give)`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await requestClaudeJson(system, user);
      if (!text) {
        break;
      }

      const parsed = JSON.parse(text) as FlashCard[];
      const normalized = parsed
        .filter((card) => card?.question && card?.answer)
        .slice(0, 2);

      if (normalized.length === 2) {
        return normalized;
      }
    } catch {
      continue;
    }
  }

  return defaultFlashCards(brief, sector);
}
