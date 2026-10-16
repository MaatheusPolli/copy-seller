import { readFileSync } from 'node:fs';
import { generateForChannels, productsFromCsv, type Product } from '@copy-seller/core';
import { llms, root, selectProfiles, usd, type CommonOptions } from '../context.js';

interface GerarOptions extends CommonOptions {
  csv?: string;
  sku?: string;
  json?: string;
  prompt: string;
  feedback?: string[];
  semJuiz?: boolean;
  maxCusto: string;
}

function loadProduct(opts: GerarOptions): Product {
  if (opts.json) return JSON.parse(readFileSync(root(opts.json), 'utf8'));
  const products = productsFromCsv(readFileSync(root(opts.csv ?? 'data/produtos-exemplo.csv'), 'utf8'));
  const product = opts.sku ? products.find((p) => p.sku === opts.sku) : products[0];
  if (!product) throw new Error(`SKU não encontrado: ${opts.sku}`);
  return product;
}

export async function gerar(opts: GerarOptions): Promise<void> {
  const product = loadProduct(opts);
  const { llm, judgeLlm } = llms(opts);
  const started = Date.now();
  const results = await generateForChannels(product, selectProfiles(opts), {
    llm,
    judgeLlm: opts.semJuiz ? undefined : judgeLlm,
    promptId: opts.prompt,
    feedback: opts.feedback,
    maxCostUsd: Number(opts.maxCusto),
  });

  for (const r of results) {
    console.log(`\n━━ ${r.channel} ━━ ${r.valid ? '✓ válida' : '✗ inválida'} · prompt ${r.promptId} · ${r.attempts} tentativa(s) · ${usd(r.costUsd)}`);
    if (r.copy) {
      console.log(`Título: ${r.copy.title}`);
      console.log(`Curta:  ${r.copy.shortDescription}`);
      console.log(`Bullets:\n${r.copy.bullets.map((b) => `  • ${b}`).join('\n')}`);
    }
    for (const f of r.fixed) console.log(`  🔧 corrigido: ${f.message}`);
    for (const i of r.issues) console.log(`  ⚠ ${i.message}`);
    if (r.error) console.log(`  ✗ ${r.error}`);
    if (r.scores) {
      console.log(`Juiz: ${r.scores.overall.toFixed(2)}/5`);
      for (const s of r.scores.scores) console.log(`  ${s.criterion}: ${s.score} — ${s.justification}`);
    }
  }
  const total = results.reduce((a, r) => a + r.costUsd, 0);
  console.log(`\nTotal ${usd(total)} em ${((Date.now() - started) / 1000).toFixed(1)} s`);
}
