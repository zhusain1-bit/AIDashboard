import { getSectorById } from "@/lib/sectors";
import { MacroSnapshot } from "@/types/signaldesk";

function formatValue(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return Math.abs(numeric) >= 1000 ? numeric.toFixed(0) : numeric.toFixed(2);
}

function formatChange(current: string, previous: string | undefined) {
  const currentNumeric = Number(current);
  const previousNumeric = Number(previous);

  if (!Number.isFinite(currentNumeric) || !Number.isFinite(previousNumeric)) {
    return undefined;
  }

  const delta = currentNumeric - previousNumeric;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}`;
}

export async function fetchMacroContextForSector(sectorId: string): Promise<MacroSnapshot[]> {
  const apiKey = process.env.FRED_API_KEY;
  const sector = getSectorById(sectorId);

  if (!apiKey || !sector?.macroSeries?.length) {
    return [];
  }

  const snapshots = await Promise.all(
    sector.macroSeries.map(async (series) => {
      try {
        const url = new URL("https://api.stlouisfed.org/fred/series/observations");
        url.searchParams.set("series_id", series.id);
        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("file_type", "json");
        url.searchParams.set("sort_order", "desc");
        url.searchParams.set("limit", "2");

        const response = await fetch(url.toString(), { next: { revalidate: 0 } });
        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as {
          observations?: Array<{
            date?: string;
            value?: string;
          }>;
        };

        const [latest, previous] = data.observations ?? [];
        if (!latest?.value || latest.value === ".") {
          return null;
        }

        return {
          seriesId: series.id,
          label: series.label,
          value: formatValue(latest.value),
          date: latest.date ?? "",
          change: formatChange(latest.value, previous?.value)
        } satisfies MacroSnapshot;
      } catch {
        return null;
      }
    })
  );

  return snapshots.filter((item): item is NonNullable<typeof item> => item !== null);
}
