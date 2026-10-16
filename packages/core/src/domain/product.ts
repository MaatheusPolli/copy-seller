export type AttributeValue = string | number | boolean;

export interface Product {
  sku: string;
  category: string;
  /** atributos estruturados; `marca` e `modelo` são convencionais */
  attributes: Record<string, AttributeValue>;
}

export function attr(product: Product, key: string): string | undefined {
  const value = product.attributes[key];
  if (value === undefined || value === false || value === '') return undefined;
  return String(value);
}
