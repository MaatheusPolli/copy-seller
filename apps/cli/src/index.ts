#!/usr/bin/env tsx
import { Command } from 'commander';
import { PROMPTS } from '@copy-seller/core';
import { avaliar } from './commands/avaliar.js';
import { comparar } from './commands/comparar.js';
import { gerar } from './commands/gerar.js';
import { lote } from './commands/lote.js';

const program = new Command('copy-seller').description('Gera, valida e pontua copy de produto para marketplaces');

const common = (cmd: Command) =>
  cmd
    .option('--canais <ids>', 'canais separados por vírgula ou "todos"', 'mercadolivre,amazon,shopee')
    .option('--perfis <dir>', 'diretório dos perfis YAML', 'profiles')
    .option('--modelo <id>', 'modelo gerador', 'claude-opus-5')
    .option('--modelo-juiz <id>', 'modelo juiz', 'claude-opus-5');

common(program.command('gerar').description('Gera copy de um produto para cada canal'))
  .option('--csv <arquivo>', 'CSV de produtos')
  .option('--sku <sku>', 'SKU no CSV (padrão: primeiro)')
  .option('--json <arquivo>', 'produto em JSON { sku, category, attributes }')
  .option('--prompt <id>', `versão do prompt (${Object.keys(PROMPTS).join(', ')})`, 'v3')
  .option('--feedback <texto...>', 'instruções extras para regenerar')
  .option('--sem-juiz', 'não chama o juiz')
  .option('--max-custo <usd>', 'teto de custo por canal', '0.5')
  .action(gerar);

common(program.command('lote').description('CSV → CSV, retomável via checkpoint'))
  .argument('<entrada>', 'CSV de produtos')
  .argument('<saida>', 'CSV de saída')
  .option('--checkpoint <arquivo>', 'checkpoint JSONL (padrão: <saida>.checkpoint.jsonl)')
  .option('--prompt <id>', 'versão do prompt', 'v3')
  .option('--juiz', 'também pontua cada copy válida')
  .option('--max-custo <usd>', 'teto de custo do lote inteiro', '50')
  .option('--max-custo-item <usd>', 'teto por produto × canal', '0.5')
  .option('--concorrencia <n>', 'chamadas simultâneas', '4')
  .action(lote);

common(program.command('avaliar').description('Avalia uma versão de prompt sobre o dataset'))
  .option('--dataset <arquivo>', 'JSONL de avaliação', 'data/eval/dataset.jsonl')
  .option('--prompt <id>', 'versão do prompt', 'v3')
  .option('--saida <arquivo>', 'relatório Markdown', 'report/eval.md')
  .action(avaliar);

common(program.command('comparar').description('A/B entre duas versões de prompt'))
  .requiredOption('--a <id>', 'prompt A')
  .requiredOption('--b <id>', 'prompt B')
  .option('--dataset <arquivo>', 'JSONL de avaliação', 'data/eval/dataset.jsonl')
  .option('--saida <arquivo>', 'relatório Markdown (padrão: report/ab-<a>-vs-<b>.md)')
  .action(comparar);

program.parseAsync().catch((err: Error) => {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
});
