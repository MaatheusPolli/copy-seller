/** minúsculas, sem acento, pontuação vira espaço — base para comparações tolerantes */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim();
}

/** termo aparece como palavra(s) inteira(s) no texto, ignorando caixa e acento */
export function containsTerm(text: string, term: string): boolean {
  const t = normalize(term);
  if (!t) return false;
  return ` ${normalize(text)} `.includes(` ${t} `);
}

export function startsWithTerm(text: string, term: string): boolean {
  const t = normalize(term);
  return t.length > 0 && `${normalize(text)} `.startsWith(`${t} `);
}

export function hasHtml(text: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(text);
}
