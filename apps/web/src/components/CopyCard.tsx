import type { ChannelProfile, Copy } from '@copy-seller/core';

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span className={`text-xs tabular-nums ${length > max ? 'text-red-600' : 'text-stone-400'}`}>
      {length}/{max}
    </span>
  );
}

function Field({ label, children, extra }: { label: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function CopyCard({ copy, profile }: { copy: Copy; profile: ChannelProfile }) {
  return (
    <div className="space-y-4">
      <Field label="Título" extra={<Counter length={copy.title.length} max={profile.title.maxLength} />}>
        <p className="text-lg font-semibold leading-snug">{copy.title}</p>
      </Field>
      <Field label="Descrição curta">
        <p className="text-sm">{copy.shortDescription}</p>
      </Field>
      <Field label="Destaques">
        <ul className="list-disc space-y-0.5 pl-5 text-sm">
          {copy.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </Field>
      <Field
        label={`Descrição longa ${profile.description.allowHtml ? '(HTML)' : '(texto)'}`}
        extra={<Counter length={copy.longDescription.length} max={profile.description.maxLength} />}
      >
        {/* HTML mostrado como código: o texto vem de um LLM e não é renderizado */}
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-stone-100 p-3 font-sans text-sm">{copy.longDescription}</pre>
      </Field>
    </div>
  );
}
