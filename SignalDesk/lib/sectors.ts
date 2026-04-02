import { SectorDef } from "@/types/signaldesk";

export const SECTORS: SectorDef[] = [
  {
    id: "private-credit",
    label: "Private Credit",
    keywords: ["private credit", "direct lending", "NAV loans", "BDC", "credit fund"],
    proxyTickers: ["ARCC", "OBDC", "BXSL", "PFLT"],
    macroSeries: [
      { id: "DFF", label: "Fed Funds Rate" },
      { id: "BAMLH0A0HYM2", label: "High Yield OAS" },
      { id: "BAMLC0A4CBBB", label: "BBB OAS" }
    ]
  },
  {
    id: "ib-ma",
    label: "IB M&A",
    keywords: ["mergers acquisitions", "M&A deal", "investment banking", "buyout", "LBO"],
    proxyTickers: ["GS", "MS", "EVR", "HLI"],
    macroSeries: [
      { id: "DFF", label: "Fed Funds Rate" },
      { id: "BAMLC0A0CM", label: "US Corporate Master OAS" },
      { id: "VIXCLS", label: "VIX" }
    ]
  },
  {
    id: "growth-equity",
    label: "Growth Equity",
    keywords: ["growth equity", "venture growth", "late stage funding", "Series C", "Series D"],
    proxyTickers: ["SNOW", "DDOG", "CRM", "NOW"],
    macroSeries: [
      { id: "DGS10", label: "10Y Treasury" },
      { id: "VIXCLS", label: "VIX" },
      { id: "CPIAUCSL", label: "CPI" }
    ]
  },
  {
    id: "restructuring",
    label: "Restructuring",
    keywords: ["debt restructuring", "bankruptcy", "chapter 11", "distressed debt", "turnaround"],
    proxyTickers: ["JWN", "WBA", "RIG", "CHWY"],
    macroSeries: [
      { id: "BAMLH0A0HYM2", label: "High Yield OAS" },
      { id: "UNRATE", label: "Unemployment Rate" },
      { id: "DFF", label: "Fed Funds Rate" }
    ]
  },
  {
    id: "sales-trading",
    label: "Sales & Trading",
    keywords: ["fixed income trading", "equities desk", "market making", "derivatives", "rates"],
    proxyTickers: ["GS", "MS", "JPM", "SCHW"],
    macroSeries: [
      { id: "VIXCLS", label: "VIX" },
      { id: "DTWEXBGS", label: "Broad Dollar Index" },
      { id: "DGS2", label: "2Y Treasury" }
    ]
  },
  {
    id: "hedge-funds",
    label: "Hedge Funds",
    keywords: ["hedge fund", "long short equity", "macro fund", "activist investor", "short seller"],
    proxyTickers: ["BK", "BLK", "KKR", "APO"],
    macroSeries: [
      { id: "VIXCLS", label: "VIX" },
      { id: "DTWEXBGS", label: "Broad Dollar Index" },
      { id: "DGS10", label: "10Y Treasury" }
    ]
  },
  {
    id: "real-estate",
    label: "Real Estate",
    keywords: ["commercial real estate", "REIT", "CRE lending", "cap rates", "real estate fund"],
    proxyTickers: ["SPG", "PLD", "O", "VICI"],
    macroSeries: [
      { id: "MORTGAGE30US", label: "30Y Mortgage Rate" },
      { id: "DGS10", label: "10Y Treasury" },
      { id: "CSUSHPISA", label: "Case-Shiller Index" }
    ]
  },
  {
    id: "corp-dev",
    label: "Corp Dev",
    keywords: ["corporate development", "strategic acquisition", "corporate M&A", "bolt-on acquisition"],
    proxyTickers: ["CSCO", "ADBE", "CRM", "ORCL"],
    macroSeries: [
      { id: "DFF", label: "Fed Funds Rate" },
      { id: "BAMLC0A0CM", label: "US Corporate Master OAS" },
      { id: "INDPRO", label: "Industrial Production" }
    ]
  }
];

export function getSectorById(sectorId: string) {
  return SECTORS.find((sector) => sector.id === sectorId) ?? null;
}

export function getSectorByLabel(label: string) {
  return SECTORS.find((sector) => sector.label.toLowerCase() === label.toLowerCase()) ?? null;
}

export function getSectorByAny(value: string) {
  return getSectorById(value) ?? getSectorByLabel(value);
}

export function parseStoredSectors(raw: string | null | undefined): string[] {
  if (!raw) {
    return [SECTORS[0].id];
  }

  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const sectorIds = values
    .map((value) => getSectorByAny(value)?.id)
    .filter((value): value is string => Boolean(value));

  return sectorIds.length > 0 ? Array.from(new Set(sectorIds)) : [SECTORS[0].id];
}

export function serializeSectors(sectorIds: string[]): string {
  return sectorIds
    .map((sectorId) => getSectorById(sectorId)?.label)
    .filter((value): value is string => Boolean(value))
    .join(",");
}
