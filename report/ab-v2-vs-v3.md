# A/B: v2 vs v3

**v3 vence** — 25 × 12 (p = 0.047), efeito pequeno (d = -0.32).

> ⚠️ Diferença de tamanho > 25% entre variantes: verifique viés de verbosidade do juiz.

## Resumo

| Métrica | v2 (A) | v3 (B) |
|---|---|---|
| Vitórias | 12 | 25 |
| Copy válida (após auto-fix e regeneração) | 100% | 100% |
| Nota média do juiz | 4.19 | 4.34 |
| ↳ clareza | 3.61 | 4.35 |
| ↳ aderencia_canal | 4.01 | 3.90 |
| ↳ uso_atributos | 4.69 | 4.63 |
| Tamanho médio (título + descrição) | 731.85 | 572.33 |

- Itens (produto × canal): 48 · empates: 11
- Viés de posição detectado (ordens discordantes → empate): 23%
- Significância: teste do sinal exato bicaudal, p = 0.0470 (α = 0,05)
- Tamanho do efeito: d de Cohen pareado = -0.32 (pequeno)
- Custo total: US$ 23.6416

## Método

1. Cada produto do dataset é gerado com as duas variantes para cada canal.
2. Copy inválida após auto-fix e regeneração perde automaticamente para a válida (não gasta juiz).
3. Com as duas válidas, o juiz compara em pares **nas duas ordens** (A×B e B×A); só há vencedor se as ordens concordam.
4. Vitórias entram no teste do sinal; notas médias no d de Cohen pareado.

## Itens

| SKU | Canal | Válida A/B | Nota A | Nota B | Vencedor | Viés |
|---|---|---|---|---|---|---|
| MOC-001 | amazon | ✓/✓ | 4.71 | 4.21 | A |  |
| MOC-001 | mercadolivre | ✓/✓ | 4 | 4.57 | B |  |
| MOC-001 | shopee | ✓/✓ | 4.71 | 4.07 | A |  |
| MOC-001 | vtex | ✓/✓ | 4 | 4.21 | B |  |
| MOC-002 | amazon | ✓/✓ | 4.36 | 4.36 | tie | ⚠️ |
| MOC-002 | mercadolivre | ✓/✓ | 4.07 | 4.43 | B |  |
| MOC-002 | shopee | ✓/✓ | 4.57 | 3.86 | A |  |
| MOC-002 | vtex | ✓/✓ | 3.79 | 3.86 | tie | ⚠️ |
| GAR-001 | amazon | ✓/✓ | 4.43 | 4.57 | B |  |
| GAR-001 | mercadolivre | ✓/✓ | 4.14 | 4.43 | B |  |
| GAR-001 | shopee | ✓/✓ | 4.43 | 3.93 | A |  |
| GAR-001 | vtex | ✓/✓ | 3.64 | 4.57 | B |  |
| PAN-001 | amazon | ✓/✓ | 4.43 | 4.71 | B |  |
| PAN-001 | mercadolivre | ✓/✓ | 4.07 | 4.57 | B |  |
| PAN-001 | shopee | ✓/✓ | 3.43 | 4.57 | B |  |
| PAN-001 | vtex | ✓/✓ | 3.93 | 4.14 | tie | ⚠️ |
| FON-001 | amazon | ✓/✓ | 4.71 | 3.86 | A |  |
| FON-001 | mercadolivre | ✓/✓ | 4.57 | 4.21 | A |  |
| FON-001 | shopee | ✓/✓ | 4.43 | 4.43 | A |  |
| FON-001 | vtex | ✓/✓ | 4.43 | 4.71 | B |  |
| FON-002 | amazon | ✓/✓ | 4.21 | 4.71 | B |  |
| FON-002 | mercadolivre | ✓/✓ | 4.14 | 3.86 | A |  |
| FON-002 | shopee | ✓/✓ | 4.43 | 4.21 | A |  |
| FON-002 | vtex | ✓/✓ | 4 | 4.57 | B |  |
| LIQ-001 | amazon | ✓/✓ | 3.93 | 4.64 | B |  |
| LIQ-001 | mercadolivre | ✓/✓ | 4.14 | 4.21 | tie | ⚠️ |
| LIQ-001 | shopee | ✓/✓ | 4.57 | 4.21 | A |  |
| LIQ-001 | vtex | ✓/✓ | 3.71 | 4.29 | B |  |
| CAF-001 | amazon | ✓/✓ | 4.29 | 4.57 | B |  |
| CAF-001 | mercadolivre | ✓/✓ | 4.21 | 4.14 | tie | ⚠️ |
| CAF-001 | shopee | ✓/✓ | 4.57 | 4.14 | A |  |
| CAF-001 | vtex | ✓/✓ | 3.79 | 4 | B |  |
| LAN-001 | amazon | ✓/✓ | 4.21 | 4.57 | B |  |
| LAN-001 | mercadolivre | ✓/✓ | 4.29 | 3.86 | tie | ⚠️ |
| LAN-001 | shopee | ✓/✓ | 4.07 | 4.71 | B |  |
| LAN-001 | vtex | ✓/✓ | 3.93 | 4.57 | B |  |
| TEN-001 | amazon | ✓/✓ | 3.86 | 3.86 | tie | ⚠️ |
| TEN-001 | mercadolivre | ✓/✓ | 3.79 | 4.86 | B |  |
| TEN-001 | shopee | ✓/✓ | 4.07 | 4.21 | tie | ⚠️ |
| TEN-001 | vtex | ✓/✓ | 4.14 | 4.29 | B |  |
| CAM-001 | amazon | ✓/✓ | 3.93 | 4.43 | B |  |
| CAM-001 | mercadolivre | ✓/✓ | 4.29 | 4.57 | B |  |
| CAM-001 | shopee | ✓/✓ | 4.43 | 4.43 | tie | ⚠️ |
| CAM-001 | vtex | ✓/✓ | 4.14 | 4.57 | tie | ⚠️ |
| CAI-001 | amazon | ✓/✓ | 4.21 | 4.21 | tie | ⚠️ |
| CAI-001 | mercadolivre | ✓/✓ | 3.93 | 4.86 | B |  |
| CAI-001 | shopee | ✓/✓ | 4.71 | 4.14 | A |  |
| CAI-001 | vtex | ✓/✓ | 4.14 | 4.29 | B |  |
