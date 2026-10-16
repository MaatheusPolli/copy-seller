import type { Copy } from '../../domain/copy.js';
import type { Product } from '../../domain/product.js';
import { productBlock } from '../../generate/prompts/types.js';
import type { ToolSpec } from '../../ports/llm.js';
import type { ChannelProfile } from '../../profiles/schema.js';
import { RUBRIC, SCALE, rubricText } from '../rubric.js';

export const JUDGE_PROMPT_ID = 'judge-v1';

const scoresSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['criterion', 'justification', 'score'],
    properties: {
      criterion: { type: 'string', enum: RUBRIC.map((c) => c.id) },
      justification: { type: 'string', description: 'Evidência no texto que justifica a nota, escrita ANTES da nota' },
      score: { type: 'integer', minimum: SCALE.min, maximum: SCALE.max },
    },
  },
};

export const SCORE_TOOL: ToolSpec = {
  name: 'registrar_avaliacao',
  description: 'Registra a nota de cada critério da rubrica.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['scores'],
    properties: { scores: scoresSchema },
  },
};

export const PAIR_TOOL: ToolSpec = {
  name: 'registrar_comparacao',
  description: 'Registra as notas das duas candidatas e a preferida.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['candidata_1', 'candidata_2', 'preferida'],
    properties: {
      candidata_1: scoresSchema,
      candidata_2: scoresSchema,
      preferida: { type: 'string', enum: ['1', '2', 'empate'] },
    },
  },
};

export function judgeSystem(profile: ChannelProfile): string {
  return `Você avalia copy de anúncios para o marketplace ${profile.id} (tom esperado: ${profile.tone}).
Limites, termos proibidos e atributos obrigatórios já foram verificados por código — foque na qualidade.

Rubrica (escala ${SCALE.min}–${SCALE.max}; use notas intermediárias entre as âncoras):

${rubricText()}

Regras de avaliação:
- Escreva a justificativa citando trechos do texto antes de decidir a nota.
- Texto mais longo não é melhor: avalie densidade de informação, não volume.
- A ordem de apresentação das candidatas é aleatória e não indica preferência.`;
}

export function copyBlock(copy: Copy): string {
  return `Título: ${copy.title}
Descrição curta: ${copy.shortDescription}
Descrição longa:
${copy.longDescription}
Bullets:
${copy.bullets.map((b) => `- ${b}`).join('\n')}`;
}

export function judgeUser(copy: Copy, product: Product): string {
  return `Dados do produto:\n${productBlock(product)}\n\nCopy a avaliar:\n${copyBlock(copy)}`;
}

export function pairUser(first: Copy, second: Copy, product: Product): string {
  return `Dados do produto:\n${productBlock(product)}\n\n## Candidata 1\n${copyBlock(first)}\n\n## Candidata 2\n${copyBlock(second)}`;
}
