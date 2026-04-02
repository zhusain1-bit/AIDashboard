import { getSectorById } from "@/lib/sectors";
import { FilingItem } from "@/types/signaldesk";

interface TickerMapItem {
  ticker: string;
  title: string;
  cik_str: number;
}

let tickerMapCache: TickerMapItem[] | null = null;

async function getTickerMap() {
  if (tickerMapCache) {
    return tickerMapCache;
  }

  try {
    const response = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: {
        "User-Agent": "SignalDesk/1.0 support@signaldesk.local",
        Accept: "application/json"
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Record<string, TickerMapItem>;
    tickerMapCache = Object.values(data);
    return tickerMapCache;
  } catch {
    return [];
  }
}

function padCik(cik: number) {
  return cik.toString().padStart(10, "0");
}

export async function fetchSecFilingsForSector(sectorId: string): Promise<FilingItem[]> {
  const sector = getSectorById(sectorId);
  if (!sector?.proxyTickers?.length) {
    return [];
  }

  const tickerMap = await getTickerMap();
  if (!tickerMap.length) {
    return [];
  }

  const matches = tickerMap.filter((item) => sector.proxyTickers?.includes(item.ticker)).slice(0, 3);

  const filingGroups = await Promise.all(
    matches.map(async (match) => {
      try {
        const response = await fetch(`https://data.sec.gov/submissions/CIK${padCik(match.cik_str)}.json`, {
          headers: {
            "User-Agent": "SignalDesk/1.0 support@signaldesk.local",
            Accept: "application/json"
          },
          next: { revalidate: 0 }
        });

        if (!response.ok) {
          return [];
        }

        const data = (await response.json()) as {
          filings?: {
            recent?: {
              accessionNumber?: string[];
              filingDate?: string[];
              form?: string[];
              primaryDocument?: string[];
            };
          };
        };

        const recent = data.filings?.recent;
        if (!recent?.form?.length) {
          return [];
        }

        return recent.form
          .map((form, index) => ({
            form,
            filedAt: recent.filingDate?.[index] ?? "",
            accessionNumber: recent.accessionNumber?.[index] ?? "",
            primaryDocument: recent.primaryDocument?.[index] ?? ""
          }))
          .filter((item) => ["8-K", "10-Q", "10-K", "13D", "13G"].includes(item.form))
          .slice(0, 3)
          .map((item) => ({
            ticker: match.ticker,
            companyName: match.title,
            form: item.form,
            filedAt: item.filedAt,
            filingUrl: `https://www.sec.gov/Archives/edgar/data/${match.cik_str}/${item.accessionNumber.split("-").join("")}/${item.primaryDocument}`
          }));
      } catch {
        return [];
      }
    })
  );

  return filingGroups.flat().slice(0, 6);
}
