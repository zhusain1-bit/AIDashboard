import Link from "next/link";
import { notFound } from "next/navigation";
import FlashCard from "@/components/FlashCard";
import { getBriefById } from "@/lib/briefs";
import { fetchMacroContextForSector } from "@/lib/fred";
import { fetchFmpFilingsForSector, fetchFmpTranscriptsForSector } from "@/lib/fmp";
import { getSectorByLabel } from "@/lib/sectors";
import { fetchSecFilingsForSector } from "@/lib/sec";

function getSourceLabel(articleUrl: string) {
  try {
    const hostname = new URL(articleUrl).hostname.replace("www.", "");
    if (hostname === "signaldesk.mock") {
      return "SignalDesk Mock Wire";
    }

    return hostname
      .split(".")
      .slice(0, -1)
      .join(".")
      .replace(/[-_]/g, " ");
  } catch {
    return "Source";
  }
}

export default async function BriefDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = await getBriefById(id);

  if (!brief) {
    notFound();
  }

  const sourceLabel = getSourceLabel(brief.articleUrl);
  const sector = getSectorByLabel(brief.sector);
  const sectorId = sector?.id;
  const [macroContext, secFilings, fmpFilings, transcripts] = sectorId
    ? await Promise.all([
        fetchMacroContextForSector(sectorId),
        fetchSecFilingsForSector(sectorId),
        fetchFmpFilingsForSector(sectorId),
        fetchFmpTranscriptsForSector(sectorId)
      ])
    : [[], [], [], []];
  const combinedFilings = [...secFilings, ...fmpFilings].slice(0, 6);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/feed" className="text-sm font-medium text-[var(--green)]">
          ← Back to feed
        </Link>

        <div className="mt-6 rounded-[28px] border border-gray-200 bg-white p-6 shadow-soft sm:p-8">
          <span className="rounded-full bg-[var(--green-light)] px-3 py-1 text-xs font-medium text-[var(--green)]">
            {brief.sector}
          </span>
          <h1 className="mt-5 font-serif text-4xl leading-tight text-gray-900 sm:text-5xl">
            {brief.headline}
          </h1>
          <a
            href={brief.articleUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm text-gray-500 transition hover:text-[var(--green)]"
          >
            Via {sourceLabel} ↗
          </a>

          <div className="mt-8 rounded-xl border-l-4 border-[var(--green)] bg-[var(--green-light)] p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--green)]">
              What to say in the interview
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-700">{brief.interviewAngle}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {brief.talkingPoints.map((point) => (
              <span
                key={point}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
              >
                {point}
              </span>
            ))}
          </div>

          <div className="my-8 h-px bg-gray-200" />

          <div>
            <h2 className="font-serif text-3xl text-gray-900">Flash Cards</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {brief.flashCards.map((card) => (
                <FlashCard key={card.question} question={card.question} answer={card.answer} />
              ))}
            </div>
          </div>

          {macroContext.length > 0 ? (
            <>
              <div className="my-8 h-px bg-gray-200" />
              <div>
                <h2 className="font-serif text-3xl text-gray-900">Macro Watch</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {macroContext.map((item) => (
                    <div key={item.seriesId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">{item.label}</p>
                      <p className="mt-2 font-serif text-3xl text-gray-900">{item.value}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {item.change ? `${item.change} vs prior` : item.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {combinedFilings.length > 0 ? (
            <>
              <div className="my-8 h-px bg-gray-200" />
              <div>
                <h2 className="font-serif text-3xl text-gray-900">Recent Filings</h2>
                <div className="mt-5 grid gap-3">
                  {combinedFilings.map((filing) => (
                    <a
                      key={`${filing.ticker}-${filing.form}-${filing.filingUrl}`}
                      href={filing.filingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[var(--green)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900">
                          {filing.companyName} ({filing.ticker})
                        </p>
                        <span className="rounded-full bg-[var(--green-light)] px-3 py-1 text-xs font-medium text-[var(--green)]">
                          {filing.form}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">Filed {filing.filedAt}</p>
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {transcripts.length > 0 ? (
            <>
              <div className="my-8 h-px bg-gray-200" />
              <div>
                <h2 className="font-serif text-3xl text-gray-900">Transcript Watch</h2>
                <div className="mt-5 grid gap-3">
                  {transcripts.map((item) => (
                    <a
                      key={`${item.symbol}-${item.date}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[var(--green)]"
                    >
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="mt-2 text-sm text-gray-600">
                        {item.symbol} · {item.date.slice(0, 10)}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
