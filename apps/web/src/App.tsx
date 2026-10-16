import { useEffect, useState } from 'react';
import type { Product } from '@copy-seller/core';
import { gerar, getConfig, type Config, type GerarResponse } from './api';
import { ChannelTabs } from './components/ChannelTabs';
import { CopyCard } from './components/CopyCard';
import { IssueList } from './components/IssueList';
import { ProductForm } from './components/ProductForm';
import { ScorePanel } from './components/ScorePanel';

export function App() {
  const [config, setConfig] = useState<Config>();
  const [channels, setChannels] = useState<string[]>(['mercadolivre', 'amazon', 'shopee']);
  const [promptId, setPromptId] = useState('v3');
  const [product, setProduct] = useState<Product>();
  const [response, setResponse] = useState<GerarResponse>();
  const [active, setActive] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getConfig().then(setConfig, (e: Error) => setError(e.message));
  }, []);

  const run = async (p: Product, extra?: string, only?: string[]) => {
    setProduct(p);
    setLoading(true);
    setError(undefined);
    try {
      const res = await gerar({ product: p, channels: only ?? channels, promptId, feedback: extra ? [extra] : undefined });
      // regenerar um canal substitui só aquele resultado
      setResponse((prev) =>
        only && prev
          ? { ...res, results: prev.results.map((r) => res.results.find((n) => n.channel === r.channel) ?? r) }
          : res,
      );
      setActive((a) => (only ? a : res.results[0]?.channel ?? ''));
      if (only) setFeedback('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const result = response?.results.find((r) => r.channel === active);
  const profile = config?.profiles.find((p) => p.id === active);
  const totalCost = response?.results.reduce((a, r) => a + r.costUsd, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">CopySeller</h1>
          <p className="text-sm text-stone-500">Gera, valida e pontua copy de produto por marketplace.</p>
        </div>
        {config?.demo && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">modo demo · LLM simulado</span>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-5 rounded-lg border border-stone-200 bg-white p-4">
          <div>
            <p className="mb-1 text-xs font-medium text-stone-600">Canais</p>
            <div className="flex flex-wrap gap-1.5">
              {config?.profiles.map((p) => {
                const on = channels.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChannels(on ? channels.filter((c) => c !== p.id) : [...channels, p.id])}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-600'}`}
                  >
                    {p.id}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block text-xs font-medium text-stone-600">
            Versão do prompt
            <select
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
            >
              {config?.prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-normal text-stone-400">
              {config?.prompts.find((p) => p.id === promptId)?.changelog}
            </span>
          </label>
          <hr className="border-stone-200" />
          <ProductForm disabled={loading || !channels.length} onSubmit={(p) => run(p)} />
        </aside>

        <main className="min-w-0 rounded-lg border border-stone-200 bg-white p-4">
          {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!response && !error && (
            <p className="py-20 text-center text-sm text-stone-400">Preencha o produto e clique em “Gerar copy”.</p>
          )}
          {response && (
            <>
              <ChannelTabs results={response.results} active={active} onSelect={setActive} />
              <p className="mt-2 text-xs text-stone-400">
                {(response.elapsedMs / 1000).toFixed(1)} s · US$ {totalCost.toFixed(4)} no total
              </p>
              {result && profile && (
                <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_280px]">
                  <div className="space-y-6">
                    {result.copy ? <CopyCard copy={result.copy} profile={profile} /> : <p className="text-sm text-red-700">Nenhuma copy válida gerada.</p>}
                    <p className="text-xs text-stone-400">
                      prompt {result.promptId} · {result.attempts} tentativa(s) · US$ {result.costUsd.toFixed(4)}
                    </p>
                  </div>
                  <div className="space-y-6">
                    <section>
                      <h2 className="mb-2 text-sm font-semibold">Validação</h2>
                      <IssueList issues={result.issues} fixed={result.fixed} error={result.error} />
                    </section>
                    <section>
                      <h2 className="mb-2 text-sm font-semibold">Juiz</h2>
                      <ScorePanel scores={result.scores} />
                    </section>
                    <section>
                      <h2 className="mb-2 text-sm font-semibold">Regenerar com feedback</h2>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                        placeholder="Ex.: destaque a capacidade no início do título"
                        className="w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-sm"
                      />
                      <button
                        disabled={loading || !product}
                        onClick={() => product && run(product, feedback, [active])}
                        className="mt-2 w-full rounded-md border border-stone-900 py-1.5 text-sm font-medium hover:bg-stone-100 disabled:opacity-50"
                      >
                        {loading ? 'Gerando…' : `Regenerar ${active}`}
                      </button>
                    </section>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
