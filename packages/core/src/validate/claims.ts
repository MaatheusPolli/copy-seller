import { copyText, type Copy } from '../domain/copy.js';
import type { Issue } from '../domain/issue.js';
import type { Product } from '../domain/product.js';
import type { ChannelProfile } from '../profiles/schema.js';
import { containsTerm, normalize } from './text.js';

/**
 * Alegações verificáveis: atributo canônico → formas no texto.
 * Perfis estendem via `synonyms`.
 */
export const CLAIM_LEXICON: Record<string, string[]> = {
  impermeavel: ['impermeável'],
  bivolt: ['bivolt'],
  sem_fio: ['sem fio', 'wireless'],
  antiaderente: ['antiaderente'],
  inox: ['inox', 'aço inoxidável'],
  bluetooth: ['bluetooth'],
  recarregavel: ['recarregável'],
  organico: ['orgânico'],
  hipoalergenico: ['hipoalergênico'],
  garantia: ['garantia'],
};

export interface Claim {
  canonical: string;
  term: string;
}

function formsOf(canonical: string, synonyms: Record<string, string[]>): string[] {
  return [...(CLAIM_LEXICON[canonical] ?? []), ...(synonyms[canonical] ?? []), canonical];
}

export function extractClaims(text: string, synonyms: Record<string, string[]> = {}): Claim[] {
  const keys = new Set([...Object.keys(CLAIM_LEXICON), ...Object.keys(synonyms)]);
  const claims: Claim[] = [];
  for (const canonical of keys) {
    const term = formsOf(canonical, synonyms).find((f) => containsTerm(text, f));
    if (term) claims.push({ canonical, term });
  }
  return claims;
}

const NEGATIVE = new Set(['nao', 'no', 'false', '0']);

/** o produto sustenta a alegação se tem o atributo verdadeiro ou algum valor/categoria que a menciona */
export function supportsClaim(product: Product, claim: Claim, synonyms: Record<string, string[]> = {}): boolean {
  const forms = formsOf(claim.canonical, synonyms);
  for (const [key, value] of Object.entries(product.attributes)) {
    if (normalize(key).replace(/ /g, '_') === claim.canonical) {
      return value !== false && !NEGATIVE.has(normalize(String(value)));
    }
  }
  return [product.category, ...Object.values(product.attributes).filter((v) => typeof v === 'string')].some(
    (value) => forms.some((f) => containsTerm(value as string, f)),
  );
}

export function checkClaims(copy: Copy, product: Product, profile: ChannelProfile): Issue[] {
  return extractClaims(copyText(copy), profile.synonyms)
    .filter((claim) => !supportsClaim(product, claim, profile.synonyms))
    .map(
      (claim): Issue => ({
        code: 'unsupported_claim',
        field: 'longDescription',
        message: `Alegação "${claim.term}" sem suporte nos dados do produto`,
        severity: 'error',
        fixable: false,
      }),
    );
}
