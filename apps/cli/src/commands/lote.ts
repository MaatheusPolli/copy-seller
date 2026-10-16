import { readFileSync, writeFileSync } from 'node:fs';
import { entriesToCsv, productsFromCsv, runBatch } from '@copy-seller/core';
import { llms, root, selectProfiles, usd, type CommonOptions } from '../context.js';

interface LoteOptions extends CommonOptions {
  checkpoint?: string;
  prompt: string;
  juiz?: boolean;
  maxCusto: string;
  maxCustoItem: string;
  concorrencia: string;
}

export async function lote(entrada: string, saida: string, opts: LoteOptions): Promise<void> {
  const products = productsFromCsv(readFileSync(root(entrada), 'utf8'));
  const checkpointPath = root(opts.checkpoint ?? `${saida}.checkpoint.jsonl`);
  const { llm, judgeLlm } = llms(opts);

  // Ctrl+C: termina os itens em andamento e sai; a próxima execução retoma do checkpoint
  const controller = new AbortController();
  process.once('SIGINT', () => {
    console.log('\nInterrompendo após os itens em andamento…');
    controller.abort();
  });

  const summary = await runBatch(products, selectProfiles(opts), {
    llm,
    judgeLlm: opts.juiz ? judgeLlm : undefined,
    promptId: opts.prompt,
    checkpointPath,
    maxTotalCostUsd: Number(opts.maxCusto),
    maxCostUsd: Number(opts.maxCustoItem),
    concurrency: Number(opts.concorrencia),
    signal: controller.signal,
    onProgress: ({ done, total, costUsd, last }) =>
      console.log(`[${done}/${total}] ${last.sku} ${last.channel} ${last.valid ? '✓' : '✗'} · acumulado ${usd(costUsd)}`),
  });

  writeFileSync(root(saida), entriesToCsv(summary.entries));
  console.log(
    `\n${summary.generated} gerados, ${summary.skipped} retomados do checkpoint, ${summary.valid}/${summary.entries.length} válidos · ${usd(summary.costUsd)}`,
  );
  if (summary.stoppedReason === 'cost_limit') console.log('⚠ Parou no teto de custo. Aumente --max-custo e rode de novo para continuar.');
  if (summary.stoppedReason === 'aborted') console.log('⚠ Interrompido. Rode o mesmo comando para retomar.');
  console.log(`Saída: ${saida} · checkpoint: ${checkpointPath}`);
}
