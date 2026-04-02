"use client";

import { FormEvent, useState } from "react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function UpgradeModal({
  open,
  onClose,
  title = "You've hit the free limit",
  message = "Upgrade to Pro for unlimited briefs, all 8 sectors, flash cards, and a weekly digest."
}: UpgradeModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = (await response.json()) as { success?: boolean; count?: number; error?: string };

      if (!response.ok || !data.success) {
        setStatus(data.error ?? "Unable to join the waitlist.");
        return;
      }

      setStatus(`You're on the list! ${data.count ?? 0} others are waiting.`);
      setEmail("");
    } catch {
      setStatus("Unable to join the waitlist.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-soft">
        <h2 className="font-serif text-3xl text-gray-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@school.edu"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[var(--green)]"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[var(--green)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-mid)] disabled:opacity-70"
          >
            {isSubmitting ? "Joining..." : "Join the Pro waitlist"}
          </button>
        </form>

        {status ? <p className="mt-4 text-sm text-gray-600">{status}</p> : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 text-sm font-medium text-gray-500 transition hover:text-gray-800"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
