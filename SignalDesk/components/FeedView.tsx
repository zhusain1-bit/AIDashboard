"use client";

import { useEffect, useMemo, useState } from "react";
import BriefCard from "@/components/BriefCard";
import SectorPills from "@/components/SectorPills";
import SkeletonCard from "@/components/SkeletonCard";
import UpgradeModal from "@/components/UpgradeModal";
import { SECTORS, getSectorById } from "@/lib/sectors";
import { BriefApiItem } from "@/types/signaldesk";

interface FeedViewProps {
  firstName: string;
  userInitials: string;
  initialSectors: string[];
  isPro: boolean;
  initialBriefsToday: number;
}

interface UserPayload {
  isPro: boolean;
  sectors: string[];
  briefsToday: number;
  dailyLimit: number | null;
}

export default function FeedView({
  firstName,
  userInitials,
  initialSectors,
  isPro: initialIsPro,
  initialBriefsToday
}: FeedViewProps) {
  const [briefs, setBriefs] = useState<BriefApiItem[]>([]);
  const [activeSectorId, setActiveSectorId] = useState(initialSectors[0] ?? SECTORS[0].id);
  const [loading, setLoading] = useState(true);
  const [isTruncated, setIsTruncated] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | undefined>(undefined);
  const [isPro, setIsPro] = useState(initialIsPro);
  const [briefsToday, setBriefsToday] = useState(initialBriefsToday);
  const [availableSectors, setAvailableSectors] = useState(
    SECTORS.filter((sector) => initialSectors.includes(sector.id))
  );
  const [savingSectors, setSavingSectors] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const activeSector = getSectorById(activeSectorId) ?? SECTORS[0];

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/user");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as UserPayload;
        if (!isMounted) {
          return;
        }

        setIsPro(data.isPro);
        setBriefsToday(data.briefsToday);
        const sectors = data.sectors.length > 0 ? data.sectors : [SECTORS[0].id];
        setAvailableSectors(SECTORS.filter((sector) => sectors.includes(sector.id)));
        setActiveSectorId((current) => (sectors.includes(current) ? current : sectors[0]));
      } catch {
        return;
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBriefs() {
      setLoading(true);
      try {
        const response = await fetch(`/api/briefs?sector=${activeSectorId}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          if (isMounted) {
            setBriefs([]);
          }
          return;
        }

        const data = (await response.json()) as {
          briefs: BriefApiItem[];
          isTruncated: boolean;
          briefsToday?: number;
        };

        if (!isMounted) {
          return;
        }

        setBriefs(data.briefs);
        setIsTruncated(data.isTruncated);
        if (typeof data.briefsToday === "number") {
          setBriefsToday(data.briefsToday);
        }
        if (data.isTruncated) {
          setUpgradeOpen(true);
          setUpgradeMessage(undefined);
        }
      } catch {
        if (isMounted) {
          setBriefs([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBriefs();

    return () => {
      isMounted = false;
    };
  }, [activeSectorId]);

  function handleSelectSector(sectorId: string) {
    setActiveSectorId(sectorId);
  }

  function handleUpgradeFromSectorLimit() {
    setUpgradeMessage("Upgrade to Pro to unlock more than 2 sectors, unlimited briefs, flash cards, and a weekly digest.");
    setUpgradeOpen(true);
  }

  async function handleToggleTrackedSector(sectorId: string) {
    const currentIds = availableSectors.map((sector) => sector.id);
    const exists = currentIds.includes(sectorId);
    const nextIds = exists ? currentIds.filter((id) => id !== sectorId) : [...currentIds, sectorId];

    if (nextIds.length === 0) {
      return;
    }

    setSavingSectors(true);

    try {
      const response = await fetch("/api/user/sectors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sectors: nextIds })
      });

      const data = (await response.json()) as { sectors?: string[]; error?: string; message?: string };

      if (response.status === 403 && data.error === "upgrade") {
        setUpgradeMessage(data.message);
        setUpgradeOpen(true);
        return;
      }

      if (!response.ok || !data.sectors) {
        return;
      }

      const nextSectors = SECTORS.filter((sector) => data.sectors?.includes(sector.id));
      setAvailableSectors(nextSectors);
      if (!nextSectors.some((sector) => sector.id === activeSectorId)) {
        setActiveSectorId(nextSectors[0]?.id ?? SECTORS[0].id);
      }
    } catch {
      return;
    } finally {
      setSavingSectors(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-serif text-3xl tracking-tight text-gray-900">
                Signal<span className="text-[var(--green)]">Desk</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Finance interview prep, built for repetition.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isPro ? (
              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
                {Math.min(briefsToday, 3)} of 3 briefs used
              </div>
            ) : null}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--green)] text-sm font-medium uppercase text-white">
              {userInitials}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(225,245,238,0.95),_rgba(255,255,255,0.98)_58%)] p-6 shadow-soft sm:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--green)]">Weekly signal</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-gray-900 sm:text-5xl">
            {greeting} {firstName} - here&apos;s what moved in {activeSector.label} this week.
          </h1>
        </div>

        <div className="mt-8">
          <SectorPills sectors={availableSectors} activeSectorId={activeSectorId} onSelect={handleSelectSector} />
          {!isPro && availableSectors.length <= 2 ? (
            <button
              type="button"
              onClick={handleUpgradeFromSectorLimit}
              className="mt-3 text-sm font-medium text-[var(--green)] transition hover:text-[var(--green-mid)]"
            >
              Want more sectors? Unlock all 8.
            </button>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Tracked sectors</p>
              <p className="mt-1 text-sm text-gray-500">
                Free users can track up to 2 sectors. Pro unlocks all 8.
              </p>
            </div>
            <span className="text-xs text-gray-400">{savingSectors ? "Saving..." : ""}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SECTORS.map((sector) => {
              const selected = availableSectors.some((item) => item.id === sector.id);
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => handleToggleTrackedSector(sector.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-[#0F6E56] bg-[#0F6E56] text-[#E1F5EE]"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-[var(--green)] hover:text-[var(--green)]"
                  }`}
                >
                  {sector.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-5">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
            : briefs.map((brief) => <BriefCard key={brief.id} brief={brief} />)}
        </div>

        {!loading && briefs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-600">
            No briefs were available for this sector. Try another sector or refresh shortly.
          </div>
        ) : null}
      </div>

      <UpgradeModal
        open={upgradeOpen || isTruncated}
        onClose={() => {
          setUpgradeOpen(false);
          setIsTruncated(false);
        }}
        message={upgradeMessage}
      />
    </>
  );
}
