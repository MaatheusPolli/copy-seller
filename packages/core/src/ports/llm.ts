export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LlmRequest {
  /** parte estável — candidata a prompt caching */
  system: string;
  user: string;
  tool: ToolSpec;
  maxTokens?: number;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmResponse {
  model: string;
  /** argumentos da chamada de ferramenta, ainda não validados */
  input: unknown;
  usage: Usage;
}

export interface LlmPort {
  callTool(request: LlmRequest): Promise<LlmResponse>;
}

/** US$ por milhão de tokens */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export function costUsd(usage: Usage, model: string): number {
  const price = PRICING[model] ?? PRICING['claude-opus-5']!;
  const input = usage.inputTokens + usage.cacheWriteTokens * 1.25 + usage.cacheReadTokens * 0.1;
  return (input * price.input + usage.outputTokens * price.output) / 1_000_000;
}

export const emptyUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}
