import Anthropic from "@anthropic-ai/sdk";
import { ParsedQuery } from "@/types/signaldesk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const cache = new Map<string, ParsedQuery>();

function fallbackQuery(rawQuery: string): ParsedQuery {
  return {
    role: null,
    company: null,
    sector: "Investment Banking",
    newsApiQuery: rawQuery,
    contextLabel: rawQuery,
    interviewContext: `An interviewer at a top finance firm will ask about ${rawQuery} and relevant market developments.`
  };
}

export async function parseQuery(rawQuery: string): Promise<ParsedQuery> {
  const key = rawQuery.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  if (!anthropic) {
    const fallback = fallbackQuery(rawQuery);
    cache.set(key, fallback);
    return fallback;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:
        "You are a finance industry expert. Your job is to parse a student's job search query and extract structured information to find relevant financial news. Always return valid JSON only, no other text.",
      messages: [
        {
          role: "user",
          content: `Parse this finance job search query and return a JSON object.

Query: '${rawQuery}'

Return exactly:
{
  "role": extracted role/desk/division or null,
  "company": extracted firm name or null,
  "sector": the broader finance sector this falls under,
  "newsApiQuery": a NewsAPI search query string (max 5 keywords joined with OR/AND) that will find the most relevant financial news. Be specific. For 'Infrastructure IB at Lazard' use 'Lazard OR infrastructure financing OR infrastructure M&A OR project finance'. For 'Debt Capital Markets' use 'debt capital markets OR DCM OR bond issuance OR credit markets OR high yield',
  "contextLabel": short display label combining role and company if both present,
  "interviewContext": one sentence describing the type of person interviewing the student and what topics they will focus on
}`
        }
      ]
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonStr =
      jsonStart !== -1 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;

    const parsed = JSON.parse(jsonStr) as ParsedQuery;
    cache.set(key, parsed);
    return parsed;
  } catch {
    const fallback = fallbackQuery(rawQuery);
    cache.set(key, fallback);
    return fallback;
  }
}
