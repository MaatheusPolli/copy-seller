import type { Copy } from '../domain/copy.js';
import type { Issue } from '../domain/issue.js';
import type { Product } from '../domain/product.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { autoFix } from './auto-fix.js';
import { checkClaims } from './claims.js';
import { checkForbiddenTerms } from './forbidden-terms.js';
import { checkLength } from './length.js';
import { checkRequiredAttributes } from './required-attributes.js';

export function validate(copy: Copy, product: Product, profile: ChannelProfile): Issue[] {
  return [
    ...checkLength(copy, profile),
    ...checkRequiredAttributes(copy, product, profile),
    ...checkForbiddenTerms(copy, profile),
    ...checkClaims(copy, product, profile),
  ];
}

export interface ValidationOutcome {
  copy: Copy;
  /** problemas que sobraram após o auto-fix */
  issues: Issue[];
  fixed: Issue[];
  valid: boolean;
}

const key = (i: Issue) => `${i.code}|${i.field}`;

export function validateAndFix(copy: Copy, product: Product, profile: ChannelProfile): ValidationOutcome {
  const before = validate(copy, product, profile);
  const fixedCopy = before.some((i) => i.fixable) ? autoFix(copy, before, product, profile) : copy;
  const after = fixedCopy === copy ? before : validate(fixedCopy, product, profile);
  const remaining = new Set(after.map(key));
  return {
    copy: fixedCopy,
    issues: after,
    fixed: before.filter((i) => !remaining.has(key(i))),
    valid: !after.some((i) => i.severity === 'error'),
  };
}
