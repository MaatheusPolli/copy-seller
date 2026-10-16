import { describe, it, expect } from 'vitest';
import {
  RUBRIC,
  compareVariants,
  effectLabel,
  mean,
  pairedCohenD,
  renderAbReport,
  signTest,
  stdDev,
  summarize,
  type ItemComparison,
} from '@copy-seller/core';
import { copy, product, profile } from '../fixtures/domain';
import { RecordedLlm, usage } from '../fixtures/fake-llm';

describe('stats', () => {
  it('média e desvio amostral', () => {
    expect(mean([])).toBe(0);
    expect(mean([1, 2, 3])).toBe(2);
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(stdDev([1])).toBe(0);
  });

  it('d de Cohen pareado', () => {
    expect(pairedCohenD([4, 5, 4, 5], [3, 3, 3, 3])).toBeCloseTo(1.5 / Math.sqrt(1 / 3), 5);
    expect(pairedCohenD([1, 2], [1, 2])).toBe(0);
    expect(pairedCohenD([2, 3], [1, 2])).toBe(Infinity);
    expect(() => pairedCohenD([1], [1, 2])).toThrow();
  });

  it('rótulo do efeito', () => {
    expect([0.1, 0.3, 0.6, -1].map(effectLabel)).toEqual(['desprezível', 'pequeno', 'médio', 'grande']);
  });

  it('teste do sinal exato', () => {
    expect(signTest(0, 0)).toBe(1);
    expect(signTest(5, 5)).toBe(1);
    expect(signTest(10, 0)).toBeCloseTo(2 / 1024, 6);
    expect(signTest(9, 1)).toBeCloseTo(22 / 1024, 6);
    expect(signTest(1, 9)).toBe(signTest(9, 1));
  });
});

const crit = (s: number) => Object.fromEntries(RUBRIC.map((c) => [c.id, s]));
const item = (scoreA: number, scoreB: number, extra: Partial<ItemComparison> = {}): ItemComparison => ({
  sku: 'X',
  channel: 'mercadolivre',
  validA: true,
  validB: true,
  scoreA,
  scoreB,
  criteriaA: crit(scoreA),
  criteriaB: crit(scoreB),
  winner: scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'tie',
  positionBias: false,
  lengthA: 100,
  lengthB: 100,
  costUsd: 0.01,
  ...extra,
});

describe('summarize (notas sintéticas)', () => {
  it('escolhe o vencedor correto e reporta o efeito', () => {
    const items = [
      ...Array.from({ length: 11 }, (_, i) => item(3, 4 + (i % 2) * 0.5)),
      item(4, 3.5),
    ];
    const s = summarize(items, 'v2', 'v3');
    expect(s).toMatchObject({ winsA: 1, winsB: 11, winner: 'B', significant: true, effect: 'grande' });
    expect(s.cohenD).toBeLessThan(-0.8);
    expect(s.meanB).toBeGreaterThan(s.meanA);
    expect(s.criteria[0]!.meanB).toBeGreaterThan(s.criteria[0]!.meanA);
    expect(s.costUsd).toBeCloseTo(0.12);
  });

  it('diferença pequena é inconclusiva', () => {
    const s = summarize([item(4, 3), item(3, 4), item(4, 3.5), item(4, 4)], 'a', 'b');
    expect(s.winner).toBe('inconclusivo');
    expect(s.ties).toBe(1);
  });

  it('A vence e itens inválidos contam', () => {
    const items = Array.from({ length: 8 }, () => item(5, 3));
    items.push(item(0, 0, { validB: false, scoreA: null, scoreB: null, winner: 'A', positionBias: true }));
    const s = summarize(items, 'a', 'b');
    expect(s).toMatchObject({ winner: 'A', winsA: 9, validRateB: 8 / 9 });
    expect(s.positionBiasRate).toBeCloseTo(1 / 9);
  });

  it('conjunto vazio', () => {
    const s = summarize([], 'a', 'b');
    expect(s).toMatchObject({ n: 0, winner: 'inconclusivo', validRateA: 0, positionBiasRate: 0 });
  });

  it('relatório traz veredito, tabela e alerta de verbosidade', () => {
    const items = Array.from({ length: 10 }, () => item(3, 4, { lengthB: 200 }));
    const md = renderAbReport(summarize(items, 'v2', 'v3'), items);
    expect(md).toContain('**v3 vence**');
    expect(md).toContain('viés de verbosidade');
    expect(md).toContain('| X | mercadolivre |');
    const flat = [item(4, 3), item(3, 4)];
    const md2 = renderAbReport(summarize(flat, 'v2', 'v3'), flat, 'Título');
    expect(md2).toContain('# Título');
    expect(md2).toContain('Inconclusivo');
    const invalid = [item(0, 0, { validA: false, scoreA: null, scoreB: null, winner: 'B', positionBias: true })];
    expect(renderAbReport(summarize(invalid, 'a', 'b'), invalid)).toContain('| ✗/✓ | — | — | B | ⚠️ |');
  });
});

describe('compareVariants', () => {
  const judgeScores = (s: number) => RUBRIC.map((c) => ({ criterion: c.id, score: s, justification: 'x' }));

  it('fluxo completo com LLM gravado', async () => {
    const gen = new RecordedLlm([
      { model: 'claude-opus-5', input: copy, usage },
      { model: 'claude-opus-5', input: copy, usage },
      // produto 2: A inválida (termo proibido) nas 3 tentativas, B válida
      { model: 'claude-opus-5', input: { ...copy, title: 'Mochila promoção' }, usage },
      { model: 'claude-opus-5', input: copy, usage },
      { model: 'claude-opus-5', input: { ...copy, title: 'Mochila promoção' }, usage },
      { model: 'claude-opus-5', input: { ...copy, title: 'Mochila promoção' }, usage },
    ]);
    const pair = (pref: string) => ({
      model: 'claude-opus-5',
      input: { candidata_1: judgeScores(3), candidata_2: judgeScores(5), preferida: pref },
      usage,
    });
    const judgeLlm = new RecordedLlm([pair('2'), pair('2')]);
    const seen: string[] = [];
    const { items, summary } = await compareVariants([product, { ...product, sku: 'MOC-002' }], [profile], {
      llm: gen,
      judgeLlm,
      promptA: 'v2',
      promptB: 'v3',
      onItem: (i) => seen.push(i.sku),
    });
    expect(seen).toEqual(['MOC-001', 'MOC-002']);
    expect(items[0]).toMatchObject({ winner: 'tie', positionBias: true, scoreA: 4, scoreB: 4 });
    expect(items[1]).toMatchObject({ validA: false, validB: true, winner: 'B', scoreA: null });
    expect(summary.winsB).toBe(1);
  });

  it('rejeita prompt desconhecido antes de gastar', async () => {
    await expect(
      compareVariants([product], [profile], { llm: new RecordedLlm([]), judgeLlm: new RecordedLlm([]), promptA: 'v2', promptB: 'x' }),
    ).rejects.toThrow(/desconhecido/);
  });
});
