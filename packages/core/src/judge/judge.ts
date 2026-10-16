import { z } from 'zod';
import type { Copy } from '../domain/copy.js';
import type { Product } from '../domain/product.js';
import type { JudgeResult } from '../domain/score.js';
import { addUsage, costUsd, type LlmPort, type Usage } from '../ports/llm.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { PAIR_TOOL, SCORE_TOOL, judgeSystem, judgeUser, pairUser } from './prompts/judge.js';
import { normalizeScores, toJudgeResult } from './rubric.js';

export interface Judged<T> {
  result: T;
  usage: Usage;
  costUsd: number;
}

export async function judge(
  copy: Copy,
  product: Product,
  profile: ChannelProfile,
  llm: LlmPort,
): Promise<Judged<JudgeResult>> {
  const response = await llm.callTool({
    system: judgeSystem(profile),
    user: judgeUser(copy, product),
    tool: SCORE_TOOL,
  });
  const { scores } = z.object({ scores: z.unknown() }).parse(response.input);
  return {
    result: toJudgeResult(normalizeScores(scores)),
    usage: response.usage,
    costUsd: costUsd(response.usage, response.model),
  };
}

export type Winner = 'A' | 'B' | 'tie';

export interface PairResult {
  a: JudgeResult;
  b: JudgeResult;
  winner: Winner;
  /** preferências nas duas ordens; divergência indica viés de posição */
  preferences: [Winner, Winner];
  positionBias: boolean;
}

const PairSchema = z.object({
  candidata_1: z.unknown(),
  candidata_2: z.unknown(),
  preferida: z.enum(['1', '2', 'empate']),
});

function average(x: JudgeResult, y: JudgeResult): JudgeResult {
  return toJudgeResult(
    x.scores.map((s, i) => ({
      criterion: s.criterion,
      score: (s.score + y.scores[i]!.score) / 2,
      justification: `${s.justification} | ${y.scores[i]!.justification}`,
    })),
  );
}

/**
 * Comparação pareada com mitigação de viés de posição: avalia A×B e B×A.
 * Só declara vencedor se as duas ordens concordam; senão, empate.
 */
export async function judgePair(
  a: Copy,
  b: Copy,
  product: Product,
  profile: ChannelProfile,
  llm: LlmPort,
): Promise<Judged<PairResult>> {
  const system = judgeSystem(profile);
  const [ab, ba] = await Promise.all([
    llm.callTool({ system, user: pairUser(a, b, product), tool: PAIR_TOOL }),
    llm.callTool({ system, user: pairUser(b, a, product), tool: PAIR_TOOL }),
  ]);
  const first = PairSchema.parse(ab.input);
  const second = PairSchema.parse(ba.input);

  const map = (pref: '1' | '2' | 'empate', firstIs: 'A' | 'B'): Winner => {
    if (pref === 'empate') return 'tie';
    const other = firstIs === 'A' ? 'B' : 'A';
    return pref === '1' ? firstIs : other;
  };
  const preferences: [Winner, Winner] = [map(first.preferida, 'A'), map(second.preferida, 'B')];
  const agree = preferences[0] === preferences[1];

  const scoresA = average(
    toJudgeResult(normalizeScores(first.candidata_1)),
    toJudgeResult(normalizeScores(second.candidata_2)),
  );
  const scoresB = average(
    toJudgeResult(normalizeScores(first.candidata_2)),
    toJudgeResult(normalizeScores(second.candidata_1)),
  );
  const usage = addUsage(ab.usage, ba.usage);
  return {
    result: {
      a: scoresA,
      b: scoresB,
      winner: agree ? preferences[0] : 'tie',
      preferences,
      positionBias: !agree,
    },
    usage,
    costUsd: costUsd(ab.usage, ab.model) + costUsd(ba.usage, ba.model),
  };
}
