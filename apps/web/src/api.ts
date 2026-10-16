import type { ChannelProfile, GenerationResult, Product } from '@copy-seller/core';

export interface Config {
  demo: boolean;
  prompts: { id: string; changelog: string }[];
  profiles: ChannelProfile[];
}

export interface GerarResponse {
  results: GenerationResult[];
  elapsedMs: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export const getConfig = () => request<Config>('/api/config');

export const gerar = (body: { product: Product; channels: string[]; promptId: string; feedback?: string[] }) =>
  request<GerarResponse>('/api/gerar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
