import { useState } from 'react';
import type { AttributeValue, Product } from '@copy-seller/core';

interface Row {
  key: string;
  value: string;
}

const EXAMPLE: Product = {
  sku: 'MOC-001',
  category: 'Mochila',
  attributes: { marca: 'Trilha', modelo: 'Explorer 30L', cor: 'Preta', material: 'Nylon 600D', capacidade: '30 L', impermeavel: true },
};

const toRows = (p: Product): Row[] =>
  Object.entries(p.attributes).map(([key, v]) => ({ key, value: v === true ? 'sim' : v === false ? 'não' : String(v) }));

function coerce(value: string): AttributeValue {
  if (/^sim$/i.test(value)) return true;
  if (/^n[ãa]o$/i.test(value)) return false;
  return value;
}

export function ProductForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (p: Product) => void }) {
  const [sku, setSku] = useState(EXAMPLE.sku);
  const [category, setCategory] = useState(EXAMPLE.category);
  const [rows, setRows] = useState<Row[]>(toRows(EXAMPLE));

  const update = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const attributes = Object.fromEntries(
      rows.filter((r) => r.key.trim() && r.value.trim()).map((r) => [r.key.trim(), coerce(r.value.trim())]),
    );
    onSubmit({ sku: sku.trim(), category: category.trim(), attributes });
  };

  const input = 'w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:border-amber-600 focus:outline-none';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-stone-600">
          SKU
          <input className={input} value={sku} onChange={(e) => setSku(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-stone-600">
          Categoria
          <input className={input} value={category} onChange={(e) => setCategory(e.target.value)} required />
        </label>
      </div>

      <fieldset>
        <legend className="mb-1 text-xs font-medium text-stone-600">
          Atributos <span className="font-normal text-stone-400">— só o que estiver aqui pode ser afirmado no texto</span>
        </legend>
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-1.5">
              <input className={`${input} w-2/5`} placeholder="atributo" value={r.key} onChange={(e) => update(i, { key: e.target.value })} />
              <input className={input} placeholder="valor (sim/não para booleanos)" value={r.value} onChange={(e) => update(i, { value: e.target.value })} />
              <button type="button" aria-label="Remover atributo" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-2 text-stone-400 hover:text-red-600">
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows([...rows, { key: '', value: '' }])} className="mt-2 text-xs font-medium text-amber-700 hover:underline">
          + atributo
        </button>
      </fieldset>

      <button disabled={disabled} className="w-full rounded-md bg-stone-900 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50">
        {disabled ? 'Gerando…' : 'Gerar copy'}
      </button>
    </form>
  );
}
