import { z } from 'zod';
import type { Copy } from '../domain/copy.js';
import type { ToolSpec } from '../ports/llm.js';

export const CopySchema = z.object({
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  longDescription: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
});

export const GENERATE_COPY_TOOL: ToolSpec = {
  name: 'registrar_copy',
  description: 'Registra a copy do produto para o canal. Preencha todos os campos.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'shortDescription', 'longDescription', 'bullets'],
    properties: {
      title: { type: 'string', description: 'Título do anúncio' },
      shortDescription: { type: 'string', description: 'Resumo em 1–2 frases' },
      longDescription: { type: 'string', description: 'Descrição completa' },
      bullets: { type: 'array', items: { type: 'string' }, description: '3 a 6 destaques' },
    },
  },
};

export function parseCopy(input: unknown): Copy {
  return CopySchema.parse(input);
}
