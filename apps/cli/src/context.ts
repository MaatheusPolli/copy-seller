import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfiles, type ChannelProfile, type LlmPort, type Product } from '@copy-seller/core';
import { AnthropicLlm } from '@copy-seller/core/anthropic';
import { ClaudeCliLlm } from '@copy-seller/core/claude-cli';

/** caminhos relativos ao diretório onde o usuário chamou (pnpm muda o cwd para apps/cli) */
export const root = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path);

export interface CommonOptions {
  canais: string;
  perfis: string;
  modelo: string;
  modeloJuiz: string;
}

export function selectProfiles({ canais, perfis }: CommonOptions): ChannelProfile[] {
  const all = loadProfiles(root(perfis));
  const ids = canais === 'todos' ? [...all.keys()] : canais.split(',').map((c) => c.trim());
  return ids.map((id) => {
    const profile = all.get(id);
    if (!profile) throw new Error(`Canal desconhecido: ${id} (disponíveis: ${[...all.keys()].join(', ')})`);
    return profile;
  });
}

/** `COPY_SELLER_BACKEND=cli` usa o Claude Code CLI local (assinatura); padrão é a API. */
const makeLlm = (model: string): LlmPort =>
  process.env.COPY_SELLER_BACKEND === 'cli' ? new ClaudeCliLlm(model) : new AnthropicLlm(model);

export const llms = ({ modelo, modeloJuiz }: CommonOptions) => ({
  llm: makeLlm(modelo),
  judgeLlm: makeLlm(modeloJuiz),
});

export function readDataset(path: string): { product: Product; referenceTitle?: string }[] {
  return readFileSync(root(path), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

export const usd = (x: number) => `US$ ${x.toFixed(4)}`;
