import { feedbackBlock, productBlock, type PromptVersion } from './types.js';

/** Linha de base: instrução mínima, sem regras explícitas do canal. */
export const v1: PromptVersion = {
  id: 'v1',
  changelog: 'Versão inicial: pede título e descrições a partir dos dados.',
  system: (profile) =>
    `Você escreve anúncios de produtos para o marketplace ${profile.id}. Tom: ${profile.tone}.`,
  user: (product, _profile, feedback) =>
    `Escreva a copy deste produto e registre com a ferramenta.\n\n${productBlock(product)}${feedbackBlock(feedback)}`,
};
