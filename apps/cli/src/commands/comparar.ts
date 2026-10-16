import { writeFileSync } from 'node:fs';
import { compareVariants, renderAbReport } from '@copy-seller/core';
import { llms, readDataset, root, selectProfiles, usd, type CommonOptions } from '../context.js';

interface CompararOptions extends CommonOptions {
  a: string;
  b: string;
  dataset: string;
  saida?: string;
}

export async function comparar(opts: CompararOptions): Promise<void> {
  const products = readDataset(opts.dataset).map((d) => d.product);
  const { items, summary } = await compareVariants(products, selectProfiles(opts), {
    ...llms(opts),
    promptA: opts.a,
    promptB: opts.b,
    onItem: (i) => console.log(`${i.sku} ${i.channel}: ${i.winner}${i.positionBias ? ' (viés de posição)' : ''}`),
  });
  const saida = opts.saida ?? `report/ab-${opts.a}-vs-${opts.b}.md`;
  writeFileSync(root(saida), renderAbReport(summary, items));
  console.log(`\n${summary.winner === 'inconclusivo' ? 'Inconclusivo' : `Vencedor: ${summary.winner === 'A' ? opts.a : opts.b}`} · p=${summary.pValue.toFixed(4)} · d=${summary.cohenD.toFixed(2)} · ${usd(summary.costUsd)}`);
  console.log(`Relatório: ${saida}`);
}
