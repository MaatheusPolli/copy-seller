import type { Product } from '../domain/product.js';
import { generate, type GenerateOptions } from '../generate/generator.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { Checkpoint, type CheckpointEntry } from './checkpoint.js';
import { toCsv } from './csv.js';

export interface BatchOptions extends GenerateOptions {
  checkpointPath: string;
  /** teto de custo do lote inteiro, incluindo o já gasto em execuções anteriores */
  maxTotalCostUsd?: number;
  concurrency?: number;
  onProgress?: (p: { done: number; total: number; skipped: number; costUsd: number; last: CheckpointEntry }) => void;
  /** para testes de interrupção */
  signal?: AbortSignal;
}

export interface BatchSummary {
  total: number;
  generated: number;
  skipped: number;
  valid: number;
  costUsd: number;
  stoppedReason?: 'cost_limit' | 'aborted';
  entries: CheckpointEntry[];
}

export async function runBatch(
  products: Product[],
  profiles: ChannelProfile[],
  { checkpointPath, maxTotalCostUsd = Infinity, concurrency = 4, onProgress, signal, ...genOptions }: BatchOptions,
): Promise<BatchSummary> {
  const checkpoint = new Checkpoint(checkpointPath);
  const tasks = products.flatMap((product) => profiles.map((profile) => ({ product, profile })));
  const pending = tasks.filter((t) => !checkpoint.has(t.product.sku, t.profile.id));
  const summary: BatchSummary = {
    total: tasks.length,
    generated: 0,
    skipped: tasks.length - pending.length,
    valid: 0,
    costUsd: checkpoint.totalCost(),
    entries: [],
  };

  let next = 0;
  const worker = async () => {
    while (next < pending.length) {
      if (signal?.aborted) {
        summary.stoppedReason = 'aborted';
        return;
      }
      if (summary.costUsd >= maxTotalCostUsd) {
        summary.stoppedReason = 'cost_limit';
        return;
      }
      const { product, profile } = pending[next++]!;
      const result = await generate(product, profile, genOptions);
      const entry: CheckpointEntry = { ...result, sku: product.sku, finishedAt: new Date().toISOString() };
      checkpoint.append(entry);
      summary.generated++;
      summary.costUsd += result.costUsd;
      onProgress?.({
        done: summary.skipped + summary.generated,
        total: tasks.length,
        skipped: summary.skipped,
        costUsd: summary.costUsd,
        last: entry,
      });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  summary.entries = checkpoint.all();
  summary.valid = summary.entries.filter((e) => e.valid).length;
  return summary;
}

export const OUTPUT_HEADER = [
  'sku',
  'canal',
  'prompt_id',
  'valido',
  'titulo',
  'descricao_curta',
  'descricao_longa',
  'bullets',
  'issues',
  'nota_juiz',
  'tentativas',
  'custo_usd',
];

export function entriesToCsv(entries: CheckpointEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.sku.localeCompare(b.sku) || a.channel.localeCompare(b.channel));
  return toCsv(
    OUTPUT_HEADER,
    sorted.map((e) => [
      e.sku,
      e.channel,
      e.promptId,
      e.valid ? 'sim' : 'não',
      e.copy?.title,
      e.copy?.shortDescription,
      e.copy?.longDescription,
      e.copy?.bullets.join(' | '),
      e.issues.map((i) => i.message).join(' | ') || e.error,
      e.scores?.overall,
      e.attempts,
      e.costUsd.toFixed(5),
    ]),
  );
}
