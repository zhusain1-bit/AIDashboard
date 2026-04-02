# SignalDesk Query-First Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the existing sector-based SignalDesk app to accept freeform user queries (e.g. "Apollo Credit", "Infrastructure IB at Lazard") by adding a Claude query-parsing layer, new API routes, and replacing sector pills with a SearchBar UI.

**Architecture:** Keep the existing sector-based path (`?sector=`) fully intact. Add a parallel query-based path (`?query=`) built on top of a new `lib/queryParser.ts` → `lib/newsapi.fetchArticles` → `lib/claude.generateBriefForQuery` pipeline. `FeedView` is rewritten to be search-driven with `SearchBar` + `QueryChip` history pills.

**Tech Stack:** Next.js 15, TypeScript, Prisma/SQLite, Anthropic SDK (`claude-sonnet-4-20250514`), Tailwind CSS, date-fns, NewsAPI

**Working directory:** `C:\Users\zhusain1\SignalDesk`

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Modify | `types/signaldesk.ts` |
| Create | `lib/mockData.ts` |
| Create | `lib/queryParser.ts` |
| Modify | `lib/newsapi.ts` |
| Modify | `lib/claude.ts` |
| Modify | `lib/briefs.ts` |
| Create | `app/api/parse-query/route.ts` |
| Create | `app/api/user/search-history/route.ts` |
| Modify | `app/api/briefs/route.ts` |
| Modify | `app/api/user/route.ts` |
| Create | `components/SearchBar.tsx` |
| Create | `components/QueryChip.tsx` |
| Modify | `components/BriefCard.tsx` |
| Modify | `components/FeedView.tsx` |
| Modify | `app/feed/page.tsx` |

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Search model and new Brief fields to prisma/schema.prisma**

Replace the existing `User` model and `Brief` model blocks with these (leave all other models untouched):

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  isPro         Boolean   @default(false)
  sectors       String    @default("Private Credit,IB M&A")
  briefsToday   Int       @default(0)
  lastBriefDate String?
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
  searches      Search[]
}

model Brief {
  id             String    @id @default(cuid())
  articleUrl     String    @unique
  articleTitle   String
  sector         String
  headline       String
  deck           String
  talkingPoints  String
  interviewAngle String
  flashCards     String
  publishedAt    DateTime
  createdAt      DateTime  @default(now())
  query          String?
  parsedTerms    String?
  source         String?
}

