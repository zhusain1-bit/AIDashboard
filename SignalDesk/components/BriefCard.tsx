import Link from "next/link";
import { Route } from "next";
import { formatDistanceToNow } from "date-fns";
import { BriefApiItem } from "@/types/signaldesk";

interface BriefCardProps {
  brief: BriefApiItem;
  href?: string;
  ctaLabel?: string;
  onClick?: () => void;
}

export default function BriefCard({
  brief,
  href = `/brief/${brief.id}`,
  ctaLabel = "Read brief →",
  onClick
}: BriefCardProps) {
  const isHashLink = href.startsWith("#");

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[var(--green-light)] px-3 py-1 text-xs font-medium text-[var(--green)]">
          {brief.sector}
        </span>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(brief.publishedAt), { addSuffix: true })}
        </span>
      </div>

      <h2 className="font-serif text-[18px] leading-tight text-gray-900">{brief.headline}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-600">{brief.deck}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {brief.talkingPoints.map((point) => (
          <span
            key={point}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
          >
            {point}
          </span>
        ))}
      </div>

      {isHashLink ? (
        <a
          href={href}
          onClick={onClick}
          className="mt-5 inline-flex items-center text-sm font-medium text-[var(--green)] transition hover:text-[var(--green-mid)]"
        >
          {ctaLabel}
        </a>
      ) : (
        <Link
          href={href as Route}
          onClick={onClick}
          className="mt-5 inline-flex items-center text-sm font-medium text-[var(--green)] transition hover:text-[var(--green-mid)]"
        >
          {ctaLabel}
        </Link>
      )}
    </article>
  );
}
