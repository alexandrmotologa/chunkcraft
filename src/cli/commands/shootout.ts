import fs from 'node:fs';
import path from 'node:path';
import picocolors from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import { ModelShootout } from '../../core/evaluation/model-shootout.js';
import { getChunker } from '../../core/chunkers/index.js';
import { generateGoldenQueries } from '../../core/evaluation/golden-query-gen.js';
import { GoldenQuery } from '../../core/evaluation/metrics.js';

export interface ShootoutCommandOptions {
  eval?: string;
  strategy?: string;
  chunkSize?: string;
  chunkOverlap?: string;
  providers?: string;
  json?: boolean;
}

export async function executeShootout(filePath: string, options: ShootoutCommandOptions): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(picocolors.red(`Error: File not found at ${resolvedPath}`));
    process.exit(1);
  }

  const documentText = fs.readFileSync(resolvedPath, 'utf8');
  const documentId = path.basename(resolvedPath);

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

  const strategyName = options.strategy || 'recursive-char';
  const chunkSize = Number(options.chunkSize) || 500;
  const chunkOverlap = Number(options.chunkOverlap) || 50;

  const chunker = getChunker(strategyName);
  const chunks = await chunker.chunk(documentText, { chunkSize, chunkOverlap }, documentId);

  const providerList = options.providers
    ? options.providers.split(',').map(p => p.trim())
    : ['bm25', 'mock-384', 'mock-768'];

  const targets = providerList.map(p => {
    if (p === 'bm25') return { provider: 'bm25', dimensions: 0 };
    if (p === 'mock-384') return { provider: 'mock', dimensions: 384 };
    if (p === 'mock-768') return { provider: 'mock', dimensions: 768 };
    if (p.includes(':')) {
      const [name, dim] = p.split(':');
      return { provider: name, dimensions: Number(dim) || 384 };
    }
    return { provider: p };
  });

  const spinner = ora(
    `Running Embedding Model Shootout on "${documentId}" across ${targets.length} models...`
  ).start();

  try {
    const shootout = new ModelShootout();
    const result = await shootout.runShootout(chunks, queries, targets, documentId);

    spinner.succeed(
      picocolors.green(
        `Embedding Model Shootout complete in ${result.durationMs}ms across ${result.testedProvidersCount} models!`
      )
    );

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log();
    console.log(
      picocolors.bold(
        picocolors.cyan(`★ Shootout Winner for "${documentId}": ${result.winner.provider} (${result.winner.model})`)
      )
    );
    console.log(
      `  MRR: ${picocolors.green(result.winner.metrics.meanReciprocalRank.toString())} | Recall@3: ${result.winner.metrics.recallAt3} | P@1: ${result.winner.metrics.precisionAt1} | Latency: ${result.winner.avgQueryLatencyMs}ms`
    );
    console.log();

    const table = new Table({
      head: [
        picocolors.bold('Rank'),
        picocolors.bold('Provider/Model'),
        picocolors.bold('Dims'),
        picocolors.bold('MRR'),
        picocolors.bold('Recall@3'),
        picocolors.bold('P@1'),
        picocolors.bold('Index Time'),
        picocolors.bold('Query Latency'),
        picocolors.bold('Est. Storage')
      ],
      style: { head: [], border: [] }
    });

    for (const c of result.candidates) {
      table.push([
        c.rank === 1 ? picocolors.bold(picocolors.yellow(`★ #1`)) : `#${c.rank}`,
        `${c.provider} (${c.model})`,
        c.dimensions === 0 ? 'Sparse' : c.dimensions.toString(),
        c.rank === 1 ? picocolors.green(c.metrics.meanReciprocalRank.toFixed(3)) : c.metrics.meanReciprocalRank.toFixed(3),
        c.metrics.recallAt3.toFixed(3),
        c.metrics.precisionAt1.toFixed(3),
        `${c.indexingLatencyMs}ms`,
        `${c.avgQueryLatencyMs}ms`,
        `${c.storageMb}MB`
      ]);
    }

    console.log(table.toString());
    console.log();
  } catch (error) {
    spinner.fail(picocolors.red('Shootout failed!'));
    console.error(error);
    process.exit(1);
  }
}
