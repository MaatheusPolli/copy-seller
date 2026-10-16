import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadProfiles, parseProfile } from '@copy-seller/core';

const dir = fileURLToPath(new URL('../../../profiles', import.meta.url));

describe('profiles', () => {
  it('carrega os quatro perfis do repositório', () => {
    const profiles = loadProfiles(dir);
    expect([...profiles.keys()].sort()).toEqual(['amazon', 'mercadolivre', 'shopee', 'vtex']);
    expect(profiles.get('amazon')?.title.mustStartWith).toBe('brand');
  });

  it('rejeita perfil inválido', () => {
    expect(() => parseProfile('id: ebay\ntitle: {maxLength: 10}')).toThrow();
  });

  it('aplica defaults', () => {
    const p = parseProfile(
      'id: vtex\ntitle: {maxLength: 10}\ndescription: {maxLength: 10, allowHtml: false}\ntone: x',
    );
    expect(p.title.forbidden).toEqual([]);
    expect(p.synonyms).toEqual({});
  });
});
