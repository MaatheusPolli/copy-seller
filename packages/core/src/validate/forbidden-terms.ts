import type { Copy, CopyField } from '../domain/copy.js';
import type { Issue } from '../domain/issue.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { containsTerm } from './text.js';

export function checkForbiddenTerms(copy: Copy, profile: ChannelProfile): Issue[] {
  const fields: [CopyField, string][] = [
    ['title', copy.title],
    ['shortDescription', copy.shortDescription],
    ['longDescription', copy.longDescription],
    ['bullets', copy.bullets.join('\n')],
  ];
  const issues: Issue[] = [];
  for (const term of profile.title.forbidden) {
    for (const [field, text] of fields) {
      if (containsTerm(text, term)) {
        issues.push({
          code: 'forbidden_term',
          field,
          message: `Termo proibido em ${profile.id}: "${term}"`,
          severity: 'error',
          fixable: false,
        });
      }
    }
  }
  return issues;
}
