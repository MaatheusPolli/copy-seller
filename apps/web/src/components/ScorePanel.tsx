import type { JudgeResult } from '@copy-seller/core';

export function ScorePanel({ scores }: { scores?: JudgeResult }) {
  if (!scores) {
    return <p className="text-sm text-stone-500">Sem nota: o juiz só avalia copy que passou na validação.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums">{scores.overall.toFixed(2)}</span>
        <span className="text-sm text-stone-400">/ 5 · média ponderada</span>
      </p>
      {scores.scores.map((s) => (
        <div key={s.criterion}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{s.criterion.replace('_', ' ')}</span>
            <span className="tabular-nums">{s.score}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-stone-200">
            <div className="h-1.5 rounded-full bg-amber-600" style={{ width: `${(s.score / 5) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-stone-500">{s.justification}</p>
        </div>
      ))}
    </div>
  );
}
