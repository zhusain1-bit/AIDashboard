import { fetchFmpArticlesForSector } from "@/lib/fmp";
import { getSectorById } from "@/lib/sectors";
import { Article } from "@/types/signaldesk";

export const MOCK_ARTICLES: Record<string, Article[]> = {
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
    }
  ],
  "corp-dev": [
    {
      title: "Corporate development teams favor tuck-in deals over platform swings",
      description:
        "Boards are backing smaller strategic acquisitions with faster integration pathways and clearer synergy cases.",
      url: "https://signaldesk.mock/corp-dev/tuck-in-deals",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-28T15:15:00.000Z"
    },
    {
      title: "Acquirers scrutinize integration risk as software consolidation resumes",
      description:
        "Strategic buyers are spending more time on post-merger execution planning before approving software M&A processes.",
      url: "https://signaldesk.mock/corp-dev/software-consolidation",
      sourceName: "SignalDesk Mock Wire",
      publishedAt: "2026-03-25T10:10:00.000Z"
    }
  ]
};

function getFallbackArticles(sectorId: string): Article[] {
  return MOCK_ARTICLES[sectorId] ?? MOCK_ARTICLES["private-credit"];
}

function dedupeArticles(items: Article[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

export async function fetchArticlesForSector(sectorId: string): Promise<Article[]> {
  const sector = getSectorById(sectorId);

  if (!sector) {
    return getFallbackArticles("private-credit");
  }

  const apiKey = process.env.NEWSAPI_KEY;
  const fmpArticles = await fetchFmpArticlesForSector(sectorId);

  let newsApiArticles: Article[] = [];

  if (apiKey) {
    const query = sector.keywords.map((keyword) => `"${keyword}"`).join(" OR ");
    try {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", query);
      url.searchParams.set("language", "en");
      url.searchParams.set("sortBy", "publishedAt");
      url.searchParams.set("pageSize", "5");

      const response = await fetch(url.toString(), {
        headers: {
          "X-Api-Key": apiKey
        },
        next: { revalidate: 0 }
      });

      if (response.ok) {
        const data = (await response.json()) as {
          articles?: Array<{
            title?: string;
            description?: string;
            url?: string;
            publishedAt?: string;
            source?: { name?: string };
          }>;
        };

        newsApiArticles =
          data.articles
            ?.filter((article) => article.title && article.url)
            .map((article) => ({
              title: article.title ?? "Untitled article",
              description: article.description ?? "No summary available.",
              url: article.url ?? "",
              sourceName: article.source?.name ?? "NewsAPI",
              publishedAt: article.publishedAt ?? new Date().toISOString()
            }))
            .slice(0, 5) ?? [];
      }
    } catch {
      newsApiArticles = [];
    }
  }

  const combined = dedupeArticles(
    [...fmpArticles, ...newsApiArticles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  ).slice(0, 5);

  return combined.length > 0 ? combined : getFallbackArticles(sectorId);
}
