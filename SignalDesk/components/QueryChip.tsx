interface QueryChipProps {
  query: string;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
}

export default function QueryChip({ query, onSelect, onRemove }: QueryChipProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm">
      <button
        type="button"
        onClick={() => onSelect(query)}
        className="max-w-[160px] truncate transition hover:text-gray-900"
      >
        {query}
      </button>
      <button
        type="button"
        onClick={() => onRemove(query)}
        aria-label={`Remove ${query}`}
        className="ml-1.5 text-gray-400 transition hover:text-gray-700"
      >
        ×
      </button>
    </div>
  );
}
