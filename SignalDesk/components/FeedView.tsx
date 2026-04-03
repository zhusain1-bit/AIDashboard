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
              Try: &ldquo;Infrastructure IB at Lazard&rdquo; &middot; &ldquo;Apollo
              Credit&rdquo; &middot; &ldquo;Debt Capital Markets&rdquo; &middot;
              &ldquo;Houlihan Lokey Restructuring&rdquo;
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
