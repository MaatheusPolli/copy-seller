import type { Issue } from '@copy-seller/core';

export function IssueList({ issues, fixed, error }: { issues: Issue[]; fixed: Issue[]; error?: string }) {
  if (!issues.length && !fixed.length && !error) {
    return <p className="text-sm text-emerald-700">✓ Passou em todas as regras do canal.</p>;
  }
  return (
    <ul className="space-y-1.5 text-sm">
      {error && <li className="text-red-700">✗ {error}</li>}
      {issues.map((i, k) => (
        <li key={`i${k}`} className="text-red-700">
          ✗ {i.message}
        </li>
      ))}
      {fixed.map((i, k) => (
        <li key={`f${k}`} className="text-stone-500">
          🔧 Corrigido automaticamente: {i.message}
        </li>
      ))}
    </ul>
  );
}
