import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Checkpoint,
  entriesToCsv,
  parseCsv,
  productsFromCsv,
  runBatch,
  toCsv,
  type LlmRequest,
  type LlmResponse,
  type Product,
} from '@copy-seller/core';
import { copy, profile } from '../fixtures/domain';
import { usage } from '../fixtures/fake-llm';

/** LLM que sempre devolve copy válida para o SKU pedido e conta chamadas */
class EchoLlm {
  calls: string[] = [];
  async callTool(req: LlmRequest): Promise<LlmResponse> {
    const sku = /SKU: (\S+)/.exec(req.user)![1]!;
    this.calls.push(sku);
    return { model: 'claude-opus-5', input: copy, usage };
  }
}

const products: Product[] = Array.from({ length: 10 }, (_, i) => ({
  sku: `MOC-${String(i).padStart(3, '0')}`,
  category: 'Mochila',
  attributes: { marca: 'Trilha', modelo: 'Explorer 30L', cor: 'Preta', impermeavel: true },
}));

let checkpointPath: string;
beforeEach(() => {
  checkpointPath = join(mkdtempSync(join(tmpdir(), 'copyseller-')), 'lote.checkpoint.jsonl');
});

describe('batch', () => {
  it('interrupção no meio e retomada não regera itens concluídos', async () => {
    const controller = new AbortController();
    const first = new EchoLlm();
    const partial = await runBatch(products, [profile], {
      llm: first,
      checkpointPath,
      concurrency: 1,
      signal: controller.signal,
      onProgress: ({ done }) => done === 4 && controller.abort(),
    });
    expect(partial).toMatchObject({ generated: 4, stoppedReason: 'aborted' });

    // simula escrita cortada no meio da linha
    appendFileSync(checkpointPath, '{"sku":"MOC-00');

    const second = new EchoLlm();
    const resumed = await runBatch(products, [profile], { llm: second, checkpointPath, concurrency: 3 });
    expect(resumed.skipped).toBe(4);
    expect(resumed.generated).toBe(6);
    expect(second.calls.some((sku) => first.calls.includes(sku))).toBe(false);
    expect(new Set([...first.calls, ...second.calls]).size).toBe(10);
    expect(resumed.entries).toHaveLength(10);
    expect(resumed.valid).toBe(10);
    expect(resumed.costUsd).toBeCloseTo(partial.costUsd * 2.5);

    const third = new EchoLlm();
    const noop = await runBatch(products, [profile], { llm: third, checkpointPath });
    expect(third.calls).toEqual([]);
    expect(noop.skipped).toBe(10);
  });

  it('para no teto de custo acumulado', async () => {
    const llm = new EchoLlm();
    const s = await runBatch(products, [profile], { llm, checkpointPath, concurrency: 1, maxTotalCostUsd: 0.025 });
    expect(s.stoppedReason).toBe('cost_limit');
    expect(s.generated).toBe(3);
    const again = await runBatch(products, [profile], { llm, checkpointPath, maxTotalCostUsd: 0.025 });
    expect(again.generated).toBe(0);
  });

  it('checkpoint persiste e soma custo', () => {
    const cp = new Checkpoint(checkpointPath);
    expect(cp.all()).toEqual([]);
    const entry = {
      sku: 'A', channel: 'amazon', promptId: 'v3', copy, issues: [], fixed: [], valid: true,
      attempts: 1, usage, costUsd: 0.5, finishedAt: 'x',
    };
    cp.append(entry);
    appendFileSync(checkpointPath, '\n');
    const reloaded = new Checkpoint(checkpointPath);
    expect(reloaded.has('A', 'amazon')).toBe(true);
    expect(reloaded.totalCost()).toBe(0.5);
  });

  it('CSV de saída', async () => {
    await runBatch(products.slice(0, 2), [profile], { llm: new EchoLlm(), checkpointPath });
    const csv = entriesToCsv(new Checkpoint(checkpointPath).all());
    const rows = parseCsv(csv);
    expect(rows[0]![0]).toBe('sku');
    expect(rows).toHaveLength(3);
    expect(rows[1]![3]).toBe('sim');
    const invalid = entriesToCsv([
      { sku: 'B', channel: 'x', promptId: 'v1', copy: null, issues: [], fixed: [], valid: false, attempts: 3, usage, costUsd: 0, error: 'falhou', finishedAt: '' },
      { sku: 'A', channel: 'x', promptId: 'v1', copy: null, issues: [{ code: 'forbidden_term', field: 'title', message: 'm1', severity: 'error', fixable: false }], fixed: [], valid: false, attempts: 3, usage, costUsd: 0, finishedAt: '' },
    ]);
    const r = parseCsv(invalid);
    expect(r[1]![0]).toBe('A');
    expect(r[1]![8]).toBe('m1');
    expect(r[2]![8]).toBe('falhou');
  });
});

describe('csv', () => {
  it('parser lida com aspas, vírgulas, quebras e BOM', () => {
    const text = '﻿a,b\r\n"x, y","linha1\nlinha2"\n"com ""aspas""",\n\n';
    expect(parseCsv(text)).toEqual([['a', 'b'], ['x, y', 'linha1\nlinha2'], ['com "aspas"', '']]);
    expect(parseCsv('a,b')).toEqual([['a', 'b']]);
  });

  it('ida e volta', () => {
    const csv = toCsv(['h'], [['a,"b"'], [null], [undefined], [1]]);
    expect(parseCsv(csv).slice(1).map((r) => r[0])).toEqual(['a,"b"', '1']);
  });

  it('produtos a partir do CSV', () => {
    const products = productsFromCsv(
      'sku,categoria,marca,impermeavel,bivolt,cor\nP1,Mochila,Trilha,sim,não,\n',
    );
    expect(products).toEqual([
      { sku: 'P1', category: 'Mochila', attributes: { marca: 'Trilha', impermeavel: true, bivolt: false } },
    ]);
    expect(productsFromCsv('')).toEqual([]);
    expect(() => productsFromCsv('nome\nx')).toThrow(/sku/);
  });

  it('arquivo de exemplo do repositório é válido', () => {
    const text = readFileSync(new URL('../../data/produtos-exemplo.csv', import.meta.url), 'utf8');
    const products = productsFromCsv(text);
    expect(products.length).toBeGreaterThanOrEqual(10);
    expect(products.every((p) => p.attributes.marca)).toBe(true);
  });
});
