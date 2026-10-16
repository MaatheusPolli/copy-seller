export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** desvio-padrão amostral (n − 1) */
export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}

/** d de Cohen para amostras pareadas: média das diferenças / desvio das diferenças */
export function pairedCohenD(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Amostras pareadas precisam ter o mesmo tamanho');
  const diffs = a.map((x, i) => x - b[i]!);
  const sd = stdDev(diffs);
  const m = mean(diffs);
  if (sd === 0) return m === 0 ? 0 : Math.sign(m) * Infinity;
  return m / sd;
}

export function effectLabel(d: number): 'desprezível' | 'pequeno' | 'médio' | 'grande' {
  const abs = Math.abs(d);
  if (abs < 0.2) return 'desprezível';
  if (abs < 0.5) return 'pequeno';
  if (abs < 0.8) return 'médio';
  return 'grande';
}

function binomialCoefficient(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/**
 * Teste do sinal exato, bicaudal: sob H0 cada vitória é moeda honesta.
 * Empates são descartados.
 */
export function signTest(winsA: number, winsB: number): number {
  const n = winsA + winsB;
  if (n === 0) return 1;
  const k = Math.min(winsA, winsB);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += binomialCoefficient(n, i);
  return Math.min(1, (2 * tail) / 2 ** n);
}
