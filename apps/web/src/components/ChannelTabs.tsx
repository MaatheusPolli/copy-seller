import type { GenerationResult } from '@copy-seller/core';

export function ChannelTabs({
  results,
  active,
  onSelect,
}: {
  results: GenerationResult[];
  active: string;
  onSelect: (channel: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-stone-200">
      {results.map((r) => (
        <button
          key={r.channel}
          role="tab"
          aria-selected={r.channel === active}
          onClick={() => onSelect(r.channel)}
          className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
            r.channel === active ? 'border-amber-600 font-medium text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${r.valid ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden />
          {r.channel}
          {r.scores && <span className="text-xs text-stone-400">{r.scores.overall.toFixed(1)}</span>}
        </button>
      ))}
    </div>
  );
}
