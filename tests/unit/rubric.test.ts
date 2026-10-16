import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  RUBRIC,
  SCALE,
  clampScore,
  generate,
  judge,
  judgePair,
  judgeSystem,
  normalizeScores,
  overall,
} from '@copy-seller/core';
import { copy, product, profile } from '../fixtures/domain';
import { RecordedLlm, usage } from '../fixtures/fake-llm';

const scores = (score: number) =>
  RUBRIC.map((c) => ({ criterion: c.id, score, justification: 'porque sim' }));
const pairFixture = JSON.parse(
  readFileSync(new URL('../fixtures/llm/judge-pair-position-bias.json', import.meta.url), 'utf8'),
);
const weak = { ...copy, title: 'Mochila top', bullets: ['Linda'] };

describe('rubric', () => {
  it('nota sempre dentro da escala', () => {
    expect(clampScore(7)).toBe(SCALE.max);
    expect(clampScore(-1)).toBe(SCALE.min);
    expect(clampScore(3.4)).toBe(3);
    const normalized = normalizeScores([...scores(9)].reverse());
    expect(normalized.map((s) => s.criterion)).toEqual(RUBRIC.map((c) => c.id));
    expect(normalized.every((s) => s.score === 5)).toBe(true);
  });

  it('exige todos os critérios e justificativa', () => {
    expect(() => normalizeScores(scores(3).slice(1))).toThrow(/clareza/);
    expect(() => normalizeScores([{ criterion: 'clareza', score: 3, justification: '' }])).toThrow();
  });

  it('média ponderada', () => {
    expect(overall(scores(4))).toBe(4);
    const mixed = [
      { criterion: 'clareza', score: 5, justification: 'x' },
      { criterion: 'aderencia_canal', score: 5, justification: 'x' },
      { criterion: 'uso_atributos', score: 0, justification: 'x' },
      { criterion: 'extra', score: 0, justification: 'x' },
    ];
    expect(overall(mixed)).toBe(2.22);
    expect(overall([])).toBe(0);
  });

  it('prompt do juiz traz rubrica e mitigação de verbosidade', () => {
    const system = judgeSystem(profile);
    for (const c of RUBRIC) expect(system).toContain(c.id);
    expect(system).toContain('mais longo não é melhor');
  });
});

describe('judge', () => {
  it('avalia uma copy', async () => {
    const llm = new RecordedLlm([{ model: 'claude-opus-5', input: { scores: scores(4) }, usage }]);
    const { result, costUsd } = await judge(copy, product, profile, llm);
    expect(result.overall).toBe(4);
    expect(costUsd).toBeGreaterThan(0);
    expect(llm.requests[0]!.user).toContain(copy.title);
  });

  it('mesma copy com ordem trocada não muda o vencedor', async () => {
    const llm = new RecordedLlm(pairFixture.consistent);
    const { result } = await judgePair(copy, weak, product, profile, llm);
    expect(llm.requests[0]!.user.indexOf(copy.title)).toBeLessThan(llm.requests[0]!.user.indexOf(weak.title));
    expect(llm.requests[1]!.user.indexOf(weak.title)).toBeLessThan(llm.requests[1]!.user.indexOf(copy.title));
    expect(result.preferences).toEqual(['A', 'A']);
    expect(result.winner).toBe('A');
    expect(result.positionBias).toBe(false);
    expect(result.a.overall).toBeGreaterThan(result.b.overall);
    expect(result.a.scores[1]!.score).toBe(4.5);
  });

  it('juiz que sempre prefere a primeira posição vira empate sinalizado', async () => {
    const llm = new RecordedLlm(pairFixture.biased);
    const { result } = await judgePair(copy, weak, product, profile, llm);
    expect(result.preferences).toEqual(['A', 'B']);
    expect(result.winner).toBe('tie');
    expect(result.positionBias).toBe(true);
  });

  it('empate declarado nas duas ordens', async () => {
    const tie = { ...pairFixture.biased[0], input: { ...pairFixture.biased[0].input, preferida: 'empate' } };
    const { result } = await judgePair(copy, weak, product, profile, new RecordedLlm([tie, tie]));
    expect(result).toMatchObject({ winner: 'tie', positionBias: false });
  });

  it('gerador só chama o juiz para copy válida', async () => {
    const judgeLlm = new RecordedLlm([{ model: 'claude-opus-5', input: { scores: scores(5) }, usage }]);
    const ok = await generate(product, profile, {
      llm: new RecordedLlm([{ model: 'claude-opus-5', input: copy, usage }]),
      judgeLlm,
    });
    expect(ok.scores?.overall).toBe(5);

    const bad = { model: 'claude-opus-5', input: { ...copy, title: 'Mochila promoção' }, usage };
    const invalid = await generate(product, profile, {
      llm: new RecordedLlm([bad]),
      maxAttempts: 1,
      judgeLlm: new RecordedLlm([]),
    });
    expect(invalid.scores).toBeUndefined();
  });
});
