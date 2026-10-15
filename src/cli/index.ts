import { Command } from 'commander';
import { executeChunk } from './commands/chunk.js';
import { executeBenchmark } from './commands/benchmark.js';
import { executeGenerateQueries } from './commands/generate-queries.js';
import { executeStudio } from './commands/studio.js';

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name('chunkcraft')
    .description('Production RAG chunking benchmark, embedding evaluation suite, and React 19 visual retrieval studio')
    .version('1.0.0');

  // chunk command
  program
    .command('chunk')
    .description('Chunk a document using a specific strategy and view metrics')
    .argument('<file>', 'Path to markdown or text document')
    .option('-s, --strategy <name>', 'Chunking strategy (recursive-char, markdown-ast, semantic-boundary, token-window, hierarchical)', 'recursive-char')
    .option('-c, --chunk-size <tokens>', 'Target chunk size in tokens', '500')
    .option('-o, --chunk-overlap <tokens>', 'Chunk overlap in tokens', '50')
    .option('--json', 'Output raw JSON chunks to stdout')
    .option('--output <path>', 'Write JSON chunks output to file')
    .action(executeChunk);

  // benchmark command
  program
    .command('benchmark')
    .description('Benchmark multiple chunking strategies against golden test queries')
    .argument('<file>', 'Path to markdown or text document')
    .option('-e, --eval <path>', 'Path to golden queries JSON file (auto-generated if omitted)')
    .option('--strategies <list>', 'Comma-separated strategy list to benchmark')
    .option('-p, --provider <name>', 'Embedding provider (mock, bm25, openai, voyage, ollama)', 'mock')
    .option('-c, --chunk-size <tokens>', 'Target chunk size in tokens', '500')
    .option('-o, --chunk-overlap <tokens>', 'Chunk overlap in tokens', '50')
    .option('-f, --format <type>', 'Output format: table, json, or markdown', 'table')
    .option('--export <path>', 'Export report to file (.html, .md, .json)')
    .action(executeBenchmark);

  // generate-queries command
  program
    .command('generate-queries')
    .description('Synthesize realistic golden evaluation queries directly from document structure')
    .argument('<file>', 'Path to markdown or text document')
    .option('-n, --count <number>', 'Number of queries to generate', '5')
    .option('--output <path>', 'File path to save queries JSON')
    .action(executeGenerateQueries);

  // studio command
  program
    .command('studio')
    .description('Launch the embedded React 19 visual inspection Studio')
    .argument('[file]', 'Optional initial document to load into the Studio')
    .option('-p, --port <number>', 'Port for local Studio server', '50090')
    .option('-h, --host <host>', 'Host address', 'localhost')
    .option('--no-open', 'Do not open browser automatically')
    .action(executeStudio);

  return program;
}
