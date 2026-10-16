import { z } from 'zod';
import type { CriterionScore, JudgeResult } from '../domain/score.js';

export const SCALE = { min: 0, max: 5 } as const;

export interface Criterion {
  id: string;
  weight: number;
  description: string;
  /** âncoras da escala: o que significa 0, 3 e 5 */
  anchors: Record<0 | 3 | 5, string>;
}

export const RUBRIC: Criterion[] = [
  {
    id: 'clareza',
    weight: 1,
    description: 'O comprador entende o que é o produto e para que serve na primeira leitura.',
    anchors: {
      0: 'Confuso ou genérico; não dá para saber o que é o produto.',
      3: 'Compreensível, mas com repetição, jargão ou informação fora de ordem.',
      5: 'Direto, sem redundância; tipo, uso e diferencial claros de imediato.',
    },
  },
  {
    id: 'aderencia_canal',
    weight: 1,
    description: 'Segue tom, formato e convenções do canal (além das regras que o validador já checa).',
    anchors: {
      0: 'Tom e formato inadequados ao canal.',
      3: 'Aceitável, mas destoa do tom pedido ou do padrão de títulos do canal.',
      5: 'Parece escrito por quem conhece o canal: tom, formato e ordem ideais.',
    },
  },
  {
    id: 'uso_atributos',
    weight: 1.5,
    description: 'Usa os atributos relevantes dos dados, sem inventar e sem omitir o que importa para a busca.',
    anchors: {
      0: 'Ignora os atributos ou inventa características.',
      3: 'Usa os principais, mas omite algum relevante para busca ou decisão.',
      5: 'Todos os atributos relevantes, bem posicionados e fiéis aos dados.',
    },
  },
];

export const CriterionScoreSchema = z.object({
  criterion: z.string(),
  score: z.number(),
  justification: z.string().min(1),
});

export function clampScore(score: number): number {
  return Math.min(SCALE.max, Math.max(SCALE.min, Math.round(score)));
}

/** valida as notas do juiz: todos os critérios, uma vez cada, dentro da escala */
export function normalizeScores(raw: unknown): CriterionScore[] {
  const parsed = z.array(CriterionScoreSchema).parse(raw);
  return RUBRIC.map((c) => {
    const found = parsed.find((s) => s.criterion === c.id);
    if (!found) throw new Error(`Juiz não avaliou o critério "${c.id}"`);
    return { ...found, score: clampScore(found.score) };
  });
}

export function overall(scores: CriterionScore[]): number {
  const weights = new Map(RUBRIC.map((c) => [c.id, c.weight]));
  let total = 0;
  let weightSum = 0;
  for (const s of scores) {
    const w = weights.get(s.criterion) ?? 1;
    total += s.score * w;
    weightSum += w;
  }
  return weightSum ? Math.round((total / weightSum) * 100) / 100 : 0;
}

export function toJudgeResult(scores: CriterionScore[]): JudgeResult {
  return { scores, overall: overall(scores) };
}

export function rubricText(): string {
  return RUBRIC.map(
    (c) =>
      `### ${c.id} (peso ${c.weight})\n${c.description}\n- 0: ${c.anchors[0]}\n- 3: ${c.anchors[3]}\n- 5: ${c.anchors[5]}`,
  ).join('\n\n');
}
