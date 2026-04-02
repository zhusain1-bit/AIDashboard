import Link from "next/link";

export default async function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white p-8 shadow-soft">
        <div className="text-center">
          <div className="font-serif text-5xl tracking-tight text-gray-900">
            Signal<span className="text-[var(--green)]">Desk</span>
          </div>
          <p className="mt-4 text-lg text-gray-600">Stay interview-ready. One brief at a time.</p>
        </div>

        <Link
          href="/feed"
          className="mt-10 flex w-full items-center justify-center rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-mid)]"
        >
          Enter SignalDesk
        </Link>

        <Link
          href="/demo"
          className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-[var(--green)] hover:text-[var(--green)]"
        >
          Preview the platform
        </Link>

        <p className="mt-6 text-center text-sm text-gray-500">
          Used by finance students at top programs
        </p>
      </div>
    </main>
  );
}
