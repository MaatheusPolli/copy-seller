import { describe, it, expect } from 'vitest';
import { autoFix, ensurePrefix, smartTruncate, stripHtml } from '@copy-seller/core';
import { copy, product, profile } from '../fixtures/domain';

describe('smartTruncate', () => {
  it('não mexe em texto dentro do limite', () => {
    expect(smartTruncate('Mochila azul', 12)).toBe('Mochila azul');
  });
  it('não corta palavra ao meio', () => {
    const out = smartTruncate('Mochila Trilha Explorer', 18);
    expect(out).toBe('Mochila Trilha');
  });
  it('mantém a última palavra se ela termina exatamente no limite', () => {
    expect(smartTruncate('Mochila Trilha Explorer', 14)).toBe('Mochila Trilha');
    expect(smartTruncate('Mochila Trilha Explorer', 7)).toBe('Mochila');
  });
  it('remove conectivos e pontuação pendurados', () => {
    expect(smartTruncate('Mochila Trilha com compartimento', 22)).toBe('Mochila Trilha');
    expect(smartTruncate('Mochila Trilha, azul marinho', 16)).toBe('Mochila Trilha');
  });
  it('palavra única maior que o limite é cortada no limite', () => {
    expect(smartTruncate('Supercalifragilistico', 5)).toBe('Super');
  });
  it('resultado nunca excede o limite', () => {
    const text = 'Mochila de Trilha para Camping com Alças e Compartimento de Notebook';
    for (let max = 7; max < text.length; max++) {
      const out = smartTruncate(text, max);
      expect(out.length).toBeLessThanOrEqual(max);
      expect(text.split(' ')).toEqual(expect.arrayContaining(out.split(' ')));
    }
  });
});

describe('stripHtml', () => {
  it('converte estrutura em texto', () => {
    expect(stripHtml('<p>Um</p><ul><li>a</li><li>b</li></ul><br/>fim')).toBe('Um\n- a\n- b\n\nfim');
  });
});

describe('ensurePrefix', () => {
  it('move o prefixo para o início', () => {
    expect(ensurePrefix('Trilha Mochila Explorer', 'Mochila')).toBe('Mochila Trilha Explorer');
  });
  it('adiciona quando ausente', () => {
    expect(ensurePrefix('Explorer 30L', 'Mochila')).toBe('Mochila Explorer 30L');
  });
  it('mantém quando já correto', () => {
    expect(ensurePrefix('Mochila X', 'mochila')).toBe('Mochila X');
  });
  it('título que é só o prefixo', () => {
    expect(ensurePrefix('mochila.', 'Mochila')).toBe('mochila.');
    expect(ensurePrefix('', 'Mochila')).toBe('Mochila');
  });
});

describe('autoFix', () => {
  it('só aplica correções de issues corrigíveis', () => {
    const c = { ...copy, title: 'Trilha Mochila', longDescription: '<b>x</b>' };
    expect(autoFix(c, [], product, profile)).toEqual(c);
  });
});
