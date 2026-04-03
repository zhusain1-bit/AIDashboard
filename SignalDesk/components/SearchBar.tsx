"use client";

import { useEffect, useRef, useState } from "react";

const PLACEHOLDERS = [
  "Infrastructure Investment Banking...",
  "Lazard M&A...",
  "Apollo Credit...",
  "Debt Capital Markets...",
  "Houlihan Lokey Restructuring..."
];

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative flex items-center">
        <svg
          className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-28 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[var(--green)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 transition"
        />
        <button
          type="submit"
          className="absolute right-3 rounded-xl bg-[var(--green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--green-mid)]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
