"use client";

import { useMemo, useState } from "react";
import BriefCard from "@/components/BriefCard";
import FlashCard from "@/components/FlashCard";
import SectorPills from "@/components/SectorPills";
import { MOCK_ARTICLES } from "@/lib/newsapi";
import { SECTORS, getSectorById } from "@/lib/sectors";
import { BriefApiItem } from "@/types/signaldesk";

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildDemoBriefs(): Record<string, BriefApiItem[]> {
  return Object.fromEntries(
    SECTORS.map((sector) => {
      const articles = MOCK_ARTICLES[sector.id] ?? [];
      const briefs = articles.map((article, index) => {
        const titleSeed = article.title.replace(/[^\w\s]/g, "").split(" ").slice(0, 4).join(" ");
        const talkingPoints = sector.keywords.slice(0, 3).map((item) => toTitleCase(item));

        return {
          id: `${sector.id}-${index + 1}`,
          articleUrl: article.url,
          articleTitle: article.title,
          sector: sector.label,
          headline: `${titleSeed} outlook`,
          deck: `${article.description} The interview angle is understanding who gains pricing power, where financing tightens or loosens, and what that means for transaction activity.`,
          talkingPoints,
          interviewAngle: `Say the headline matters because it changes underwriting assumptions in ${sector.label}, especially around capital availability, valuation discipline, and execution risk.`,
          flashCards: [
            {
              question: `What matters most here in ${sector.label}?`,
              answer:
                "Start with the market catalyst, then tie it to how buyers, lenders, or issuers will reprice risk. A strong answer shows how the development changes valuation, leverage, or execution decisions."
            },
            {
              question: "How would an MD want this framed?",
              answer:
                "Keep it commercial and decision-oriented. Explain what changed, why it matters now, and which participants are likely to benefit or get pressured if the trend persists."
            }
          ],
          publishedAt: article.publishedAt,
          createdAt: new Date(article.publishedAt).toISOString()
        };
      });

      return [sector.id, briefs];
    })
  );
}

const DEMO_BRIEFS = buildDemoBriefs();

export default function DemoView() {
  const [activeSectorId, setActiveSectorId] = useState(SECTORS[0].id);
  const activeSector = getSectorById(activeSectorId) ?? SECTORS[0];
  const briefs = DEMO_BRIEFS[activeSectorId] ?? [];
  const featuredBrief = briefs[0];

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <div className="font-serif text-3xl tracking-tight text-gray-900">
              Signal<span className="text-[var(--green)]">Desk</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Public demo with mock data</p>
          </div>

          <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
            1 of 3 briefs used
          </div>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(225,245,238,0.95),_rgba(255,255,255,0.98)_58%)] p-6 shadow-soft sm:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--green)]">Live preview</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-gray-900 sm:text-5xl">
            {greeting} Alex - here&apos;s what moved in {activeSector.label} this week.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            This demo uses built-in mock articles and generated sample briefs so you can evaluate the product before adding production credentials.
          </p>
        </div>

        <div className="mt-8">
          <SectorPills sectors={SECTORS} activeSectorId={activeSectorId} onSelect={setActiveSectorId} />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-5">
            {briefs.map((brief) => (
              <BriefCard
                key={brief.id}
                brief={brief}
                href="#demo-detail"
                ctaLabel="Preview brief →"
                onClick={() => undefined}
              />
            ))}
          </div>

          {featuredBrief ? (
            <div id="demo-detail" className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-soft">
              <span className="rounded-full bg-[var(--green-light)] px-3 py-1 text-xs font-medium text-[var(--green)]">
                {featuredBrief.sector}
              </span>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-gray-900">
                {featuredBrief.headline}
              </h2>
              <p className="mt-4 text-sm leading-6 text-gray-600">{featuredBrief.deck}</p>

              <div className="mt-6 rounded-xl border-l-4 border-[var(--green)] bg-[var(--green-light)] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--green)]">
                  What to say in the interview
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-700">{featuredBrief.interviewAngle}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {featuredBrief.talkingPoints.map((point) => (
                  <span
                    key={point}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                  >
                    {point}
                  </span>
                ))}
              </div>

              <div className="my-8 h-px bg-gray-200" />

              <h3 className="font-serif text-2xl text-gray-900">Flash Cards</h3>
              <div className="mt-4 grid gap-4">
                {featuredBrief.flashCards.map((card) => (
                  <FlashCard key={card.question} question={card.question} answer={card.answer} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
