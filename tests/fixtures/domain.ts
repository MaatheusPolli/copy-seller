import type { ChannelProfile, Copy, Product } from '@copy-seller/core';

export const product: Product = {
  sku: 'MOC-001',
  category: 'Mochila',
  attributes: { marca: 'Trilha', modelo: 'Explorer 30L', cor: 'Preta', impermeavel: true, material: 'nylon' },
};

export const profile: ChannelProfile = {
  id: 'mercadolivre',
  title: { maxLength: 60, mustStartWith: 'category', forbidden: ['frete grátis', 'promoção'] },
  description: { maxLength: 200, allowHtml: false, requiredAttributes: ['marca', 'modelo'] },
  tone: 'objetivo',
  synonyms: { impermeavel: ["à prova d'água"] },
};

export const copy: Copy = {
  title: 'Mochila Trilha Explorer 30L Preta Impermeável',
  shortDescription: 'Mochila de nylon para trilhas.',
  longDescription: 'Mochila Trilha Explorer 30L em nylon, cor preta.',
  bullets: ['Capacidade 30L', 'Nylon'],
};

export const withCopy = (patch: Partial<Copy>): Copy => ({ ...copy, ...patch });
export const withProfile = (patch: Partial<ChannelProfile>): ChannelProfile => ({ ...profile, ...patch });
