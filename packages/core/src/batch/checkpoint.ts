import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import type { GenerationResult } from '../generate/generator.js';

export interface CheckpointEntry extends GenerationResult {
  sku: string;
  finishedAt: string;
}

export const entryKey = (sku: string, channel: string) => `${sku}|${channel}`;

/**
 * Checkpoint em JSONL: uma linha por item concluído, gravada com append.
 * Uma linha truncada por interrupção no meio da escrita é descartada.
 */
export class Checkpoint {
  private readonly entries = new Map<string, CheckpointEntry>();

  constructor(private readonly path: string) {
    if (!existsSync(path)) return;
    const text = readFileSync(path, 'utf8');
    // fecha uma linha parcial para que o próximo append não se cole nela
    if (text && !text.endsWith('\n')) appendFileSync(path, '\n');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as CheckpointEntry;
        this.entries.set(entryKey(entry.sku, entry.channel), entry);
      } catch {
        // linha parcial de uma escrita interrompida
      }
    }
  }

  has(sku: string, channel: string): boolean {
    return this.entries.has(entryKey(sku, channel));
  }

  append(entry: CheckpointEntry): void {
    appendFileSync(this.path, JSON.stringify(entry) + '\n');
    this.entries.set(entryKey(entry.sku, entry.channel), entry);
  }

  all(): CheckpointEntry[] {
    return [...this.entries.values()];
  }

  totalCost(): number {
    return this.all().reduce((acc, e) => acc + e.costUsd, 0);
  }
}
