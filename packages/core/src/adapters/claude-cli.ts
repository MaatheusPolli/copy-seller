import { spawn } from 'node:child_process';
import type { LlmPort, LlmRequest, LlmResponse, Usage } from '../ports/llm.js';

/** Binário do Claude Code CLI; sobrescrevível para testes/ambientes. */
const BIN = process.env.COPY_SELLER_CLAUDE_BIN ?? (process.platform === 'win32' ? 'claude.exe' : 'claude');

/** Aliases aceitos pelo `claude --model`; ids canônicos passam direto. */
const MODEL_ALIAS: Record<string, string> = {
  'claude-opus-5': 'opus',
  'claude-sonnet-5': 'sonnet',
  'claude-haiku-4-5': 'haiku',
};

interface CliEnvelope {
  is_error?: boolean;
  result?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  modelUsage?: Record<string, unknown>;
}

/**
 * Adaptador que usa o Claude Code CLI local (assinatura via OAuth) como backend,
 * em vez da API paga. Não há tool use nativo: pedimos um JSON estrito que satisfaça
 * o `input_schema` da ferramenta e validamos/reparseamos, com re-tentativa.
 *
 * O custo reportado vem do envelope do CLI e inclui o overhead de system prompt do
 * próprio Claude Code por chamada — não é um custo de API "puro" por item.
 *
 * Fora da cobertura: os testes usam respostas gravadas, nunca o CLI real.
 */
export class ClaudeCliLlm implements LlmPort {
  constructor(
    private readonly model = 'claude-sonnet-5',
    private readonly maxRetries = 2,
  ) {}

  async callTool(request: LlmRequest): Promise<LlmResponse> {
    const system = buildSystem(request);
    const model = MODEL_ALIAS[this.model] ?? this.model;
    let lastError = '';
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const envelope = await runCli(model, system, request.user);
      if (envelope.is_error) {
        lastError = `CLI retornou is_error (${envelope.result ?? 'sem detalhe'})`;
        continue;
      }
      try {
        return {
          model: pickModel(envelope, this.model),
          input: extractJson(envelope.result ?? ''),
          usage: toUsage(envelope),
        };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    throw new Error(`claude CLI não devolveu JSON válido após ${this.maxRetries + 1} tentativa(s): ${lastError}`);
  }
}

function buildSystem({ system, tool }: LlmRequest): string {
  return [
    system,
    '',
    `Você preenche a ferramenta "${tool.name}": ${tool.description}`,
    'Responda SOMENTE com um objeto JSON que satisfaça EXATAMENTE o JSON Schema abaixo.',
    'Sem texto fora do JSON, sem cercas de código (```), sem comentários.',
    JSON.stringify(tool.input_schema),
  ].join('\n');
}

function runCli(model: string, system: string, user: string): Promise<CliEnvelope> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      BIN,
      ['-p', '--system-prompt', system, '--output-format', 'json', '--model', model],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`claude CLI saiu com código ${code}: ${stderr.trim() || stdout.trim()}`));
      try {
        resolve(JSON.parse(stdout) as CliEnvelope);
      } catch {
        reject(new Error(`Envelope do CLI não é JSON: ${stdout.slice(0, 200)}`));
      }
    });
    child.stdin.end(user);
  });
}

/** O modelo preenche a ferramenta como texto; isolamos o objeto JSON. */
function extractJson(result: string): unknown {
  const text = result.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error(`sem objeto JSON na resposta: ${text.slice(0, 200)}`);
    return JSON.parse(text.slice(start, end + 1));
  }
}

function pickModel(envelope: CliEnvelope, fallback: string): string {
  const key = envelope.modelUsage && Object.keys(envelope.modelUsage)[0];
  return key ?? fallback;
}

function toUsage(envelope: CliEnvelope): Usage {
  const u = envelope.usage ?? {};
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
}
