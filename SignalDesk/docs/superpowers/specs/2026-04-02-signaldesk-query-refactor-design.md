# SignalDesk: Query-First Refactor Design

**Date:** 2026-04-02  
**Status:** Approved  
**Scope:** Refactor existing sector-based SignalDesk app to a freeform query-based architecture

---

## Context

The existing SignalDesk app (Next.js 15, Prisma/SQLite, NextAuth, Claude API) uses 8 fixed sector buckets (Private Credit, IB M&A, etc.) to drive news fetching and brief generation. The core differentiator of the new design is that users can search for *anything* — a role, a company, or both — and Claude interprets the query into structured search terms. Instead of "pick a sector," the UX is "type anything."

---

## What Changes vs. What Stays

### Stays as-is
- NextAuth + Google OAuth auth flow (`lib/auth.ts`, `app/api/auth/`)
- Design system: green palette (#0F6E56), DM fonts, card styles (`globals.css`, `tailwind.config.js`)
- `FlashCard`, `SkeletonCard`, `UpgradeModal` components
- FRED/FMP/SEC integrations (`lib/fred.ts`, `lib/fmp.ts`, `lib/sec.ts`) — bonus enrichment on `/brief/[id]`
- `lib/prisma.ts`, `lib/public-user.ts`
- `/brief/[id]` page layout (minor data field updates only)
- `/login` page

### Added (net-new files)
| File | Purpose |
|------|---------|
| `lib/queryParser.ts` | Claude parses freeform query → `ParsedQuery` struct; in-memory session cache |
| `app/api/parse-query/route.ts` | POST endpoint; saves to `Search` table; rate-limits free users to 3/day |
| `app/api/user/search-history/route.ts` | GET last 10 `Search` records for current user |
| `components/SearchBar.tsx` | Large freeform input, placeholder cycles every 2.5s |
| `components/QueryChip.tsx` | Clickable pill for search history; X removes from state |

### Modified (surgical changes)
| File | What changes |
|------|-------------|
| `prisma/schema.prisma` | Add `Search` model; add `query`, `parsedTerms`, `source` to `Brief`; add `searches` relation to `User` |
| `types/signaldesk.ts` | Add `ParsedQuery` interface |
| `lib/newsapi.ts` | Add `fetchArticles(parsedQuery: ParsedQuery)` export alongside existing sector logic |
| `lib/claude.ts` | Update `generateBrief` / `generateFlashCards` to accept `ParsedQuery` for role/company/interviewContext prompting |
| `lib/mockData.ts` | Extract mock articles from `newsapi.ts`; add `getMockArticles(parsedQuery)` with fuzzy sector matching |
| `app/api/briefs/route.ts` | Add `?query=` param path; keep `?sector=` for backward compat |
| `components/FeedView.tsx` | Replace sector pills with `SearchBar` + `QueryChip` history row |
| `app/feed/page.tsx` | Pass search history to `FeedView` instead of initial sectors |
| `app/api/user/route.ts` | Include `searchHistory` (last 5) in response |

---

## Data Model Changes

```prisma
// New model
model Search {
  id        String   @id @default(cuid())
  userId    String
  query     String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

// Updated Brief — additive fields (no destructive migration)
model Brief {
  // ... existing fields unchanged ...
  query          String?   // raw user query that generated this brief
  parsedTerms    String?   // JSON: { role, company, sector, newsApiQuery, contextLabel, interviewContext }
  source         String?   // article source name
}

// Updated User — additive
model User {
  // ... existing fields unchanged ...
  searches  Search[]
}
```

Migration: `prisma db push` — all new fields are optional/additive; no existing data is affected.

---

## Intelligence Layer: ParsedQuery

### Interface (`types/signaldesk.ts`)
```typescript
export interface ParsedQuery {
  role: string | null           // e.g. "Infrastructure IB", "DCM"
  company: string | null        // e.g. "Lazard", "Apollo Global"
  sector: string | null         // inferred e.g. "Investment Banking", "Private Credit"
  newsApiQuery: string          // optimized query for NewsAPI (max 5 terms, OR/AND)
  contextLabel: string          // display label e.g. "Infrastructure IB at Lazard"
  interviewContext: string      // 1 sentence describing who is interviewing and what they care about
}
```

### lib/queryParser.ts
- `parseQuery(rawQuery: string): Promise<ParsedQuery>`
- Calls Claude (`claude-sonnet-4-20250514`) with structured JSON-only prompt
- In-memory `Map<string, ParsedQuery>` cache — avoids re-calling Claude for identical queries within the process lifetime
- Returns typed fallback if Claude response fails to parse

### lib/newsapi.ts additions
- `fetchArticles(parsedQuery: ParsedQuery): Promise<Article[]>`
- Calls NewsAPI `/everything` with `parsedQuery.newsApiQuery`, `language=en`, `sortBy=publishedAt`, `pageSize=8`
- On any failure (missing key, network error): calls `getMockArticles(parsedQuery)` instead

### lib/mockData.ts (extracted + expanded)
- Mock articles for 8 categories: infrastructure/project finance, M&A/advisory, DCM, private credit, boutique advisory, restructuring, sales & trading, growth equity
- `getMockArticles(parsedQuery)`: fuzzy-matches `parsedQuery.sector` to return most relevant mock set (3+ articles per category)

### lib/claude.ts updates
- `generateBrief(article, parsedQuery)` — system prompt references `parsedQuery.interviewContext`; interview angle tailored to `parsedQuery.company`/`parsedQuery.role`
- `generateFlashCards(brief, parsedQuery)` — MD framing uses `parsedQuery.contextLabel`

---

## API Routes

### POST /api/parse-query
- Body: `{ query: string }`
- Calls `parseQuery()`, saves `Search` record for current user
- Free users: max 3 unique queries/day (checked against today's `Search` count)
- Returns `ParsedQuery`

### GET /api/briefs?query={encoded}
1. Decode + `parseQuery()`
2. Check Brief table for cached briefs matching this query created within 2 hours → return if found
3. Cache miss: `fetchArticles(parsedQuery)` → per article: `generateBrief()` + `generateFlashCards()` → save to Brief table
4. Free user daily brief limit: 3 total. If at limit → `{ briefs: [first only], isTruncated: true }`
5. Track `User.briefsToday`, reset if `lastBriefDate != today`

### GET /api/briefs?sector={id} (unchanged)
- Existing behavior preserved for backward compatibility

### GET /api/user/search-history
- Returns last 10 `Search` records for current user

---

## UI

### /feed layout
```
┌─────────────────────────────────────────────────────────┐
│  SignalDesk                         2 of 3 used  [avatar]│
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🔍  Infrastructure Investment Banking...         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Recent: [Lazard M&A ×]  [Apollo Credit ×]  [DCM ×]     │
│                                                          │
│  Showing results for: Infrastructure IB at Lazard        │
│  A VP covering infra deals will ask about...            │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ BriefCard  │  │ BriefCard  │  │ BriefCard  │         │
│  └────────────┘  └────────────┘  └────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### SearchBar component
- Large rounded input, full width, search icon
- Placeholder cycles every 2.5s: "Infrastructure Investment Banking...", "Lazard M&A...", "Apollo Credit...", "Debt Capital Markets...", "Houlihan Lokey Restructuring..."
- On submit: trim + validate non-empty → `onSearch(query)`
- After results load: subtle label "Tailored for: {contextLabel}" with `interviewContext` as gray subtext

### QueryChip component
- Small pill with query text + X button
- Click: re-runs search
- X: removes from local history state (optimistic)

### BriefCard updates
- `source` now read from DB field (not inferred)
- Sector tag reads from `parsedTerms.sector` (Claude-inferred, not user-selected)
- `query` field used to group/label results

### /brief/[id] updates
- `contextLabel` from `parsedTerms` shown as subtitle
- Sector tag from `parsedTerms.sector`
- Flash cards: blurred + "Upgrade to reveal" for non-Pro users (existing behavior)

---

## Rate Limiting & Caching Summary

| Limit | Free tier | Pro |
|-------|-----------|-----|
| Unique searches/day | 3 | Unlimited |
| Briefs/day | 3 total | Unlimited |
| Brief DB cache | 2 hours per query | same |
| Query parse cache | In-memory Map (process lifetime) | same |

---

## Implementation Order

1. Schema migration (`prisma db push`)
2. `types/signaldesk.ts` — add `ParsedQuery`
3. `lib/mockData.ts` — extract + expand mock articles
4. `lib/queryParser.ts` — new file
5. `lib/newsapi.ts` — add `fetchArticles(parsedQuery)`
6. `lib/claude.ts` — update to accept `ParsedQuery`
7. `app/api/parse-query/route.ts` — new route
8. `app/api/user/search-history/route.ts` — new route
9. `app/api/briefs/route.ts` — add query path
10. `app/api/user/route.ts` — include search history
11. `components/SearchBar.tsx` — new component
12. `components/QueryChip.tsx` — new component
13. `components/FeedView.tsx` — replace sector pills with search UI
14. `app/feed/page.tsx` — pass search history

---

## Verification

```bash
# 1. Apply schema changes
cd SignalDesk && npx prisma db push

# 2. Start dev server
npm run dev

# 3. Test with only ANTHROPIC_API_KEY set (mock news fallback)
# - Go to /feed, type "Apollo Credit" → should show 3 mock briefs
# - Type same query again → should return instantly (DB cache)
# - Hit daily limit (3 briefs) → UpgradeModal should appear

# 4. Test with NEWSAPI_KEY set
# - Type "Lazard M&A" → should fetch live articles + generate real briefs

# 5. Test /brief/[id]
# - Click any brief → contextLabel + sector tag should show Claude-inferred values
# - Flash cards blurred for free user, visible after Pro toggle
```
