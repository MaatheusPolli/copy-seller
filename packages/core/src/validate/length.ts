import type { Copy } from '../domain/copy.js';
import type { Issue } from '../domain/issue.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { hasHtml } from './text.js';

export function checkLength(copy: Copy, profile: ChannelProfile): Issue[] {
  const issues: Issue[] = [];
  if (copy.title.length > profile.title.maxLength) {
    issues.push({
      code: 'title_too_long',
      field: 'title',
      message: `Título com ${copy.title.length} caracteres (máx. ${profile.title.maxLength})`,
      severity: 'error',
      fixable: true,
    });
  }
  if (copy.longDescription.length > profile.description.maxLength) {
    issues.push({
      code: 'description_too_long',
      field: 'longDescription',
      message: `Descrição com ${copy.longDescription.length} caracteres (máx. ${profile.description.maxLength})`,
      severity: 'error',
      fixable: true,
    });
  }
  if (!profile.description.allowHtml && hasHtml(copy.longDescription)) {
    issues.push({
      code: 'html_not_allowed',
      field: 'longDescription',
      message: `Canal ${profile.id} não aceita HTML na descrição`,
      severity: 'error',
      fixable: true,
    });
  }
  return issues;
}
