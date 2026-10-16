import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { generateForChannels, loadProfiles, PROMPTS, type LlmPort, type Product } from '@copy-seller/core';
import { AnthropicLlm } from '@copy-seller/core/anthropic';
import { DemoLlm } from './demo-llm';

const profiles = loadProfiles(fileURLToPath(new URL('../../../profiles', import.meta.url)));
const demo = process.env.DEMO === '1';
let llm: LlmPort | undefined;
const getLlm = () => (llm ??= demo ? new DemoLlm() : new AnthropicLlm(process.env.COPY_SELLER_MODEL ?? 'claude-opus-5'));

interface GerarBody {
  product: Product;
  channels: string[];
  promptId?: string;
  feedback?: string[];
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body) as T;
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(data));
}

/** API local da demo: a chave da Anthropic fica no servidor, nunca no navegador. */
export async function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
  try {
    if (req.url === '/api/config' && req.method === 'GET') {
      return send(res, 200, {
        demo,
        prompts: Object.values(PROMPTS).map((p) => ({ id: p.id, changelog: p.changelog })),
        profiles: [...profiles.values()],
      });
    }
    if (req.url === '/api/gerar' && req.method === 'POST') {
      const body = await readJson<GerarBody>(req);
      const selected = body.channels.map((id) => {
        const p = profiles.get(id);
        if (!p) throw new Error(`Canal desconhecido: ${id}`);
        return p;
      });
      const llm = getLlm();
      const started = Date.now();
      const results = await generateForChannels(body.product, selected, {
        llm,
        judgeLlm: llm,
        promptId: body.promptId,
        feedback: body.feedback?.filter(Boolean),
        maxCostUsd: 0.5,
      });
      return send(res, 200, { results, elapsedMs: Date.now() - started });
    }
    next();
  } catch (err) {
    send(res, 500, { error: (err as Error).message });
  }
}
