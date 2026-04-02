import { getSectorById } from "@/lib/sectors";
import { Article, FilingItem, TranscriptItem } from "@/types/signaldesk";

function dedupeByUrl<T extends { url: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

export async function fetchFmpArticlesForSector(sectorId: string): Promise<Article[]> {
  const apiKey = process.env.FMP_API_KEY;
  const sector = getSectorById(sectorId);

  if (!apiKey || !sector?.proxyTickers?.length) {
    return [];
  }

  try {
    const url = new URL("https://financialmodelingprep.com/api/v3/stock_news");
    url.searchParams.set("tickers", sector.proxyTickers.join(","));
    url.searchParams.set("limit", "10");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{
      title?: string;
      text?: string;
      url?: string;
      site?: string;
      publishedDate?: string;
    }>;

    return dedupeByUrl(
      (data ?? [])
        .filter((item) => item.title && item.url)
        .map((item) => ({
          title: item.title ?? "Untitled article",
          description: item.text ?? "No summary available.",
          url: item.url ?? "",
          sourceName: item.site ?? "FMP",
          publishedAt: item.publishedDate ?? new Date().toISOString()
        }))
    ).slice(0, 5);
  } catch {
    return [];
  }
}

export async function fetchFmpTranscriptsForSector(sectorId: string): Promise<TranscriptItem[]> {
  const apiKey = process.env.FMP_API_KEY;
  const sector = getSectorById(sectorId);

  if (!apiKey || !sector?.proxyTickers?.length) {
    return [];
  }

  try {
    const url = new URL("https://financialmodelingprep.com/stable/earnings-transcript-latest");
    url.searchParams.set("limit", "50");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{
      symbol?: string;
      date?: string;
      quarter?: number;
      year?: number;
    }>;

    return (data ?? [])
      .filter((item) => item.symbol && sector.proxyTickers?.includes(item.symbol))
      .slice(0, 4)
      .map((item) => ({
        symbol: item.symbol ?? "",
        title: `${item.symbol} Q${item.quarter ?? ""} ${item.year ?? ""} earnings transcript`.trim(),
        date: item.date ?? new Date().toISOString(),
        url: `https://financialmodelingprep.com/financial-summary/${item.symbol}`,
        source: "FMP"
      }));
  } catch {
    return [];
  }
}

export async function fetchFmpFilingsForSector(sectorId: string): Promise<FilingItem[]> {
  const apiKey = process.env.FMP_API_KEY;
  const sector = getSectorById(sectorId);

  if (!apiKey || !sector?.proxyTickers?.length) {
    return [];
  }

  try {
    const url = new URL("https://financialmodelingprep.com/stable/sec-filings-search/symbol");
    url.searchParams.set("symbol", sector.proxyTickers.join(","));
    url.searchParams.set("page", "0");
    url.searchParams.set("limit", "10");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{
      symbol?: string;
      companyName?: string;
      filingDate?: string;
      finalLink?: string;
      formType?: string;
    }>;

    return (data ?? [])
      .filter((item) => item.symbol && item.finalLink && item.formType)
      .slice(0, 5)
      .map((item) => ({
        ticker: item.symbol ?? "",
        companyName: item.companyName ?? item.symbol ?? "Company",
        form: item.formType ?? "Filing",
        filedAt: item.filingDate ?? new Date().toISOString(),
        filingUrl: item.finalLink ?? ""
      }));
  } catch {
    return [];
  }
}
