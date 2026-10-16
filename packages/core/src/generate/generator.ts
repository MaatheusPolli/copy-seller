import type { Copy } from '../domain/copy.js';
import type { Issue } from '../domain/issue.js';
import type { Product } from '../domain/product.js';
import { addUsage, costUsd, emptyUsage, type LlmPort, type Usage } from '../ports/llm.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { validateAndFix } from '../validate/validator.js';
import type { JudgeResult } from '../domain/score.js';
import { judge } from '../judge/judge.js';
import { getPrompt } from './prompts/registry.js';
import { GENERATE_COPY_TOOL, parseCopy } from './tool-definition.js';

export interface GenerateOptions {
  llm: LlmPort;
  promptId?: string;
  /** tentativas totais quando sobram erros não corrigíveis */
  maxAttempts?: number;
  /** teto de custo por produto/canal em US$ */
  maxCostUsd?: number;
  /** feedback humano (botão "regenerar com feedback") */
  feedback?: string[];
  /** quando presente, pontua a copy válida (validação antes do juiz) */
  judgeLlm?: LlmPort;
}

export interface GenerationResult {
  channel: string;
  promptId: string;
  copy: Copy | null;
  issues: Issue[];
  fixed: Issue[];
  valid: boolean;
  attempts: number;
  usage: Usage;
  costUsd: number;
  scores?: JudgeResult;
  error?: string;
}

export async function generate(
  product: Product,
  profile: ChannelProfile,
  { llm, promptId, maxAttempts = 3, maxCostUsd = Infinity, feedback = [], judgeLlm }: GenerateOptions,
): Promise<GenerationResult> {
  const prompt = getPrompt(promptId);
  const result: GenerationResult = {
    channel: profile.id,
    promptId: prompt.id,
    copy: null,
    issues: [],
    fixed: [],
    valid: false,
    attempts: 0,
    usage: emptyUsage(),
    costUsd: 0,
  };

  let notes = [...feedback];
  while (result.attempts < maxAttempts) {
    if (result.costUsd >= maxCostUsd) {
      result.error = `Teto de custo atingido (US$ ${maxCostUsd})`;
      break;
    }
    result.attempts++;
    const response = await llm.callTool({
      system: prompt.system(profile),
      user: prompt.user(product, profile, notes),
      tool: GENERATE_COPY_TOOL,
    });
    result.usage = addUsage(result.usage, response.usage);
    result.costUsd += costUsd(response.usage, response.model);

    let copy: Copy;
    try {
      copy = parseCopy(response.input);
    } catch {
      notes = [...feedback, 'A chamada da ferramenta veio incompleta; preencha todos os campos.'];
      result.error = 'Saída estruturada inválida';
      continue;
    }
    const outcome = validateAndFix(copy, product, profile);
    Object.assign(result, { copy: outcome.copy, issues: outcome.issues, fixed: outcome.fixed, valid: outcome.valid });
    delete result.error;
    // atributo faltando na entrada: regenerar não resolve
    if (outcome.valid || outcome.issues.some((i) => i.code === 'input_missing_attribute')) break;
    notes = [...feedback, ...outcome.issues.map((i) => i.message)];
  }
  if (judgeLlm && result.valid && result.copy) {
    const judged = await judge(result.copy, product, profile, judgeLlm);
    result.scores = judged.result;
    result.usage = addUsage(result.usage, judged.usage);
    result.costUsd += judged.costUsd;
  }
  return result;
}

export async function generateForChannels(
  product: Product,
  profiles: ChannelProfile[],
  options: GenerateOptions,
): Promise<GenerationResult[]> {
  return Promise.all(profiles.map((profile) => generate(product, profile, options)));
}
