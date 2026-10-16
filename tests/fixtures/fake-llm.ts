import { readFileSync } from 'node:fs';
import type { LlmPort, LlmRequest, LlmResponse } from '@copy-seller/core';

/** Reproduz respostas gravadas em ordem e registra as requisições recebidas. */
export class RecordedLlm implements LlmPort {
  readonly requests: LlmRequest[] = [];
  private index = 0;

  constructor(private readonly responses: LlmResponse[]) {}

  static fromFixture(name: string): RecordedLlm {
    const url = new URL(`./llm/${name}.json`, import.meta.url);
    return new RecordedLlm(JSON.parse(readFileSync(url, 'utf8')));
  }

  async callTool(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(request);
    const response = this.responses[this.index++];
    if (!response) throw new Error(`Sem resposta gravada para a chamada ${this.index}`);
    return response;
  }
}

export const usage = { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0 };
