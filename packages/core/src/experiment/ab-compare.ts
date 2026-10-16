import type { Product } from '../domain/product.js';
import { generate } from '../generate/generator.js';
import { getPrompt } from '../generate/prompts/registry.js';
import { judgePair, type Winner } from '../judge/judge.js';
import type { LlmPort } from '../ports/llm.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { RUBRIC } from '../judge/rubric.js';
import { effectLabel, mean, pairedCohenD, signTest } from './stats.js';

export interface ItemComparison {
  sku: string;
  channel: string;
  validA: boolean;
  validB: boolean;
  /** média geral do juiz; null quando alguma copy é inválida (não vai ao juiz) */
  scoreA: number | null;
  scoreB: number | null;
  criteriaA?: Record<string, number>;
  criteriaB?: Record<string, number>;
  winner: Winner;
  positionBias: boolean;
  lengthA: number;
  lengthB: number;
  costUsd: number;
}

export interface AbSummary {
  promptA: string;
  promptB: string;
  n: number;
  winsA: number;
  winsB: number;
  ties: number;
  positionBiasRate: number;
  validRateA: number;
  validRateB: number;
  meanA: number;
  meanB: number;
  criteria: { criterion: string; meanA: number; meanB: number }[];
  cohenD: number;
  effect: ReturnType<typeof effectLabel>;
  pValue: number;
  significant: boolean;
  winner: 'A' | 'B' | 'inconclusivo';
  meanLengthA: number;
  meanLengthB: number;
  costUsd: number;
}

/** vencedor do item: copy inválida perde para válida sem gastar juiz */
export function summarize(items: ItemComparison[], promptA: string, promptB: string, alpha = 0.05): AbSummary {
  const winsA = items.filter((i) => i.winner === 'A').length;
  const winsB = items.filter((i) => i.winner === 'B').length;
  const judged = items.filter((i) => i.scoreA !== null && i.scoreB !== null);
  const a = judged.map((i) => i.scoreA!);
  const b = judged.map((i) => i.scoreB!);
  const d = judged.length >= 2 ? pairedCohenD(a, b) : 0;
  const pValue = signTest(winsA, winsB);
  const significant = pValue < alpha;
  const criterionMean = (key: 'criteriaA' | 'criteriaB', id: string) =>
    mean(judged.map((i) => i[key]?.[id]).filter((v): v is number => v !== undefined));
  return {
    promptA,
    promptB,
    n: items.length,
    winsA,
    winsB,
    ties: items.length - winsA - winsB,
    positionBiasRate: items.length ? items.filter((i) => i.positionBias).length / items.length : 0,
    validRateA: items.length ? items.filter((i) => i.validA).length / items.length : 0,
    validRateB: items.length ? items.filter((i) => i.validB).length / items.length : 0,
    meanA: mean(a),
    meanB: mean(b),
    criteria: RUBRIC.map((c) => ({
      criterion: c.id,
      meanA: criterionMean('criteriaA', c.id),
      meanB: criterionMean('criteriaB', c.id),
    })),
    cohenD: d,
    effect: effectLabel(d),
    pValue,
    significant,
    winner: !significant ? 'inconclusivo' : winsA > winsB ? 'A' : 'B',
    meanLengthA: mean(items.map((i) => i.lengthA)),
    meanLengthB: mean(items.map((i) => i.lengthB)),
    costUsd: items.reduce((acc, i) => acc + i.costUsd, 0),
  };
}

export interface CompareOptions {
  llm: LlmPort;
  judgeLlm: LlmPort;
  promptA: string;
  promptB: string;
  onItem?: (item: ItemComparison) => void;
}

const byCriterion = (scores?: { criterion: string; score: number }[]) =>
  scores && Object.fromEntries(scores.map((s) => [s.criterion, s.score]));

