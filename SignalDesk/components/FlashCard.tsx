"use client";

import { useState } from "react";

interface FlashCardProps {
  question: string;
  answer: string;
}

export default function FlashCard({ question, answer }: FlashCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setRevealed((current) => !current)}
      className="w-full rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-[var(--green)] hover:shadow-soft"
    >
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--green)]">Question</div>
      <h3 className="mt-2 font-serif text-xl text-gray-900">{question}</h3>

      <div className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
        Answer
      </div>
      <p className={`mt-2 text-sm leading-6 text-gray-700 transition ${revealed ? "" : "blur-sm"}`}>
        {answer}
      </p>
      <p className="mt-3 text-xs text-gray-500">{revealed ? "Click to hide" : "Click to reveal"}</p>
    </button>
  );
}
