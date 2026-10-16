import type { AttributeValue, Product } from '../domain/product.js';

/** parser CSV RFC 4180 (aspas, vírgulas e quebras de linha dentro de campos) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

export function csvField(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(',')).join('\n') + '\n';
}

function coerce(value: string): AttributeValue {
  const v = value.trim();
  if (/^(sim|true)$/i.test(v)) return true;
  if (/^(não|nao|false)$/i.test(v)) return false;
  return v;
}

/** colunas `sku` e `categoria` obrigatórias; as demais viram atributos (vazias são ignoradas) */
export function productsFromCsv(text: string): Product[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const cols = header.map((h) => h.trim());
  const skuIdx = cols.indexOf('sku');
  const catIdx = cols.indexOf('categoria');
  if (skuIdx < 0 || catIdx < 0) throw new Error('CSV precisa das colunas "sku" e "categoria"');
  return rows.map((row) => {
    const attributes: Record<string, AttributeValue> = {};
    cols.forEach((col, i) => {
      if (i === skuIdx || i === catIdx || !row[i]?.trim()) return;
      attributes[col] = coerce(row[i]!);
    });
    return { sku: row[skuIdx]!.trim(), category: row[catIdx]!.trim(), attributes };
  });
}
