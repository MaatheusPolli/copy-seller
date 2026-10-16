import { copyText, type Copy } from '../domain/copy.js';
import type { Issue } from '../domain/issue.js';
import { attr, type Product } from '../domain/product.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { containsTerm, startsWithTerm } from './text.js';

export function titlePrefix(product: Product, profile: ChannelProfile): string | undefined {
  const rule = profile.title.mustStartWith;
  if (!rule) return undefined;
  return rule === 'brand' ? attr(product, 'marca') : product.category;
}

export function checkRequiredAttributes(copy: Copy, product: Product, profile: ChannelProfile): Issue[] {
  const issues: Issue[] = [];
  const text = copyText(copy);

  for (const key of profile.description.requiredAttributes) {
    const value = attr(product, key);
    if (value === undefined) {
      issues.push({
        code: 'input_missing_attribute',
        field: 'input',
        message: `Produto ${product.sku} sem o atributo obrigatório "${key}" para ${profile.id}`,
        severity: 'error',
        fixable: false,
      });
    } else if (!containsTerm(text, value)) {
      issues.push({
        code: 'missing_required_attribute',
        field: 'longDescription',
        message: `Atributo obrigatório "${key}" (${value}) não aparece no texto`,
        severity: 'error',
        fixable: false,
      });
    }
  }

  const rule = profile.title.mustStartWith;
  const prefix = titlePrefix(product, profile);
  if (rule && (prefix === undefined || !startsWithTerm(copy.title, prefix))) {
    const what = rule === 'brand' ? 'a marca' : 'a categoria';
    issues.push({
      code: 'wrong_title_start',
      field: 'title',
      message: `Título deve começar com ${what}${prefix ? ` ("${prefix}")` : ''}`,
      severity: 'error',
      fixable: prefix !== undefined,
    });
  }
  return issues;
}
