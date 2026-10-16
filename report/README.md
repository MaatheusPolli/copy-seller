# Relatórios

Gerados pela CLI com chamadas reais ao Claude. Nenhum número aqui é escrito à mão.

| Arquivo | Comando |
|---|---|
| `ab-v2-vs-v3.md` | `pnpm cli comparar --a v2 --b v3 --canais todos --saida report/ab-v2-vs-v3.md` |
| `eval.md` | `pnpm cli avaliar --prompt v3 --canais todos --saida report/eval.md` |

Custo estimado com `claude-opus-5`: 12 produtos × 4 canais ≈ 48 itens; A/B ≈ 2 gerações + 2 chamadas do juiz por item.
