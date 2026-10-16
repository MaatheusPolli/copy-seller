import { RUBRIC, type LlmPort, type LlmRequest, type LlmResponse } from '@copy-seller/core';

/**
 * LLM falso para demonstrar a UI sem chave de API (`pnpm --filter @copy-seller/web demo`).
 * Monta a copy a partir dos dados do produto contidos no prompt.
 */
export class DemoLlm implements LlmPort {
  async callTool(request: LlmRequest): Promise<LlmResponse> {
    const category = /Categoria: (.+)/.exec(request.user)?.[1] ?? 'Produto';
    const attrs = Object.fromEntries(
      [...request.user.matchAll(/^- ([^:\n]+): (.+)$/gm)].map((m) => [m[1]!, m[2]!]),
    );
    const brandFirst = /DEVE começar com a marca/.test(request.system);
    const marca = attrs.marca ?? '';
    const modelo = attrs.modelo ?? '';
    const details = [attrs.capacidade, attrs.cor].filter(Boolean).join(' ');
    const input =
      request.tool.name === 'registrar_copy'
        ? {
            title: (brandFirst ? [marca, category, modelo, details] : [category, marca, modelo, details])
              .filter(Boolean)
              .join(' '),
            shortDescription: `${category} ${marca} ${modelo}, pensado para o dia a dia.`,
            longDescription: `${category} ${marca} ${modelo}. ${Object.entries(attrs)
              .filter(([k]) => !['marca', 'modelo'].includes(k))
              .map(([k, v]) => `${k}: ${v === 'true' ? 'sim' : v}`)
              .join('. ')}.`,
            bullets: Object.entries(attrs)
              .slice(0, 5)
              .map(([k, v]) => `${k[0]!.toUpperCase()}${k.slice(1)}: ${v === 'true' ? 'sim' : v}`),
          }
        : {
            scores: RUBRIC.map((c, i) => ({
              criterion: c.id,
              score: 3 + ((category.length + i) % 3),
              justification: `(demo) Avaliação simulada de ${c.id}.`,
            })),
          };
    await new Promise((r) => setTimeout(r, 400));
    return {
      model: 'claude-opus-5',
      input,
      usage: { inputTokens: 800, outputTokens: 250, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  }
}