model Search {
  id        String   @id @default(cuid())
  userId    String
  query     String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 2: Apply schema changes**

```bash
cd C:\Users\zhusain1\SignalDesk
npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Search model and query/parsedTerms/source fields to Brief"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `types/signaldesk.ts`

- [ ] **Step 1: Add ParsedQuery interface and update BriefApiItem**

Open `types/signaldesk.ts`. Add `ParsedQuery` after the existing `SectorDef` interface, and add three optional fields to `BriefApiItem`:

```typescript
export interface ParsedQuery {
  role: string | null
  company: string | null
  sector: string | null
  newsApiQuery: string
  contextLabel: string
  interviewContext: string
}
```

In `BriefApiItem`, add these three optional fields after `createdAt`:

```typescript
  query?: string
  contextLabel?: string
  source?: string
```

Full updated `BriefApiItem`:

```typescript
export interface BriefApiItem {
  id: string
  sectorId?: string
  articleUrl: string
  articleTitle: string
  sector: string
  headline: string
  deck: string
  talkingPoints: string[]
  interviewAngle: string
  flashCards: FlashCard[]
  publishedAt: string
  createdAt: string
  query?: string
  contextLabel?: string
  source?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add types/signaldesk.ts
git commit -m "feat: add ParsedQuery interface and optional query/contextLabel/source to BriefApiItem"
```

---

## Task 3: Create lib/mockData.ts

**Files:**
- Create: `lib/mockData.ts`

- [ ] **Step 1: Create the file with query-matched mock articles**

```typescript
import { Article, ParsedQuery } from "@/types/signaldesk";

const QUERY_MOCKS: Record<string, Article[]> = {
  infrastructure: [
    {
      title: "Infrastructure debt financing rebounds as rates plateau",
      description:
        "Project finance lenders are returning to the market as rate uncertainty eases, with greenfield renewable and transport deals attracting new capital.",
      url: "https://signaldesk.mock/infrastructure/debt-financing-rebound",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-30T14:00:00.000Z"
    },
    {
      title: "Lazard wins mandate on $3bn toll road refinancing in Southeast",
      description:
        "The boutique adviser is leading a complex cross-border refinancing for a major transport infrastructure asset, with institutional debt replacing construction-phase capital.",
      url: "https://signaldesk.mock/infrastructure/lazard-toll-road",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-28T09:30:00.000Z"
    },
    {
      title: "Renewables project finance volumes hit record as energy transition accelerates",
      description:
        "Infrastructure IB desks report record mandates in solar and wind financing as governments accelerate decarbonization commitments.",
      url: "https://signaldesk.mock/infrastructure/renewables-pf-record",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-25T11:00:00.000Z"
    }
  ],
  dcm: [
    {
      title: "Investment-grade issuance surges as CFOs lock in rates ahead of macro uncertainty",
      description:
        "DCM desks across bulge-bracket banks report elevated IG pipeline as treasurers front-run potential rate volatility with multi-year paper.",
      url: "https://signaldesk.mock/dcm/ig-issuance-surge",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-30T10:00:00.000Z"
    },
    {
      title: "High yield spreads tighten on improved credit fundamentals and strong demand",
      description:
        "HY bond markets see sustained compression as default rates remain low and institutional investors extend duration to capture yield.",
      url: "https://signaldesk.mock/dcm/hy-spread-tightening",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-27T13:20:00.000Z"
    },
    {
      title: "Leveraged loan market reopens for sponsor-backed issuers after brief pause",
      description:
        "Institutional loan demand returns as CLO formation accelerates, giving private equity sponsors access to flexible acquisition financing.",
      url: "https://signaldesk.mock/dcm/leveraged-loan-reopen",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-24T15:45:00.000Z"
    }
  ],
  boutique: [
    {
      title: "Evercore and Lazard compete for marquee sell-side mandate in tech sector",
      description:
        "Independent advisers are winning more large-cap mandates as corporates prioritize conflict-free advice and senior banker attention.",
      url: "https://signaldesk.mock/boutique/evercore-lazard-tech",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-29T16:00:00.000Z"
    },
    {
      title: "Houlihan Lokey expands restructuring practice amid rising distressed volume",
      description:
        "The specialist boutique is adding senior bankers to meet growing demand from overleveraged sponsors and stressed credit issuers.",
      url: "https://signaldesk.mock/boutique/houlihan-restructuring-expansion",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-26T10:30:00.000Z"
    },
    {
      title: "Centerview and Moelis win advisory roles on $8bn healthcare consolidation",
      description:
        "Boutique advisers continue to take share on complex, cross-border healthcare M&A where relationships and sector expertise matter most.",
      url: "https://signaldesk.mock/boutique/centerview-moelis-healthcare",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-23T09:15:00.000Z"
    }
  ],
  "private-credit": [
    {
      title: "Direct lenders lean into NAV financing as sponsor exits slow",
      description:
        "Private credit managers are expanding NAV loan activity as sponsors seek liquidity without forced exits in a slower deal market.",
      url: "https://signaldesk.mock/private-credit/nav-financing-sponsors",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-30T13:00:00.000Z"
    },
    {
      title: "BDCs compete harder on pricing for upper middle market software loans",
      description:
        "Business development companies are tightening spreads on sponsor-backed software deals as competition for quality assets rises.",
      url: "https://signaldesk.mock/private-credit/bdc-software-loans",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-28T11:15:00.000Z"
    },
    {
      title: "Apollo credit arm expands direct lending to European mid-market",
      description:
        "Apollo Global Management's credit platform is deploying capital into European sponsor-backed deals as US markets see spread compression.",
      url: "https://signaldesk.mock/private-credit/apollo-european-expansion",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-25T08:45:00.000Z"
    }
  ],
  "ib-ma": [
    {
      title: "Strategics reopen large-cap M&A dialogue after steadier financing markets",
      description:
        "Corporate buyers are revisiting large-cap acquisition processes as syndicated financing markets improve and boards regain confidence.",
      url: "https://signaldesk.mock/ib-ma/large-cap-dialogue",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-29T15:40:00.000Z"
    },
    {
      title: "Sponsor-backed industrials platform explores bolt-on acquisition wave",
      description:
        "Advisers expect add-on M&A to outpace transformative deals as private equity firms prioritize multiple arbitrage and synergies.",
      url: "https://signaldesk.mock/ib-ma/industrials-bolt-on-wave",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-27T09:20:00.000Z"
    },
    {
      title: "Cross-border M&A rebounds led by US acquirers targeting European assets",
      description:
        "Dollar strength and compressed European valuations are driving transatlantic deal flow, with IB advisers busy on buy-side mandates.",
      url: "https://signaldesk.mock/ib-ma/cross-border-rebound",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-24T14:00:00.000Z"
    }
  ],
  restructuring: [
    {
      title: "Distressed retailers explore out-of-court exchanges ahead of maturity wall",
      description:
        "Advisers are pushing liability management transactions as issuers try to extend runway before near-term debt maturities hit.",
      url: "https://signaldesk.mock/restructuring/retail-liability-management",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-29T17:05:00.000Z"
    },
    {
      title: "Chapter 11 filings rise among overlevered healthcare services groups",
      description:
        "Persistently high labor costs and weak reimbursement trends are pressuring capital structures across healthcare services.",
      url: "https://signaldesk.mock/restructuring/healthcare-services-ch11",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-25T12:45:00.000Z"
    },
    {
      title: "Restructuring banks add headcount as distressed pipeline builds",
      description:
        "Bulge-bracket and specialist advisers are recruiting lateral hires in restructuring as new mandates outpace existing team capacity.",
      url: "https://signaldesk.mock/restructuring/headcount-expansion",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-22T10:00:00.000Z"
    }
  ],
  "sales-trading": [
    {
      title: "Rates desks brace for heavier volatility around shifting inflation prints",
      description:
        "Macro desks expect elevated client hedging flow as inflation uncertainty keeps front-end rates sensitive to data surprises.",
      url: "https://signaldesk.mock/sales-trading/rates-volatility-inflation",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-30T10:55:00.000Z"
    },
    {
      title: "Credit traders see secondary liquidity improve in investment-grade blocks",
      description:
        "Stronger dealer balance sheet deployment is supporting tighter bid-ask spreads in liquid corporate credit products.",
      url: "https://signaldesk.mock/sales-trading/ig-secondary-liquidity",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-27T16:25:00.000Z"
    },
    {
      title: "Equities desks report record options volumes as retail participation surges",
      description:
        "Derivatives activity is at multi-year highs as retail flow and institutional hedging demand converge on liquid equity index products.",
      url: "https://signaldesk.mock/sales-trading/options-volumes-record",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-24T13:10:00.000Z"
    }
  ],
  "growth-equity": [
    {
      title: "Late-stage software investors focus on efficient growth over pure ARR expansion",
      description:
        "Growth equity investors are rewarding disciplined burn profiles and net revenue retention rather than topline growth alone.",
      url: "https://signaldesk.mock/growth-equity/efficient-growth-software",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-30T08:30:00.000Z"
    },
    {
      title: "Series D funding rebounds for infrastructure startups with AI exposure",
      description:
        "Capital is flowing back to later-stage infrastructure companies where AI demand supports stronger pricing and clearer monetization.",
      url: "https://signaldesk.mock/growth-equity/series-d-ai-infrastructure",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-26T14:10:00.000Z"
    },
    {
      title: "Growth equity secondaries market deepens as LPs seek liquidity",
      description:
        "Secondary transaction volume in growth-stage funds hits record as institutional LPs rebalance private allocations and seek earlier liquidity.",
      url: "https://signaldesk.mock/growth-equity/secondaries-deepening",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-23T11:30:00.000Z"
    }
  ],
  "real-estate": [
    {
      title: "CRE lenders reprice office risk while logistics cap rates stay resilient",
      description:
        "Commercial real estate credit markets remain bifurcated, with office still pressured and logistics assets holding firmer values.",
      url: "https://signaldesk.mock/real-estate/cre-office-logistics",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-30T09:40:00.000Z"
    },
    {
      title: "REIT investors refocus on balance sheet flexibility ahead of refinancing cycle",
      description:
        "Public real estate investors are rewarding issuers that can defend leverage and extend maturities into a slower transaction backdrop.",
      url: "https://signaldesk.mock/real-estate/reit-refinancing-cycle",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-24T11:05:00.000Z"
    },
    {
      title: "Blackstone Real Estate expands data center debt platform",
      description:
        "Blackstone's real estate credit arm is deploying capital into data center construction financing as AI infrastructure demand drives new development.",
      url: "https://signaldesk.mock/real-estate/blackstone-data-center",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-21T14:00:00.000Z"
    }
  ],
  "hedge-funds": [
    {
      title: "Macro funds rotate into rate-sensitive trades as policy path diverges",
      description:
        "Discretionary macro managers are repositioning around cross-market rate divergence and shifting central bank expectations.",
      url: "https://signaldesk.mock/hedge-funds/macro-funds-rate-divergence",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-29T18:20:00.000Z"
    },
    {
      title: "Long-short managers crowd into quality compounders amid earnings dispersion",
      description:
        "Hedge funds are emphasizing single-name selection as sector dispersion widens and factor correlations remain unstable.",
      url: "https://signaldesk.mock/hedge-funds/long-short-quality-compounders",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-26T13:35:00.000Z"
    },
    {
      title: "Quant funds gain edge as alternative data signals diverge from consensus",
      description:
        "Systematic managers report improved alpha generation as satellite data and transaction signals diverge from sell-side consensus estimates.",
      url: "https://signaldesk.mock/hedge-funds/quant-alternative-data",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-23T10:20:00.000Z"
    }
  ]
};

const SECTOR_KEYWORDS: Array<[string[], string]> = [
  [["infrastructure", "project finance", "pf", "infra", "renewables", "toll road"], "infrastructure"],
  [["dcm", "debt capital", "bond issuance", "high yield", "leveraged loan", "investment grade", "ig spread", "hy spread"], "dcm"],
  [["private credit", "direct lending", "bdc", "nav loan", "apollo", "ares", "blue owl", "owl rock"], "private-credit"],
  [["restructuring", "distressed", "chapter 11", "liability management", "lme", "houlihan lokey", "lazar restructuring"], "restructuring"],
  [["sales", "trading", "equities desk", "rates desk", "credit desk", "options", "derivatives"], "sales-trading"],
  [["growth equity", "venture", "series d", "series c", "late-stage", "arr", "saas growth"], "growth-equity"],
  [["real estate", "cre", "reit", "commercial real estate", "blackstone real estate", "brookfield real estate"], "real-estate"],
  [["hedge fund", "macro fund", "long-short", "quant", "systematic", "discretionary macro"], "hedge-funds"],
  [["boutique", "evercore", "lazard", "moelis", "centerview", "pjt", "guggenheim", "independent sponsor"], "boutique"],
  [["m&a", "mergers", "acquisitions", "advisory", "deal advisory", "sell-side", "buy-side"], "ib-ma"]
];

export function getMockArticles(parsedQuery: ParsedQuery): Article[] {
  const text = [
    parsedQuery.sector ?? "",
    parsedQuery.role ?? "",
    parsedQuery.company ?? "",
    parsedQuery.newsApiQuery,
    parsedQuery.contextLabel
  ]
    .join(" ")
    .toLowerCase();

  for (const [keywords, key] of SECTOR_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) {
      return QUERY_MOCKS[key] ?? QUERY_MOCKS["ib-ma"];
    }
  }

  return QUERY_MOCKS["ib-ma"];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mockData.ts
git commit -m "feat: add lib/mockData.ts with query-matched mock articles for 10 categories"
```

---

## Task 4: Create lib/queryParser.ts

**Files:**
- Create: `lib/queryParser.ts`

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/queryParser.ts
git commit -m "feat: add lib/queryParser.ts - Claude-based freeform query parsing with session cache"
```

---

## Task 5: Update lib/newsapi.ts

**Files:**
- Modify: `lib/newsapi.ts`

- [ ] **Step 1: Add fetchArticles function and imports**

At the top of `lib/newsapi.ts`, add `ParsedQuery` to the imports from `@/types/signaldesk` and add the `getMockArticles` import. The existing import line is:

```typescript
import { Article } from "@/types/signaldesk";
```

Replace it with:

```typescript
import { Article, ParsedQuery } from "@/types/signaldesk";
import { getMockArticles } from "@/lib/mockData";
```

- [ ] **Step 2: Add fetchArticles function at the end of the file (after the existing fetchArticlesForSector export)**

```typescript
export async function fetchArticles(parsedQuery: ParsedQuery): Promise<Article[]> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    return getMockArticles(parsedQuery);
  }

  try {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", parsedQuery.newsApiQuery);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "8");

    const response = await fetch(url.toString(), {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return getMockArticles(parsedQuery);
    }

    const data = (await response.json()) as {
      articles?: Array<{
        title?: string;
        description?: string;
        url?: string;
        publishedAt?: string;
        source?: { name?: string };
      }>;
    };

    const articles =
      data.articles
        ?.filter((a) => a.title && a.url)
        .map((a) => ({
          title: a.title ?? "Untitled",
          description: a.description ?? "No summary available.",
          url: a.url ?? "",
          sourceName: a.source?.name ?? "NewsAPI",
          publishedAt: a.publishedAt ?? new Date().toISOString()
        }))
        .slice(0, 8) ?? [];

    return articles.length > 0 ? dedupeArticles(articles) : getMockArticles(parsedQuery);
  } catch {
    return getMockArticles(parsedQuery);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/newsapi.ts
git commit -m "feat: add fetchArticles(parsedQuery) to newsapi.ts with mock fallback"
```

---

## Task 6: Update lib/claude.ts

**Files:**
- Modify: `lib/claude.ts`

- [ ] **Step 1: Add ParsedQuery to imports**

The existing import line is:

```typescript
import { Article, BriefContent, FlashCard } from "@/types/signaldesk";
```

Replace with:

```typescript
import { Article, BriefContent, FlashCard, ParsedQuery } from "@/types/signaldesk";
```

- [ ] **Step 2: Add generateBriefForQuery and generateFlashCardsForQuery at the end of the file**

```typescript
export async function generateBriefForQuery(
  article: Article,
  parsedQuery: ParsedQuery
): Promise<BriefContent> {
  const system = `You are a senior finance analyst briefing a junior analyst who is interviewing. ${parsedQuery.interviewContext} Be direct, technically precise, and always frame insights through the lens of what matters to someone in that specific role. Return only valid JSON.`;

  const user = `Generate an interview-ready brief for a student interviewing for ${parsedQuery.contextLabel}.

Article title: ${article.title}
Article description: ${article.description}
Source: ${article.sourceName}

Return a JSON object with exactly these fields:
- headline: string (punchy rewrite, max 12 words, written for a finance professional)
- deck: string (2-sentence analyst-level summary, max 40 words)
- talking_points: string[] (exactly 3, each max 4 words, noun-phrase format e.g. 'Spread compression dynamics')
- interview_angle: string (exactly 1 sentence — what this student should say if asked about this topic by an interviewer at ${parsedQuery.company ?? "a top finance firm"} on the ${parsedQuery.role ?? parsedQuery.sector ?? "finance"} desk)`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await requestClaudeJson(system, user);
      if (!text) break;
      const parsed = JSON.parse(text) as Partial<BriefContent>;
      return normalizeBrief(parsed, article, parsedQuery.contextLabel);
    } catch {
      continue;
    }
  }

  return normalizeBrief({}, article, parsedQuery.contextLabel);
}

export async function generateFlashCardsForQuery(
  brief: BriefContent,
  parsedQuery: ParsedQuery
): Promise<FlashCard[]> {
  const system = `You are a Managing Director interviewing a candidate for ${parsedQuery.contextLabel}. Return only valid JSON.`;

  const user = `Generate exactly 2 interview flash cards testing knowledge relevant to ${parsedQuery.contextLabel}.

Brief headline: ${brief.headline}
Brief deck: ${brief.deck}

Return a JSON array of exactly 2 objects:
- question: string (what you as an MD would ask, max 20 words, specific to this role/firm context)
- answer: string (the answer a top candidate would give, technically precise, 2-3 sentences)`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await requestClaudeJson(system, user);
      if (!text) break;
      const parsed = JSON.parse(text) as FlashCard[];
      const normalized = parsed.filter((card) => card?.question && card?.answer).slice(0, 2);
      if (normalized.length === 2) return normalized;
    } catch {
      continue;
    }
  }

  return defaultFlashCards(brief, parsedQuery.contextLabel);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/claude.ts
git commit -m "feat: add generateBriefForQuery and generateFlashCardsForQuery to claude.ts"
```

---

## Task 7: Update lib/briefs.ts

**Files:**
- Modify: `lib/briefs.ts`

- [ ] **Step 1: Add new imports at the top of briefs.ts**

The existing import block ends with:

```typescript
import { BriefApiItem, FlashCard } from "@/types/signaldesk";
```

Replace with:

```typescript
import { BriefApiItem, FlashCard, ParsedQuery } from "@/types/signaldesk";
import { fetchArticles } from "@/lib/newsapi";
import { generateBriefForQuery, generateFlashCardsForQuery } from "@/lib/claude";
import { parseQuery } from "@/lib/queryParser";
```

- [ ] **Step 2: Add serializeQueryBrief function**

Add this function after the existing `serializeBrief` function (around line 58):

```typescript
function serializeQueryBrief(brief: {
  id: string;
  articleUrl: string;
  articleTitle: string;
  sector: string;
  headline: string;
  deck: string;
  talkingPoints: string;
  interviewAngle: string;
  flashCards: string;
  publishedAt: Date;
  createdAt: Date;
  query: string | null;
  parsedTerms: string | null;
  source: string | null;
}): BriefApiItem {
  let contextLabel: string | undefined;
  if (brief.parsedTerms) {
    try {
      const pt = JSON.parse(brief.parsedTerms) as { contextLabel?: string };
      contextLabel = pt.contextLabel;
    } catch {
      // ignore
    }
  }
  return {
    id: brief.id,
    articleUrl: brief.articleUrl,
    articleTitle: brief.articleTitle,
    sector: brief.sector,
    headline: brief.headline,
    deck: brief.deck,
    talkingPoints: parseJsonArray<string>(brief.talkingPoints, []),
    interviewAngle: brief.interviewAngle,
    flashCards: parseJsonArray<FlashCard>(brief.flashCards, []),
    publishedAt: brief.publishedAt.toISOString(),
    createdAt: brief.createdAt.toISOString(),
    query: brief.query ?? undefined,
    contextLabel,
    source: brief.source ?? undefined
  };
}
```

- [ ] **Step 3: Add helper functions for query-based brief fetching**

Add these two functions after `buildBriefsForSector` (around line 142):

```typescript
async function getFreshCachedBriefsForQuery(query: string) {
  const freshBoundary = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return prisma.brief.findMany({
    where: {
      query,
      createdAt: { gte: freshBoundary }
    },
    orderBy: { publishedAt: "desc" }
  });
}

async function buildBriefsForQuery(parsedQuery: ParsedQuery, rawQuery: string) {
  const articles = await fetchArticles(parsedQuery);

  const briefs = await Promise.all(
    articles.map(async (article) => {
      const briefContent = await generateBriefForQuery(article, parsedQuery);
      const flashCards = await generateFlashCardsForQuery(briefContent, parsedQuery);

      return prisma.brief.upsert({
        where: { articleUrl: article.url },
        update: {
          articleTitle: article.title,
          sector: parsedQuery.sector ?? "",
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: JSON.stringify(briefContent.talking_points),
          interviewAngle: briefContent.interview_angle,
          flashCards: JSON.stringify(flashCards),
          publishedAt: new Date(article.publishedAt),
          createdAt: new Date(),
          query: rawQuery,
          parsedTerms: JSON.stringify(parsedQuery),
          source: article.sourceName
        },
        create: {
          articleUrl: article.url,
          articleTitle: article.title,
          sector: parsedQuery.sector ?? "",
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: JSON.stringify(briefContent.talking_points),
          interviewAngle: briefContent.interview_angle,
          flashCards: JSON.stringify(flashCards),
          publishedAt: new Date(article.publishedAt),
          query: rawQuery,
          parsedTerms: JSON.stringify(parsedQuery),
          source: article.sourceName
        }
      });
    })
  );

  return briefs.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
```

- [ ] **Step 4: Add getBriefsForQuery export**

Add this function at the end of the file, after `getBriefById`:

```typescript
export async function getBriefsForQuery(params: { query: string; userId: string }) {
  const parsedQuery = await parseQuery(params.query);

  if (isServerlessSqliteRuntime()) {
    const articles = await fetchArticles(parsedQuery);
    const briefs = await Promise.all(
      articles.map(async (article) => {
        const briefContent = await generateBriefForQuery(article, parsedQuery);
        const flashCards = await generateFlashCardsForQuery(briefContent, parsedQuery);
        return {
          id: article.url,
          articleUrl: article.url,
          articleTitle: article.title,
          sector: parsedQuery.sector ?? "",
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: briefContent.talking_points,
          interviewAngle: briefContent.interview_angle,
          flashCards,
          publishedAt: article.publishedAt,
          createdAt: new Date().toISOString(),
          query: params.query,
          contextLabel: parsedQuery.contextLabel,
          source: article.sourceName
        } satisfies BriefApiItem;
      })
    );
    return { briefs, isTruncated: false, briefsToday: 0 };
  }

  const userRecord = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!userRecord) throw new Error("User not found");

  const user = await normalizeUserDailyUsage(userRecord);
  const cached = await getFreshCachedBriefsForQuery(params.query);
  const briefs =
    cached.length > 0 ? cached : await buildBriefsForQuery(parsedQuery, params.query);

  const isTruncated = !user.isPro && user.briefsToday >= 3;
  const visibleBriefs = isTruncated ? briefs.slice(0, 1) : briefs;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      briefsToday: user.briefsToday + 1,
      lastBriefDate: new Date().toISOString().slice(0, 10)
    }
  });

  return {
    briefs: visibleBriefs.map(serializeQueryBrief),
    isTruncated,
    briefsToday: updatedUser.briefsToday
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/briefs.ts
git commit -m "feat: add getBriefsForQuery, buildBriefsForQuery, serializeQueryBrief to briefs.ts"
```

---

## Task 8: Create app/api/parse-query/route.ts

**Files:**
- Create: `app/api/parse-query/route.ts`

- [ ] **Step 1: Create the directory and file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/queryParser";
import { ensurePublicUser } from "@/lib/public-user";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

const FREE_DAILY_SEARCH_LIMIT = 3;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const user = await ensurePublicUser();

    if (!isServerlessSqliteRuntime()) {
      const todayStart = new Date(new Date().toISOString().slice(0, 10));

      const alreadySearchedToday = await prisma.search.findFirst({
        where: { userId: user.id, query, createdAt: { gte: todayStart } }
      });

      if (!alreadySearchedToday) {
        if (!user.isPro) {
          const uniqueSearchesToday = await prisma.search.count({
            where: { userId: user.id, createdAt: { gte: todayStart } }
          });

          if (uniqueSearchesToday >= FREE_DAILY_SEARCH_LIMIT) {
            return NextResponse.json(
              {
                error:
                  "Daily search limit reached. Upgrade to Pro for unlimited searches."
              },
              { status: 429 }
            );
          }
        }

        await prisma.search.create({ data: { userId: user.id, query } });
      }
    }

    const parsed = await parseQuery(query);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse query" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/parse-query/route.ts
git commit -m "feat: add POST /api/parse-query route with rate limiting and Search record creation"
```

---

## Task 9: Create app/api/user/search-history/route.ts

**Files:**
- Create: `app/api/user/search-history/route.ts`

- [ ] **Step 1: Create the directory and file**

```typescript
import { NextResponse } from "next/server";
import { ensurePublicUser } from "@/lib/public-user";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

export async function GET() {
  if (isServerlessSqliteRuntime()) {
    return NextResponse.json([]);
  }

  const user = await ensurePublicUser();

  const searches = await prisma.search.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const seen = new Set<string>();
  const history = searches
    .filter((s) => {
      if (seen.has(s.query)) return false;
      seen.add(s.query);
      return true;
    })
    .slice(0, 10)
    .map((s) => s.query);

  return NextResponse.json(history);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/user/search-history/route.ts
git commit -m "feat: add GET /api/user/search-history route"
```

---

## Task 10: Update app/api/briefs/route.ts

**Files:**
- Modify: `app/api/briefs/route.ts`

- [ ] **Step 1: Replace the file contents**

The current file only handles `?sector=`. Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBriefsForSector, getBriefsForQuery } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { getSectorById } from "@/lib/sectors";

export async function GET(request: NextRequest) {
  const queryParam = request.nextUrl.searchParams.get("query");
  const sectorId = request.nextUrl.searchParams.get("sector") ?? "";

  const user = await ensurePublicUser();

  try {
    if (queryParam) {
      const result = await getBriefsForQuery({ query: queryParam, userId: user.id });
      return NextResponse.json(result);
    }

    if (!getSectorById(sectorId)) {
      return NextResponse.json({ error: "Invalid sector" }, { status: 400 });
    }

    const result = await getBriefsForSector({ sectorId, userId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load briefs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/briefs/route.ts
git commit -m "feat: add ?query= path to /api/briefs alongside existing ?sector= path"
```

---

## Task 11: Update app/api/user/route.ts

**Files:**
- Modify: `app/api/user/route.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { NextResponse } from "next/server";
import { normalizeUserDailyUsage } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { parseStoredSectors } from "@/lib/sectors";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

export async function GET() {
  const user = await ensurePublicUser();
  const normalizedUser = await normalizeUserDailyUsage(user);

  let searchHistory: string[] = [];

  if (!isServerlessSqliteRuntime()) {
    const searches = await prisma.search.findMany({
      where: { userId: normalizedUser.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const seen = new Set<string>();
    searchHistory = searches
      .filter((s) => {
        if (seen.has(s.query)) return false;
        seen.add(s.query);
        return true;
      })
      .slice(0, 5)
      .map((s) => s.query);
  }

  return NextResponse.json({
    id: normalizedUser.id,
    email: normalizedUser.email,
    name: normalizedUser.name,
    isPro: normalizedUser.isPro,
    sectors: parseStoredSectors(normalizedUser.sectors),
    briefsToday: normalizedUser.briefsToday,
    dailyLimit: normalizedUser.isPro ? null : 3,
    searchHistory
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/user/route.ts
git commit -m "feat: include searchHistory in GET /api/user response"
```

---

## Task 12: Create components/SearchBar.tsx

**Files:**
- Create: `components/SearchBar.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

const PLACEHOLDERS = [
  "Infrastructure Investment Banking...",
  "Lazard M&A...",
  "Apollo Credit...",
  "Debt Capital Markets...",
  "Houlihan Lokey Restructuring..."
];

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative flex items-center">
        <svg
          className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-28 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[var(--green)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 transition"
        />
        <button
          type="submit"
          className="absolute right-3 rounded-xl bg-[var(--green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--green-mid)]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/SearchBar.tsx
git commit -m "feat: add SearchBar component with cycling placeholder"
```

---

## Task 13: Create components/QueryChip.tsx

**Files:**
- Create: `components/QueryChip.tsx`

- [ ] **Step 1: Create the file**

```typescript
interface QueryChipProps {
  query: string;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
}

export default function QueryChip({ query, onSelect, onRemove }: QueryChipProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm">
      <button
        type="button"
        onClick={() => onSelect(query)}
        className="max-w-[160px] truncate transition hover:text-gray-900"
      >
        {query}
      </button>
      <button
        type="button"
        onClick={() => onRemove(query)}
        aria-label={`Remove ${query}`}
        className="ml-1.5 text-gray-400 transition hover:text-gray-700"
      >
        ×
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/QueryChip.tsx
git commit -m "feat: add QueryChip component for search history pills"
```

---

## Task 14: Update components/BriefCard.tsx

**Files:**
- Modify: `components/BriefCard.tsx`

The spec requires: source name top left, sector tag top right, interview angle preview (first 60 chars, italic, green left border). Currently BriefCard has sector tag left + time ago right, and no interview angle preview.

- [ ] **Step 1: Replace the file contents**

```typescript
import Link from "next/link";
import { Route } from "next";
import { formatDistanceToNow } from "date-fns";
import { BriefApiItem } from "@/types/signaldesk";

interface BriefCardProps {
  brief: BriefApiItem;
  href?: string;
  ctaLabel?: string;
  onClick?: () => void;
}

export default function BriefCard({
  brief,
  href = `/brief/${brief.id}`,
  ctaLabel = "Read brief →",
  onClick
}: BriefCardProps) {
  const isHashLink = href.startsWith("#");
  const anglePreview = brief.interviewAngle.slice(0, 60) + (brief.interviewAngle.length > 60 ? "…" : "");

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500">
          {brief.source ? `${brief.source} · ` : ""}
          {formatDistanceToNow(new Date(brief.publishedAt), { addSuffix: true })}
        </span>
        <span className="rounded-full bg-[var(--green-light)] px-3 py-1 text-xs font-medium text-[var(--green)]">
          {brief.sector}
        </span>
      </div>

      <h2 className="font-serif text-[18px] leading-tight text-gray-900">{brief.headline}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-600">{brief.deck}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {brief.talkingPoints.map((point) => (
          <span
            key={point}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
          >
            {point}
          </span>
        ))}
      </div>

      <div className="mt-4 border-l-2 border-[var(--green)] pl-3">
        <p className="text-sm italic text-gray-500">{anglePreview}</p>
      </div>

      {isHashLink ? (
        <a
          href={href}
          onClick={onClick}
          className="mt-5 inline-flex items-center text-sm font-medium text-[var(--green)] transition hover:text-[var(--green-mid)]"
        >
          {ctaLabel}
        </a>
      ) : (
        <Link
          href={href as Route}
          onClick={onClick}
          className="mt-5 inline-flex items-center text-sm font-medium text-[var(--green)] transition hover:text-[var(--green-mid)]"
        >
          {ctaLabel}
        </Link>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/BriefCard.tsx
git commit -m "feat: update BriefCard to show source name left, sector tag right, interview angle preview"
```

---

## Task 15: Update components/FeedView.tsx

**Files:**
- Modify: `components/FeedView.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
"use client";

import { useState } from "react";
import BriefCard from "@/components/BriefCard";
import QueryChip from "@/components/QueryChip";
import SearchBar from "@/components/SearchBar";
import SkeletonCard from "@/components/SkeletonCard";
import UpgradeModal from "@/components/UpgradeModal";
import { BriefApiItem, ParsedQuery } from "@/types/signaldesk";

interface FeedViewProps {
  firstName: string;
  userInitials: string;
  isPro: boolean;
  initialBriefsToday: number;
  initialSearchHistory: string[];
}

export default function FeedView({
  userInitials,
  isPro: initialIsPro,
  initialBriefsToday,
  initialSearchHistory
}: FeedViewProps) {
  const [briefs, setBriefs] = useState<BriefApiItem[]>([]);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [activeQuery, setActiveQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>(initialSearchHistory);
  const [loading, setLoading] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [isPro] = useState(initialIsPro);
  const [briefsToday, setBriefsToday] = useState(initialBriefsToday);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(rawQuery: string) {
    const q = rawQuery.trim();
    if (!q) return;

    setActiveQuery(q);
    setLoading(true);
    setHasSearched(true);
    setBriefs([]);
    setParsedQuery(null);

    try {
      const parseRes = await fetch("/api/parse-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });

      if (!parseRes.ok) {
        if (parseRes.status === 429) {
          setUpgradeOpen(true);
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }

      const parsed = (await parseRes.json()) as ParsedQuery;
      setParsedQuery(parsed);

      setSearchHistory((prev) => [q, ...prev.filter((h) => h !== q)].slice(0, 10));

      const briefsRes = await fetch(`/api/briefs?query=${encodeURIComponent(q)}`, {
        cache: "no-store"
      });

      if (!briefsRes.ok) {
        setBriefs([]);
        return;
      }

      const data = (await briefsRes.json()) as {
        briefs: BriefApiItem[];
        isTruncated: boolean;
        briefsToday?: number;
      };

      setBriefs(data.briefs);
      setIsTruncated(data.isTruncated);
      if (typeof data.briefsToday === "number") {
        setBriefsToday(data.briefsToday);
      }
      if (data.isTruncated) {
        setUpgradeOpen(true);
      }
    } catch {
      setBriefs([]);
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveFromHistory(q: string) {
    setSearchHistory((prev) => prev.filter((h) => h !== q));
  }

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="font-serif text-3xl tracking-tight text-gray-900">
            Signal<span className="text-[var(--green)]">Desk</span>
          </div>
          <div className="flex items-center gap-3">
            {!isPro ? (
              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
                {Math.min(briefsToday, 3)} of 3 used
              </div>
            ) : null}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--green)] text-sm font-medium uppercase text-white">
              {userInitials}
            </div>
          </div>
        </div>

        <SearchBar onSearch={handleSearch} />

        {searchHistory.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchHistory.slice(0, 5).map((h) => (
              <QueryChip
                key={h}
                query={h}
                onSelect={handleSearch}
                onRemove={handleRemoveFromHistory}
              />
            ))}
          </div>
        )}

        {parsedQuery && !loading && (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900">
                Showing results for: {parsedQuery.contextLabel}
              </span>
              {parsedQuery.contextLabel !== activeQuery && (
                <button
                  type="button"
                  onClick={() => setParsedQuery(null)}
                  className="text-gray-400 transition hover:text-gray-600"
                >
                  · change
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400">{parsedQuery.interviewContext}</p>
          </div>
        )}

        <div className="mt-8 grid gap-5">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : briefs.map((brief) => <BriefCard key={brief.id} brief={brief} />)}
        </div>

        {!loading && hasSearched && briefs.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-600">
            No briefs found for this query. Try a different role or firm name.
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-400">
              Try: &ldquo;Infrastructure IB at Lazard&rdquo; &middot; &ldquo;Apollo Credit&rdquo; &middot; &ldquo;Debt Capital Markets&rdquo; &middot; &ldquo;Houlihan Lokey Restructuring&rdquo;
            </p>
          </div>
        )}
      </div>

      <UpgradeModal
        open={upgradeOpen || isTruncated}
        onClose={() => {
          setUpgradeOpen(false);
          setIsTruncated(false);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FeedView.tsx
git commit -m "feat: rewrite FeedView with SearchBar and QueryChip search-driven UI"
```

---

## Task 16: Update app/feed/page.tsx

**Files:**
- Modify: `app/feed/page.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
import FeedView from "@/components/FeedView";
import { normalizeUserDailyUsage } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

export default async function FeedPage() {
  const user = await ensurePublicUser();
  const normalizedUser = await normalizeUserDailyUsage(user);

  const firstName = (normalizedUser.name ?? "there").split(" ")[0];
  const userInitials = (normalizedUser.name ?? "SD")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  let searchHistory: string[] = [];

  if (!isServerlessSqliteRuntime()) {
    const recentSearches = await prisma.search.findMany({
      where: { userId: normalizedUser.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const seen = new Set<string>();
    searchHistory = recentSearches
      .filter((s) => {
        if (seen.has(s.query)) return false;
        seen.add(s.query);
        return true;
      })
      .slice(0, 10)
      .map((s) => s.query);
  }

  return (
    <main className="min-h-screen">
      <FeedView
        firstName={firstName}
        userInitials={userInitials}
        isPro={normalizedUser.isPro}
        initialBriefsToday={normalizedUser.briefsToday}
        initialSearchHistory={searchHistory}
      />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/feed/page.tsx
git commit -m "feat: update feed page to pass search history to FeedView"
```

---

## Task 17: Verify and Deploy

- [ ] **Step 1: Run TypeScript build to catch type errors**

```bash
cd C:\Users\zhusain1\SignalDesk
npm run build
```

Expected: Build completes with no TypeScript errors. If there are errors, fix them before proceeding.

- [ ] **Step 2: Start dev server and test with ANTHROPIC_API_KEY only**

```bash
npm run dev
```

Open `http://localhost:3000/feed`.

Manual checks:
- [ ] SearchBar renders with cycling placeholder text
- [ ] Type "Apollo Credit" → should show 3 SkeletonCards → then 3 BriefCards
- [ ] BriefCards show source name + time left, sector tag right, interview angle preview
- [ ] Confirmation label "Showing results for: Apollo Credit" appears
- [ ] "Apollo Credit" appears in search history chips after searching
- [ ] Click a QueryChip → re-runs that search
- [ ] X on a QueryChip → removes it from history
- [ ] Click "Read brief →" → navigates to `/brief/[id]`

- [ ] **Step 3: Test daily limit (free tier)**

In the database, manually set `briefsToday = 3` for the guest user:

```bash
cd C:\Users\zhusain1\SignalDesk
npx prisma studio
```

Set `briefsToday = 3` on the guest user. Then search again → UpgradeModal should appear.

Reset `briefsToday = 0` after testing.

- [ ] **Step 4: Test mock fallback**

Temporarily rename `.env` or remove `NEWSAPI_KEY`. Search "Debt Capital Markets" → should return mock articles with "SignalDesk Mock Wire" as source.

- [ ] **Step 5: Push to GitHub (triggers Vercel deploy)**

```bash
git push origin main
```

Expected: Vercel picks up the push and deploys. Verify on Vercel dashboard that the build succeeds.

---

## Self-Review Notes

- All existing sector-based routes (`/api/briefs?sector=`, `/api/user/sectors`) are untouched — backward compat preserved
- `isServerlessSqliteRuntime()` guards protect all Prisma calls in serverless environments
- `parseQuery` cache is in-memory per process — won't persist across serverless invocations but prevents duplicate Claude calls within a single request lifecycle
- The `UpgradeModal` component's existing props are used as-is — `open`, `onClose`, `message` (message is optional)
- `FeedView` no longer uses `firstName` in the render (removed the greeting section) — the prop is kept in the interface for backward compat but unused; to avoid a TS warning, prefixing with `_` is acceptable
