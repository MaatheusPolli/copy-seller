# CopySeller

Gera títulos e descrições de produto para marketplaces com Claude. Toda copy passa por **regras declarativas por canal**, **validação determinística**, **LLM-as-judge com rubrica** e **comparação A/B entre versões de prompt** com estatística.

> Engenharia de prompt como disciplina medida: cada resultado carrega o `promptId` que o gerou, e trocar de prompt exige vencer um A/B.

## Antes / depois

Mesmo produto (`MOC-001`: mochila Trilha Explorer 30L, preta, nylon, impermeável) para o Mercado Livre (título ≤ 60, começando pela categoria, sem promessas comerciais):

| | Título | Resultado |
|---|---|---|
| LLM sem controle | `Trilha Explorer 30L – A MELHOR mochila impermeável com FRETE GRÁTIS e garantia vitalícia!` | ✗ 89 caracteres · não começa com a categoria · "frete grátis" e "garantia vitalícia" proibidos · "garantia" não está nos dados |
| CopySeller | `Mochila Trilha Explorer 30L Preta Impermeável Nylon 600D` | ✓ 56/60 · categoria no início · só atributos presentes nos dados |

## Como funciona

```
Produto + Perfil de canal (YAML)
        │
    Generator ── Claude, tool use (saída estruturada), prompt versionado
        │
    Validator ── puro: limites · obrigatórios · proibidos · alegações sem suporte
        ├── corrigível   → auto-fix (truncar sem cortar palavra, remover HTML, reordenar)
        └── não corrigível → regenerar com o motivo como feedback (máx. N, teto de custo)
        │
    Judge ────── Claude, rubrica 0–5 com âncoras, justificativa antes da nota
        │
    { copy, issues, fixed, scores, promptId, attempts, costUsd }
```

Decisões:

- **Canal é dado, não código.** Adicionar um marketplace = criar um YAML em [`profiles/`](profiles).
- **Barato primeiro.** O juiz só vê copy que já passou na validação.
- **Ancoragem factual.** `extractClaims()` detecta alegações ("impermeável", "bivolt", "garantia"...) e exige suporte nos atributos de entrada; sinônimos são declarados por perfil.
- **O juiz também erra.** Comparações pareadas rodam nas duas ordens (A×B e B×A): se as ordens discordam, é empate marcado como viés de posição. O prompt instrui a não premiar volume, e o relatório alerta quando as variantes diferem mais de 25% em tamanho.

## Canais

| Canal | Título máx. | Começa com | Descrição máx. | HTML | Obrigatórios | Proibidos (exemplos) |
|---|---|---|---|---|---|---|
| Mercado Livre | 60 | categoria | 5.000 | não | marca, modelo | frete grátis, promoção, oferta, original |
| Amazon | 200 | marca | 2.000 | sim | marca, modelo, cor | best seller, #1, mais vendido |
| Shopee | 120 | — | 3.000 | não | marca | whatsapp, link externo |
| VTEX | 150 | categoria | 10.000 | sim | marca, modelo | — |

## Uso

```bash
pnpm install
export ANTHROPIC_API_KEY=...   # ou `ant auth login`
```

```bash
# 1 produto → 3 canais, com notas do juiz
pnpm cli gerar --sku MOC-001 --canais mercadolivre,amazon,shopee

# lote CSV → CSV, retomável (Ctrl+C e rode de novo), com teto de custo
pnpm cli lote data/produtos-exemplo.csv saida.csv --max-custo 5 --juiz

# avaliação de uma versão de prompt sobre o dataset
pnpm cli avaliar --prompt v3 --saida report/eval.md

# A/B entre versões de prompt
pnpm cli comparar --a v2 --b v3 --saida report/ab-v2-vs-v3.md
```

UI (formulário, abas por canal, validação, notas do juiz, regenerar com feedback):

```bash
pnpm --filter @copy-seller/web dev    # usa a API real
pnpm --filter @copy-seller/web demo   # LLM simulado, sem chave
```

## Prompts versionados

| id | Mudança |
|---|---|
| `v1` | Linha de base: instrução mínima, sem regras do canal |
| `v2` | Regras do perfil explícitas + proibição de alegações fora dos dados |
| `v3` | Ordem de atributos no título e foco em termos de busca |

Arquivos em [`packages/core/src/generate/prompts/`](packages/core/src/generate/prompts). O relatório A/B fica em [`report/`](report).

## Como o A/B decide

1. Cada produto do dataset é gerado com as duas variantes em cada canal.
2. Copy inválida perde para a válida sem gastar o juiz.
3. Com as duas válidas, o juiz compara nas duas ordens; só há vencedor se as ordens concordam.
4. **Significância:** teste do sinal exato bicaudal sobre as vitórias. **Tamanho do efeito:** d de Cohen pareado sobre as notas.
5. Sem p < 0,05, o veredito é "inconclusivo" e o prompt atual continua.

## Testes

```bash
pnpm test:cov
```

86 testes, sem nenhuma chamada real (respostas gravadas em [`tests/fixtures/llm/`](tests/fixtures/llm)). Cobertura do core: 100% de linhas, 98% de branches; validação com 100%. Destaques:

- título 1 caractere acima do limite; termo proibido com variação de caixa e acento; truncamento que nunca corta palavra (varredura de todos os limites);
- "impermeável" sem suporte nos dados é sinalizado, e sinônimo do perfil não gera falso positivo;
- viés de posição: juiz que sempre prefere a primeira candidata resulta em empate sinalizado;
- A/B com notas sintéticas escolhe o vencedor certo e reporta o efeito;
- lote interrompido no meio (inclusive com linha cortada no checkpoint) retoma sem regerar nada.

## Estrutura

```
profiles/            perfis de canal (YAML + Zod)
data/                CSV de exemplo e dataset de avaliação (JSONL)
packages/core/       domínio, validação, geração, juiz, A/B, lote
apps/cli/            gerar · lote · avaliar · comparar
apps/web/            React + Vite + Tailwind
tests/               unit + integração com LLM gravado
report/              relatórios gerados (commitados como evidência)
```
