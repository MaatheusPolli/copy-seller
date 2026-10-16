# CopySeller

Gera tÃ­tulos e descriÃ§Ãµes de produto para marketplaces com Claude. Toda copy passa por **regras declarativas por canal**, **validaÃ§Ã£o determinÃ­stica**, **LLM-as-judge com rubrica** e **comparaÃ§Ã£o A/B entre versÃµes de prompt** com estatÃ­stica.

> Engenharia de prompt como disciplina medida: cada resultado carrega o `promptId` que o gerou, e trocar de prompt exige vencer um A/B.

## Antes / depois

Mesmo produto (`MOC-001`: mochila Trilha Explorer 30L, preta, nylon, impermeÃ¡vel) para o Mercado Livre (tÃ­tulo â‰¤ 60, comeÃ§ando pela categoria, sem promessas comerciais):

| | TÃ­tulo | Resultado |
|---|---|---|
| LLM sem controle | `Trilha Explorer 30L â€“ A MELHOR mochila impermeÃ¡vel com FRETE GRÃTIS e garantia vitalÃ­cia!` | âœ— 89 caracteres Â· nÃ£o comeÃ§a com a categoria Â· "frete grÃ¡tis" e "garantia vitalÃ­cia" proibidos Â· "garantia" nÃ£o estÃ¡ nos dados |
| CopySeller | `Mochila Trilha Explorer 30L Preta ImpermeÃ¡vel Nylon 600D` | âœ“ 56/60 Â· categoria no inÃ­cio Â· sÃ³ atributos presentes nos dados |

## Como funciona

```
Produto + Perfil de canal (YAML)
        â”‚
    Generator â”€â”€ Claude, tool use (saÃ­da estruturada), prompt versionado
        â”‚
    Validator â”€â”€ puro: limites Â· obrigatÃ³rios Â· proibidos Â· alegaÃ§Ãµes sem suporte
        â”œâ”€â”€ corrigÃ­vel   â†’ auto-fix (truncar sem cortar palavra, remover HTML, reordenar)
        â””â”€â”€ nÃ£o corrigÃ­vel â†’ regenerar com o motivo como feedback (mÃ¡x. N, teto de custo)
        â”‚
    Judge â”€â”€â”€â”€â”€â”€ Claude, rubrica 0â€“5 com Ã¢ncoras, justificativa antes da nota
        â”‚
    { copy, issues, fixed, scores, promptId, attempts, costUsd }
```

DecisÃµes:

- **Canal Ã© dado, nÃ£o cÃ³digo.** Adicionar um marketplace = criar um YAML em [`profiles/`](profiles).
- **Barato primeiro.** O juiz sÃ³ vÃª copy que jÃ¡ passou na validaÃ§Ã£o.
- **Ancoragem factual.** `extractClaims()` detecta alegaÃ§Ãµes ("impermeÃ¡vel", "bivolt", "garantia"...) e exige suporte nos atributos de entrada; sinÃ´nimos sÃ£o declarados por perfil.
- **O juiz tambÃ©m erra.** ComparaÃ§Ãµes pareadas rodam nas duas ordens (AÃ—B e BÃ—A): se as ordens discordam, Ã© empate marcado como viÃ©s de posiÃ§Ã£o. O prompt instrui a nÃ£o premiar volume, e o relatÃ³rio alerta quando as variantes diferem mais de 25% em tamanho.

## Canais

| Canal | TÃ­tulo mÃ¡x. | ComeÃ§a com | DescriÃ§Ã£o mÃ¡x. | HTML | ObrigatÃ³rios | Proibidos (exemplos) |
|---|---|---|---|---|---|---|
| Mercado Livre | 60 | categoria | 5.000 | nÃ£o | marca, modelo | frete grÃ¡tis, promoÃ§Ã£o, oferta, original |
| Amazon | 200 | marca | 2.000 | sim | marca, modelo, cor | best seller, #1, mais vendido |
| Shopee | 120 | â€” | 3.000 | nÃ£o | marca | whatsapp, link externo |
| VTEX | 150 | categoria | 10.000 | sim | marca, modelo | â€” |

## Uso

