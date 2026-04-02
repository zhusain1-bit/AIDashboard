export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-24 rounded-full bg-gray-200" />
        <div className="h-4 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="h-6 w-4/5 rounded bg-gray-200" />
      <div className="mt-3 h-4 w-full rounded bg-gray-100" />
      <div className="mt-2 h-4 w-5/6 rounded bg-gray-100" />
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-24 rounded-full bg-gray-100" />
        <div className="h-7 w-20 rounded-full bg-gray-100" />
        <div className="h-7 w-28 rounded-full bg-gray-100" />
      </div>
      <div className="mt-5 h-5 w-24 rounded bg-gray-200" />
    </div>
  );
}
