import Anthropic from '@anthropic-ai/sdk';
import type { LlmPort, LlmRequest, LlmResponse } from '../ports/llm.js';

/** Adaptador real; fora da cobertura — os testes usam respostas gravadas. */
export class AnthropicLlm implements LlmPort {
  constructor(
    private readonly model = 'claude-opus-5',
    private readonly client = new Anthropic(),
  ) {}

  async callTool(request: LlmRequest): Promise<LlmResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 16000,
      system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
      tools: [{ ...request.tool, strict: true } as Anthropic.Tool],
      tool_choice: { type: 'tool', name: request.tool.name },
      messages: [{ role: 'user', content: request.user }],
    });
    if (response.stop_reason === 'refusal') throw new Error('Modelo recusou a solicitação');
    const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!block) throw new Error(`Resposta sem tool_use (stop_reason=${response.stop_reason})`);
    return {
      model: this.model,
      input: block.input,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    };
  }
}
