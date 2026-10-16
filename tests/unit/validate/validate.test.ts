import { describe, it, expect } from 'vitest';
import {
  checkForbiddenTerms,
  checkLength,
  checkRequiredAttributes,
  containsTerm,
  hasHtml,
  normalize,
  startsWithTerm,
  validate,
  validateAndFix,
} from '@copy-seller/core';
import { copy, product, profile, withCopy, withProfile } from '../../fixtures/domain';

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe('text', () => {
  it('normaliza caixa, acento e pontuação', () => {
    expect(normalize('  Frete-GRÁTIS! ')).toBe('frete gratis');
  });
  it('casa termo inteiro, não substring', () => {
    expect(containsTerm('Caneca térmica', 'term')).toBe(false);
    expect(containsTerm('Caneca TÉRMICA', 'termica')).toBe(true);
    expect(containsTerm('x', '  ')).toBe(false);
  });
  it('startsWithTerm', () => {
    expect(startsWithTerm('Mochila Trilha', 'mochila')).toBe(true);
    expect(startsWithTerm('Mochilas', 'mochila')).toBe(false);
    expect(startsWithTerm('a', '')).toBe(false);
  });
  it('detecta HTML', () => {
    expect(hasHtml('<p>oi</p>')).toBe(true);
    expect(hasHtml('3 < 4 > 2')).toBe(false);
  });
});

describe('length', () => {
  it('título exatamente no limite passa', () => {
    expect(checkLength(withCopy({ title: 'a'.repeat(60) }), profile)).toEqual([]);
  });
  it('título 1 caractere acima do limite falha', () => {
    expect(codes(checkLength(withCopy({ title: 'a'.repeat(61) }), profile))).toEqual(['title_too_long']);
  });
  it('descrição acima do limite falha', () => {
    expect(codes(checkLength(withCopy({ longDescription: 'a'.repeat(201) }), profile))).toEqual([
      'description_too_long',
    ]);
  });
  it('HTML proibido quando canal não aceita', () => {
    expect(codes(checkLength(withCopy({ longDescription: '<b>x</b>' }), profile))).toEqual(['html_not_allowed']);
    const html = withProfile({ description: { ...profile.description, allowHtml: true } });
    expect(checkLength(withCopy({ longDescription: '<b>x</b>' }), html)).toEqual([]);
  });
});

describe('required attributes', () => {
  it('copy completa passa', () => {
    expect(checkRequiredAttributes(copy, product, profile)).toEqual([]);
  });
  it('atributo obrigatório ausente no texto', () => {
    const c = withCopy({ title: 'Mochila Trilha', longDescription: 'Mochila Trilha.', bullets: [] });
    const issues = checkRequiredAttributes(c, product, profile);
    expect(codes(issues)).toEqual(['missing_required_attribute']);
    expect(issues[0]!.message).toContain('modelo');
  });
  it('atributo obrigatório ausente nos dados de entrada', () => {
    const p = { ...product, attributes: { ...product.attributes, modelo: '' } };
    expect(codes(checkRequiredAttributes(copy, p, profile))).toEqual(['input_missing_attribute']);
  });
  it('título deve começar com a categoria', () => {
    const issues = checkRequiredAttributes(withCopy({ title: 'Trilha Mochila Explorer 30L' }), product, profile);
    expect(issues[0]).toMatchObject({ code: 'wrong_title_start', fixable: true });
  });
  it('título deve começar com a marca; sem marca não é corrigível', () => {
    const amazon = withProfile({ title: { ...profile.title, mustStartWith: 'brand' } });
    expect(codes(checkRequiredAttributes(copy, product, amazon))).toEqual(['wrong_title_start']);
    const semMarca = { ...product, attributes: { modelo: 'Explorer 30L' } };
    const noReq = withProfile({
      title: { ...profile.title, mustStartWith: 'brand' },
      description: { ...profile.description, requiredAttributes: [] },
    });
    const [issue] = checkRequiredAttributes(copy, semMarca, noReq);
    expect(issue).toMatchObject({ code: 'wrong_title_start', fixable: false });
  });
  it('sem regra de início não reclama', () => {
    const shopee = withProfile({ title: { maxLength: 60, forbidden: [] } });
    expect(checkRequiredAttributes(withCopy({ title: 'Trilha Explorer 30L Mochila' }), product, shopee)).toEqual([]);
  });
});

describe('forbidden terms', () => {
  it('detecta termo proibido com variação de caixa e acento', () => {
    const issues = checkForbiddenTerms(withCopy({ title: 'Mochila FRETE GRATIS' }), profile);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'forbidden_term', field: 'title', fixable: false });
  });
  it('verifica todos os campos', () => {
    const c = withCopy({ shortDescription: 'Promoção!', longDescription: 'promocao', bullets: ['PROMOÇÃO'] });
    expect(checkForbiddenTerms(c, profile).map((i) => i.field)).toEqual([
      'shortDescription',
      'longDescription',
      'bullets',
    ]);
  });
  it('não confunde substring', () => {
    expect(checkForbiddenTerms(withCopy({ title: 'Mochila promocionalmente' }), profile)).toEqual([]);
  });
});

describe('validator', () => {
  it('copy válida não gera issues', () => {
    expect(validate(copy, product, profile)).toEqual([]);
    const out = validateAndFix(copy, product, profile);
    expect(out).toEqual({ copy, issues: [], fixed: [], valid: true });
  });

  it('corrige título longo, HTML e ordem sem regenerar', () => {
    const bad = withCopy({
      title: 'Trilha Mochila Explorer 30L Preta com compartimento para notebook e garrafa',
      longDescription: '<p>Mochila Trilha Explorer 30L</p><ul><li>nylon</li></ul>',
    });
    const out = validateAndFix(bad, product, profile);
    expect(out.valid).toBe(true);
    expect(out.issues).toEqual([]);
    expect(codes(out.fixed).sort()).toEqual(['html_not_allowed', 'title_too_long', 'wrong_title_start']);
    expect(out.copy.title.startsWith('Mochila Trilha')).toBe(true);
    expect(out.copy.title.length).toBeLessThanOrEqual(60);
    expect(hasHtml(out.copy.longDescription)).toBe(false);
  });

  it('nenhuma copy inválida escapa: não corrigível permanece e invalida', () => {
    const out = validateAndFix(withCopy({ title: 'Mochila Trilha frete grátis' }), product, profile);
    expect(out.valid).toBe(false);
    expect(codes(out.issues)).toEqual(['forbidden_term']);
  });

  it('mistura de corrigível e não corrigível', () => {
    const bad = withCopy({ title: 'Mochila ' + 'x '.repeat(40) + 'promoção' });
    const out = validateAndFix(bad, product, profile);
    expect(codes(out.fixed)).toContain('title_too_long');
    expect(out.valid).toBe(true);
  });
});
