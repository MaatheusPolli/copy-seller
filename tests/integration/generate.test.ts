import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import {
  PROMPTS,
  addUsage,
  costUsd,
  generate,
  generateForChannels,
  getPrompt,
  loadProfiles,
  parseCopy,
} from '@copy-seller/core';
import { copy, product, profile } from '../fixtures/domain';
import { RecordedLlm, usage } from '../fixtures/fake-llm';

const ok = (input: unknown = copy) => ({ model: 'claude-opus-5', input, usage });

describe('generate', () => {
  it('regenera com feedback do validador até ficar válida', async () => {
    const llm = RecordedLlm.fromFixture('mochila-mercadolivre');
    const result = await generate(product, profile, { llm, promptId: 'v2' });

    expect(result.attempts).toBe(2);
    expect(result.valid).toBe(true);
    expect(result.promptId).toBe('v2');
    expect(result.copy!.title.length).toBeLessThanOrEqual(profile.title.maxLength);
    expect(result.copy!.longDescription).not.toContain('<p>');
    expect(result.fixed.map((i) => i.code).sort()).toEqual(['html_not_allowed', 'title_too_long']);
    expect(llm.requests[1]!.user).toContain('Termo proibido');
    expect(result.usage.cacheReadTokens).toBe(600);
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it('system prompt é estável entre tentativas (cacheável)', async () => {
    const llm = RecordedLlm.fromFixture('mochila-mercadolivre');
    await generate(product, profile, { llm });
    expect(llm.requests[0]!.system).toBe(llm.requests[1]!.system);
  });

  it('para após maxAttempts e devolve issues restantes', async () => {
    const bad = { ...copy, title: 'Mochila Trilha promoção' };
    const llm = new RecordedLlm([ok(bad), ok(bad)]);
    const result = await generate(product, profile, { llm, maxAttempts: 2 });
    expect(result).toMatchObject({ attempts: 2, valid: false });
    expect(result.issues[0]!.code).toBe('forbidden_term');
  });

  it('não regenera quando falta atributo na entrada', async () => {
    const llm = new RecordedLlm([ok()]);
    const p = { ...product, attributes: { marca: 'Trilha' } };
    const result = await generate(p, profile, { llm });
    expect(result.attempts).toBe(1);
    expect(result.issues.map((i) => i.code)).toContain('input_missing_attribute');
  });

  it('saída estruturada inválida conta como tentativa', async () => {
    const llm = new RecordedLlm([ok({ title: 'x' }), ok({ title: 'x' })]);
    const result = await generate(product, profile, { llm, maxAttempts: 2 });
    expect(result).toMatchObject({ copy: null, valid: false, error: 'Saída estruturada inválida' });
    expect(llm.requests[1]!.user).toContain('incompleta');
  });

  it('respeita o teto de custo', async () => {
    const bad = { ...copy, title: 'Mochila promoção' };
    const llm = new RecordedLlm([ok(bad), ok(bad)]);
    const result = await generate(product, profile, { llm, maxCostUsd: 0.001 });
    expect(result.attempts).toBe(1);
    expect(result.error).toContain('Teto de custo');
  });

  it('feedback humano entra no prompt', async () => {
    const llm = new RecordedLlm([ok()]);
    await generate(product, profile, { llm, feedback: ['Destaque a capacidade'] });
    expect(llm.requests[0]!.user).toContain('Destaque a capacidade');
  });

  it('gera para vários canais em paralelo', async () => {
    const profiles = [...loadProfiles(fileURLToPath(new URL('../../profiles', import.meta.url))).values()];
    const llm = new RecordedLlm(profiles.map(() => ok()));
    const results = await generateForChannels(product, profiles, { llm });
    expect(results.map((r) => r.channel).sort()).toEqual(['amazon', 'mercadolivre', 'shopee', 'vtex']);
  });
});

describe('prompts', () => {
  it('todas as versões têm id e changelog e embutem os dados do produto', () => {
    for (const [id, prompt] of Object.entries(PROMPTS)) {
      expect(prompt.id).toBe(id);
      expect(prompt.changelog.length).toBeGreaterThan(10);
      expect(prompt.system(profile)).toContain(profile.id);
      expect(prompt.user(product, profile)).toContain('Explorer 30L');
    }
  });

  it('v2+ traz as regras do canal', () => {
    const noStart = { ...profile, title: { maxLength: 60, forbidden: [] }, description: { ...profile.description, allowHtml: true, requiredAttributes: [] } };
    expect(getPrompt('v2').system(profile)).toContain('"frete grátis"');
    expect(getPrompt('v3').system(noStart)).toContain('HTML simples permitido');
    expect(getPrompt('v3').system({ ...profile, title: { ...profile.title, mustStartWith: 'brand' } })).toContain('a marca');
  });

  it('prompt desconhecido falha com mensagem útil', () => {
    expect(() => getPrompt('v9')).toThrow(/v1, v2, v3/);
  });
});

describe('llm helpers', () => {
  it('calcula custo com cache', () => {
    const u = { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 };
    expect(costUsd(u, 'claude-opus-5')).toBeCloseTo(5.5);
    expect(costUsd(u, 'modelo-desconhecido')).toBeCloseTo(5.5);
    expect(costUsd({ ...u, inputTokens: 0, cacheReadTokens: 0, outputTokens: 1_000_000 }, 'claude-haiku-4-5')).toBe(5);
  });
  it('soma usage', () => {
    expect(addUsage(usage, usage).outputTokens).toBe(400);
  });
  it('parseCopy rejeita bullets vazios', () => {
    expect(() => parseCopy({ ...copy, bullets: [] })).toThrow();
  });
});
