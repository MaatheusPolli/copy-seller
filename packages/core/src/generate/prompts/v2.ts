import type { ChannelProfile } from '../../profiles/schema.js';
import { feedbackBlock, productBlock, type PromptVersion } from './types.js';

export function channelRules(profile: ChannelProfile): string {
  const start = profile.title.mustStartWith
    ? `\n- O título DEVE começar com ${profile.title.mustStartWith === 'brand' ? 'a marca' : 'a categoria do produto'}.`
    : '';
  const forbidden = profile.title.forbidden.length
    ? `\n- Nunca use: ${profile.title.forbidden.map((t) => `"${t}"`).join(', ')}.`
    : '';
  return `Regras do canal ${profile.id}:
- Título com no máximo ${profile.title.maxLength} caracteres.${start}
- Descrição longa com no máximo ${profile.description.maxLength} caracteres${profile.description.allowHtml ? ' (HTML simples permitido)' : ', texto puro sem HTML'}.
- Cite obrigatoriamente: ${profile.description.requiredAttributes.join(', ') || 'nenhum atributo específico'}.${forbidden}
- Tom: ${profile.tone}.`;
}

/** Regras do perfil explícitas + ancoragem factual. */
export const v2: PromptVersion = {
  id: 'v2',
  changelog: 'Adiciona regras do perfil (limites, obrigatórios, proibidos) e proíbe alegações fora dos dados.',
  system: (profile) =>
    `Você é redator de marketplace. Escreva copy precisa e que o canal aceite.

${channelRules(profile)}

Use somente características presentes nos dados do produto. Não invente certificações, resistência, garantias ou compatibilidades.`,
  user: (product, _profile, feedback) =>
    `Dados do produto:\n${productBlock(product)}\n\nRegistre a copy com a ferramenta.${feedbackBlock(feedback)}`,
};
