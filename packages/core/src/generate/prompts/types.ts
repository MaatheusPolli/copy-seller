import type { Product } from '../../domain/product.js';
import type { ChannelProfile } from '../../profiles/schema.js';

export interface PromptVersion {
  id: string;
  changelog: string;
  system(profile: ChannelProfile): string;
  user(product: Product, profile: ChannelProfile, feedback?: string[]): string;
}

export function productBlock(product: Product): string {
  const attrs = Object.entries(product.attributes)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  return `SKU: ${product.sku}\nCategoria: ${product.category}\nAtributos:\n${attrs}`;
}

export function feedbackBlock(feedback?: string[]): string {
  if (!feedback?.length) return '';
  return `\n\nA tentativa anterior foi rejeitada pelo validador. Corrija:\n${feedback.map((f) => `- ${f}`).join('\n')}`;
}
