import type { CopyField } from './copy.js';

export type IssueCode =
  | 'title_too_long'
  | 'description_too_long'
  | 'html_not_allowed'
  | 'wrong_title_start'
  | 'missing_required_attribute'
  | 'input_missing_attribute'
  | 'forbidden_term'
  | 'unsupported_claim';

export interface Issue {
  code: IssueCode;
  field: CopyField | 'input';
  message: string;
  severity: 'error' | 'warning';
  /** true quando o auto-fix resolve sem regenerar */
  fixable: boolean;
}
