import type { Copy } from '../domain/copy.js';
import type { Issue } from '../domain/issue.js';
import type { Product } from '../domain/product.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { titlePrefix } from './required-attributes.js';
import { startsWithTerm } from './text.js';

const DANGLING = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'para', 'em', 'a', 'o', 'sem']);

/** corta no último limite de palavra ≤ max e remove conectivos/pontuação soltos no fim */
export function smartTruncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : text.slice(0, max);
  const words = base.replace(/[\s,;:\-|/]+$/, '').split(/\s+/);
  while (words.length > 1 && DANGLING.has(words[words.length - 1]!.toLowerCase())) words.pop();
  return words.join(' ').replace(/[\s,;:\-|/]+$/, '');
}

export function stripHtml(text: string): string {
  return text
    .replace(/<\s*(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** move o prefixo exigido para o início, removendo a ocorrência anterior */
export function ensurePrefix(title: string, prefix: string): string {
  if (startsWithTerm(title, prefix)) return title;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rest = title
    .replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'i'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return rest ? `${prefix} ${rest}` : prefix;
}

export function autoFix(copy: Copy, issues: Issue[], product: Product, profile: ChannelProfile): Copy {
  const codes = new Set(issues.filter((i) => i.fixable).map((i) => i.code));
  let { title, longDescription } = copy;
  const prefix = titlePrefix(product, profile);
  if (codes.has('wrong_title_start') && prefix) title = ensurePrefix(title, prefix);
  if (codes.has('html_not_allowed')) longDescription = stripHtml(longDescription);
  // truncamento por último: reordenar pode ter alongado o título
  title = smartTruncate(title, profile.title.maxLength);
  longDescription = smartTruncate(longDescription, profile.description.maxLength);
  return { ...copy, title, longDescription };
}