export async function compareVariants(
  products: Product[],
  profiles: ChannelProfile[],
  { llm, judgeLlm, promptA, promptB, onItem }: CompareOptions,
): Promise<{ items: ItemComparison[]; summary: AbSummary }> {
  getPrompt(promptA);
  getPrompt(promptB);
  const items: ItemComparison[] = [];
  for (const product of products) {
    for (const profile of profiles) {
      const [ra, rb] = await Promise.all([
        generate(product, profile, { llm, promptId: promptA }),
        generate(product, profile, { llm, promptId: promptB }),
      ]);
      const lengthOf = (c: typeof ra.copy) => (c ? c.title.length + c.longDescription.length : 0);
      const item: ItemComparison = {
        sku: product.sku,
        channel: profile.id,
        validA: ra.valid,
        validB: rb.valid,
        scoreA: null,
        scoreB: null,
        winner: ra.valid === rb.valid ? 'tie' : ra.valid ? 'A' : 'B',
        positionBias: false,
        lengthA: lengthOf(ra.copy),
        lengthB: lengthOf(rb.copy),
        costUsd: ra.costUsd + rb.costUsd,
      };
      if (ra.valid && rb.valid) {
        const judged = await judgePair(ra.copy!, rb.copy!, product, profile, judgeLlm);
        Object.assign(item, {
          scoreA: judged.result.a.overall,
          scoreB: judged.result.b.overall,
          criteriaA: byCriterion(judged.result.a.scores),
          criteriaB: byCriterion(judged.result.b.scores),
          winner: judged.result.winner,
          positionBias: judged.result.positionBias,
          costUsd: item.costUsd + judged.costUsd,
        });
      }
      items.push(item);
      onItem?.(item);
    }
  }
  return { items, summary: summarize(items, promptA, promptB) };
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const f2 = (x: number) => x.toFixed(2);

export function renderAbReport(summary: AbSummary, items: ItemComparison[], title?: string): string {
  const s = summary;
  const verdict =
    s.winner === 'inconclusivo'
      ? `**Inconclusivo** — p = ${f2(s.pValue)} (teste do sinal); não há evidência para trocar de prompt.`
      : `**${s.winner === 'A' ? s.promptA : s.promptB} vence** — ${Math.max(s.winsA, s.winsB)} × ${Math.min(s.winsA, s.winsB)} (p = ${s.pValue.toFixed(3)}), efeito ${s.effect} (d = ${f2(s.cohenD)}).`;
  const lengthNote =
    s.meanLengthA && s.meanLengthB && Math.abs(s.meanLengthA - s.meanLengthB) / Math.min(s.meanLengthA, s.meanLengthB) > 0.25
      ? `\n> ⚠️ Diferença de tamanho > 25% entre variantes: verifique viés de verbosidade do juiz.\n`
      : '';
  return `# ${title ?? `A/B: ${s.promptA} vs ${s.promptB}`}

${verdict}
${lengthNote}
## Resumo

| Métrica | ${s.promptA} (A) | ${s.promptB} (B) |
|---|---|---|
| Vitórias | ${s.winsA} | ${s.winsB} |
| Copy válida (após auto-fix e regeneração) | ${pct(s.validRateA)} | ${pct(s.validRateB)} |
| Nota média do juiz | ${f2(s.meanA)} | ${f2(s.meanB)} |
${s.criteria.map((c) => `| ↳ ${c.criterion} | ${f2(c.meanA)} | ${f2(c.meanB)} |`).join('\n')}
| Tamanho médio (título + descrição) | ${f2(s.meanLengthA)} | ${f2(s.meanLengthB)} |

- Itens (produto × canal): ${s.n} · empates: ${s.ties}
- Viés de posição detectado (ordens discordantes → empate): ${pct(s.positionBiasRate)}
- Significância: teste do sinal exato bicaudal, p = ${s.pValue.toFixed(4)} (α = 0,05)
- Tamanho do efeito: d de Cohen pareado = ${f2(s.cohenD)} (${s.effect})
- Custo total: US$ ${s.costUsd.toFixed(4)}

## Método

1. Cada produto do dataset é gerado com as duas variantes para cada canal.
2. Copy inválida após auto-fix e regeneração perde automaticamente para a válida (não gasta juiz).
3. Com as duas válidas, o juiz compara em pares **nas duas ordens** (A×B e B×A); só há vencedor se as ordens concordam.
4. Vitórias entram no teste do sinal; notas médias no d de Cohen pareado.

## Itens

| SKU | Canal | Válida A/B | Nota A | Nota B | Vencedor | Viés |
|---|---|---|---|---|---|---|
${items
  .map(
    (i) =>
      `| ${i.sku} | ${i.channel} | ${i.validA ? '✓' : '✗'}/${i.validB ? '✓' : '✗'} | ${i.scoreA ?? '—'} | ${i.scoreB ?? '—'} | ${i.winner} | ${i.positionBias ? '⚠️' : ''} |`,
  )
  .join('\n')}
`;
}