```bash
pnpm install
export ANTHROPIC_API_KEY=...   # ou `ant auth login`
```

```bash
# 1 produto â†’ 3 canais, com notas do juiz
pnpm cli gerar --sku MOC-001 --canais mercadolivre,amazon,shopee

# lote CSV â†’ CSV, retomÃ¡vel (Ctrl+C e rode de novo), com teto de custo
pnpm cli lote data/produtos-exemplo.csv saida.csv --max-custo 5 --juiz

# avaliaÃ§Ã£o de uma versÃ£o de prompt sobre o dataset
pnpm cli avaliar --prompt v3 --saida report/eval.md

# A/B entre versÃµes de prompt
pnpm cli comparar --a v2 --b v3 --saida report/ab-v2-vs-v3.md
```

UI (formulÃ¡rio, abas por canal, validaÃ§Ã£o, notas do juiz, regenerar com feedback):

```bash
pnpm --filter @copy-seller/web dev    # usa a API real
pnpm --filter @copy-seller/web demo   # LLM simulado, sem chave
```

## Prompts versionados

| id | MudanÃ§a |
|---|---|
| `v1` | Linha de base: instruÃ§Ã£o mÃ­nima, sem regras do canal |
| `v2` | Regras do perfil explÃ­citas + proibiÃ§Ã£o de alegaÃ§Ãµes fora dos dados |
| `v3` | Ordem de atributos no tÃ­tulo e foco em termos de busca |

Arquivos em [`packages/core/src/generate/prompts/`](packages/core/src/generate/prompts). O relatÃ³rio A/B fica em [`report/`](report).

## Como o A/B decide

1. Cada produto do dataset Ã© gerado com as duas variantes em cada canal.
2. Copy invÃ¡lida perde para a vÃ¡lida sem gastar o juiz.
3. Com as duas vÃ¡lidas, o juiz compara nas duas ordens; sÃ³ hÃ¡ vencedor se as ordens concordam.
4. **SignificÃ¢ncia:** teste do sinal exato bicaudal sobre as vitÃ³rias. **Tamanho do efeito:** d de Cohen pareado sobre as notas.
5. Sem p < 0,05, o veredito Ã© "inconclusivo" e o prompt atual continua.

## Testes

```bash
pnpm test:cov
```

86 testes, sem nenhuma chamada real (respostas gravadas em [`tests/fixtures/llm/`](tests/fixtures/llm)). Cobertura do core: 100% de linhas, 98% de branches; validaÃ§Ã£o com 100%. Destaques:

- tÃ­tulo 1 caractere acima do limite; termo proibido com variaÃ§Ã£o de caixa e acento; truncamento que nunca corta palavra (varredura de todos os limites);
- "impermeÃ¡vel" sem suporte nos dados Ã© sinalizado, e sinÃ´nimo do perfil nÃ£o gera falso positivo;
- viÃ©s de posiÃ§Ã£o: juiz que sempre prefere a primeira candidata resulta em empate sinalizado;
- A/B com notas sintÃ©ticas escolhe o vencedor certo e reporta o efeito;
- lote interrompido no meio (inclusive com linha cortada no checkpoint) retoma sem regerar nada.

## Estrutura

```
profiles/            perfis de canal (YAML + Zod)
data/                CSV de exemplo e dataset de avaliaÃ§Ã£o (JSONL)
packages/core/       domÃ­nio, validaÃ§Ã£o, geraÃ§Ã£o, juiz, A/B, lote
apps/cli/            gerar Â· lote Â· avaliar Â· comparar
apps/web/            React + Vite + Tailwind
tests/               unit + integraÃ§Ã£o com LLM gravado
report/              relatÃ³rios gerados (commitados como evidÃªncia)
```


## Licença

### Uso Pessoal
Este projeto é licenciado sob a **Licença MIT** para uso pessoal, educacional e não comercial.

### Uso Comercial
Se você deseja usar este projeto comercialmente, deve obter uma licença comercial do autor.

**Uso comercial inclui:**
- Incorporar em um produto comercial
- Oferecer como serviço
- Usar em atividades com fins lucrativos
- Implantação empresarial

**Para obter uma licença comercial:**
Email: ma.polli@hotmail.com
