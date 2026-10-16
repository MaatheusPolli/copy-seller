import { writeFileSync } from 'node:fs';
import { RUBRIC, generate, mean, type GenerationResult } from '@copy-seller/core';
import { llms, readDataset, root, selectProfiles, usd, type CommonOptions } from '../context.js';

interface AvaliarOptions extends CommonOptions {
  dataset: string;
  prompt: string;
  saida: string;
}

/** Avalia uma versão de prompt sobre o dataset: taxa de validade, notas do juiz e custo. */
export async function avaliar(opts: AvaliarOptions): Promise<void> {
  const dataset = readDataset(opts.dataset);
  const profiles = selectProfiles(opts);
  const { llm, judgeLlm } = llms(opts);
  const results: (GenerationResult & { sku: string })[] = [];
  for (const { product } of dataset) {
    for (const profile of profiles) {
      const r = await generate(product, profile, { llm, judgeLlm, promptId: opts.prompt });
      results.push({ ...r, sku: product.sku });
      console.log(`${product.sku} ${profile.id} ${r.valid ? '✓' : '✗'} ${r.scores?.overall.toFixed(2) ?? '—'}`);
    }
  }
  const judged = results.filter((r) => r.scores);
  const cost = results.reduce((a, r) => a + r.costUsd, 0);
  const md = `# Avaliação do prompt ${opts.prompt}

- Itens: ${results.length} (${dataset.length} produtos × ${profiles.length} canais)
- Válidas: ${results.filter((r) => r.valid).length}/${results.length}
- Tentativas médias: ${mean(results.map((r) => r.attempts)).toFixed(2)}
- Nota média do juiz: ${mean(judged.map((r) => r.scores!.overall)).toFixed(2)}
- Custo total: ${usd(cost)} · por item: ${usd(cost / Math.max(1, results.length))}

| Critério | Média |
|---|---|
${RUBRIC.map((c) => `| ${c.id} | ${mean(judged.map((r) => r.scores!.scores.find((s) => s.criterion === c.id)!.score)).toFixed(2)} |`).join('\n')}

## Problemas mais frequentes

${Object.entries(
  results.flatMap((r) => r.issues.map((i) => i.code)).reduce<Record<string, number>>((acc, c) => ({ ...acc, [c]: (acc[c] ?? 0) + 1 }), {}),
)
  .sort((a, b) => b[1] - a[1])
  .map(([code, n]) => `- ${code}: ${n}`)
  .join('\n') || '- nenhum'}
`;
  writeFileSync(root(opts.saida), md);
  console.log(`\nRelatório: ${opts.saida}`);
}
