import fs from 'node:fs';
import path from 'node:path';
import picocolors from 'picocolors';
import ora from 'ora';
import { BenchmarkRunner } from '../../core/evaluation/test-runner.js';
import { generateGoldenQueries } from '../../core/evaluation/golden-query-gen.js';
import {
  formatTerminalTable,
  formatMarkdown,
  formatJson,
  formatHtmlReport
} from '../../core/evaluation/report-exporter.js';
import { GoldenQuery } from '../../core/evaluation/metrics.js';

export interface BenchmarkCommandOptions {
  eval?: string;
  strategies?: string;
  provider?: string;
  chunkSize?: string;
  chunkOverlap?: string;
  format?: 'table' | 'json' | 'markdown';
  export?: string;
}

export async function executeBenchmark(filePath: string, options: BenchmarkCommandOptions): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(picocolors.red(`Error: File not found at ${resolvedPath}`));
    process.exit(1);
  }

  const documentText = fs.readFileSync(resolvedPath, 'utf8');
  const documentId = path.basename(resolvedPath);

  // Load or generate queries
  let queries: GoldenQuery[] = [];
  if (options.eval) {
    const evalPath = path.resolve(options.eval);
    if (!fs.existsSync(evalPath)) {
      console.error(picocolors.red(`Error: Evaluation queries file not found at ${evalPath}`));
      process.exit(1);
    }
    queries = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
  } else {
    queries = generateGoldenQueries(documentText, 5);
  }

  const strategies = options.strategies
    ? options.strategies.split(',').map(s => s.trim())
    : ['recursive-char', 'markdown-ast', 'semantic-boundary', 'token-window', 'hierarchical'];

  const provider = options.provider || 'mock';
  const chunkSize = Number(options.chunkSize) || 500;
  const chunkOverlap = Number(options.chunkOverlap) || 50;
  const outputFormat = options.format || 'table';

  const spinner = ora(
    `Running benchmark suite on "${documentId}" across ${strategies.length} strategies using provider "${provider}"...`
  ).start();

  try {
    const runner = new BenchmarkRunner();
    const suite = await runner.runSuite(documentText, queries, {
      chunkSize,
      chunkOverlap,
      strategies,
      provider
    }, documentId);

    spinner.succeed(`Benchmark complete across ${strategies.length} strategies and ${queries.length} queries.`);

    // Output formatting
    if (outputFormat === 'json') {
      console.log(formatJson(suite));
    } else if (outputFormat === 'markdown') {
      console.log(formatMarkdown(suite));
    } else {
      console.log(formatTerminalTable(suite));
    }

    // Export file if requested
    if (options.export) {
      const exportPath = path.resolve(options.export);
      const ext = path.extname(exportPath).toLowerCase();
      let content = '';

      if (ext === '.html') {
        content = formatHtmlReport(suite);
      } else if (ext === '.json') {
        content = formatJson(suite);
      } else {
        content = formatMarkdown(suite);
      }

      fs.writeFileSync(exportPath, content, 'utf8');
      console.log(picocolors.green(`✓ Exported benchmark report to ${exportPath}`));
    }
  } catch (error: any) {
    spinner.fail(`Benchmark failed: ${error.message}`);
    process.exit(1);
  }
}
