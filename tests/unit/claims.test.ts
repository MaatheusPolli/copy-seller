import { describe, it, expect } from 'vitest';
import { checkClaims, extractClaims, supportsClaim } from '@copy-seller/core';
import { copy, product, profile, withCopy } from '../fixtures/domain';

describe('claims', () => {
  it('extrai alegações do léxico', () => {
    expect(extractClaims('Fone Bluetooth sem fio, BIVOLT').map((c) => c.canonical).sort()).toEqual([
      'bivolt',
      'bluetooth',
      'sem_fio',
    ]);
  });

  it('"impermeável" em produto sem esse atributo é sinalizado', () => {
    const p = { ...product, attributes: { marca: 'Trilha', modelo: 'Explorer 30L' } };
    const issues = checkClaims(copy, p, profile);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'unsupported_claim', fixable: false });
    expect(issues[0]!.message).toContain('impermeável');
  });

  it('atributo explicitamente negativo não sustenta a alegação', () => {
    for (const v of [false, 'não', 'no', 0] as const) {
      const p = { ...product, attributes: { ...product.attributes, impermeavel: v } };
      expect(checkClaims(copy, p, profile)).toHaveLength(1);
    }
  });

  it('atributo com chave acentuada ou com espaço é reconhecido', () => {
    const p = { ...product, attributes: { marca: 'X', 'Sem Fio': 'sim' } };
    expect(supportsClaim(p, { canonical: 'sem_fio', term: 'wireless' })).toBe(true);
  });

  it('valor textual que menciona a alegação a sustenta', () => {
    const p = { ...product, attributes: { material: 'aço inoxidável 304' } };
    expect(supportsClaim(p, { canonical: 'inox', term: 'inox' })).toBe(true);
    const cat = { ...product, category: 'Fone Bluetooth', attributes: {} };
    expect(supportsClaim(cat, { canonical: 'bluetooth', term: 'bluetooth' })).toBe(true);
  });

  it('sinônimo declarado no perfil é detectado e não gera falso positivo', () => {
    const c = withCopy({ title: 'Mochila Trilha', longDescription: "Mochila Trilha Explorer 30L à prova d'água" });
    expect(extractClaims(c.longDescription, profile.synonyms)).toEqual([
      { canonical: 'impermeavel', term: "à prova d'água" },
    ]);
    expect(checkClaims(c, product, profile)).toEqual([]);
  });

  it('sinônimo sem suporte também é sinalizado', () => {
    const p = { ...product, attributes: { marca: 'Trilha', modelo: 'Explorer 30L' } };
    const c = withCopy({ title: 'Mochila', longDescription: "À PROVA D'ÁGUA" });
    expect(checkClaims(c, p, profile)).toHaveLength(1);
  });

  it('sinônimo de chave nova fora do léxico', () => {
    expect(extractClaims('com tecnologia antiodor', { antiodor: ['antiodor'] })).toEqual([
      { canonical: 'antiodor', term: 'antiodor' },
    ]);
  });
});
