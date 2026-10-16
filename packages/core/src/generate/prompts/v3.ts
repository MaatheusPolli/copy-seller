import { channelRules } from './v2.js';
import { feedbackBlock, productBlock, type PromptVersion } from './types.js';

/** v2 + ordem de atributos no título e orientação de busca. */
export const v3: PromptVersion = {
  id: 'v3',
  changelog: 'Define ordem de atributos no título (tipo, marca, modelo, diferencial, variação) e foco em termos de busca.',
  system: (profile) =>
    `Você é redator de marketplace. Escreva copy precisa, buscável e que o canal aceite.

${channelRules(profile)}

Título: siga a ordem [início exigido pelo canal] → tipo de produto → marca → modelo → principal diferencial → variação (cor/tamanho). Use as palavras que o comprador digitaria na busca; nada de adjetivos vazios.
Descrição curta: 1–2 frases com o benefício principal.
Descrição longa: parágrafos curtos: para quem é, especificações, o que vem na caixa (se informado).
Bullets: 3 a 6, cada um com um fato verificável.

Use somente características presentes nos dados do produto. Não invente certificações, resistência, garantias ou compatibilidades.`,
  user: (product, _profile, feedback) =>
    `Dados do produto:\n${productBlock(product)}\n\nRegistre a copy com a ferramenta.${feedbackBlock(feedback)}`,
};
