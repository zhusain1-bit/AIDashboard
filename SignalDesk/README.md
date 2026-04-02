# SignalDesk

SignalDesk is a finance interview prep platform that turns sector-relevant news into concise interview briefs and flash cards. It is designed for candidates preparing for private equity, investment banking, credit, hedge fund, and related finance interviews.

## Prerequisites

- Node.js 18+
- npm

## Setup

1. Clone the repository and enter the project directory.

```bash
git clone <your-repo-url>
cd SignalDesk
```

2. Install dependencies.

```bash
npm install
```

3. Copy the environment template and fill in the values you want to use.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

4. Configure environment variables.

- `ANTHROPIC_API_KEY`: required for live Claude-generated briefs and flash cards
- `NEWSAPI_KEY`: optional, used for live news instead of the built-in mocks
- `FRED_API_KEY`: optional, used for macro context on brief detail pages
- `FMP_API_KEY`: optional, used for company news, filing, and transcript context
- `NEXTAUTH_URL`: set to `http://localhost:3000` for local development

The app will still boot without real API keys. If `NEWSAPI_KEY` is missing or NewsAPI fails, SignalDesk serves built-in mock articles. If `ANTHROPIC_API_KEY` is missing or Claude fails, SignalDesk falls back to deterministic local brief and flash-card generation.

5. Push the Prisma schema to SQLite.

```bash
npx prisma db push
```

6. Start the dev server.

```bash
npm run dev
```

7. Open `http://localhost:3000`.

## API Keys

### Anthropic

- Console: https://console.anthropic.com/
- Create an API key in the Anthropic dashboard and place it in `ANTHROPIC_API_KEY`

### NewsAPI

- Signup: https://newsapi.org/register
- Dashboard: https://newsapi.org/account
- Copy the API key into `NEWSAPI_KEY`

## Mock Data Fallback

SignalDesk ships with mock articles for all eight sectors. If `NEWSAPI_KEY` is not set, invalid, rate-limited, or the NewsAPI request fails for any reason, the app automatically serves the mock sector feed.

If Claude is unavailable, SignalDesk still generates usable default headlines, decks, talking points, interview angles, and flash cards locally. That means the app can render and function even with zero real external API keys.

The app can also enrich brief detail pages with SEC EDGAR, FRED, and Financial Modeling Prep data. SEC EDGAR does not require an API key. FRED and FMP are optional and fail softly when missing.

## Deployment

- Deploy to Vercel: https://vercel.com/new
- Import the repository and keep the default Next.js settings
- Add the same environment variables from `.env.local` in the Vercel project dashboard
- Run `npx prisma db push` against your deployment database before first production use

For production, consider replacing SQLite with a hosted Prisma-compatible database if you expect concurrent multi-user traffic.
