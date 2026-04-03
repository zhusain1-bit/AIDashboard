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
