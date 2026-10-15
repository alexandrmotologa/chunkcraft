import fs from 'node:fs';
import path from 'node:path';
import picocolors from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import { AutoTuner } from '../../core/evaluation/auto-tuner.js';
import { generateGoldenQueries } from '../../core/evaluation/golden-query-gen.js';
import { GoldenQuery } from '../../core/evaluation/metrics.js';

export interface TuneCommandOptions {
  eval?: string;
  sizes?: string;
  overlaps?: string;
  strategies?: string;
  provider?: string;
  json?: boolean;
}

export async function executeTune(filePath: string, options: TuneCommandOptions): Promise<void> {
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

  const chunkSizes = options.sizes
    ? options.sizes.split(',').map(s => Number(s.trim()))
    : [250, 500, 800];

  const chunkOverlaps = options.overlaps
    ? options.overlaps.split(',').map(s => Number(s.trim()))
    : [0, 50, 100];

  const strategies = options.strategies
    ? options.strategies.split(',').map(s => s.trim())
    : ['recursive-char', 'markdown-ast', 'semantic-boundary'];

  const provider = options.provider || 'mock';

  const spinner = ora(
    `Running Auto-Tuning grid search on "${documentId}" across ${chunkSizes.length * chunkOverlaps.length * strategies.length} candidate combinations...`
  ).start();

  try {
    const tuner = new AutoTuner();
    const result = await tuner.tune(
      documentText,
      queries,
      {
        chunkSizes,
        chunkOverlaps,
        strategies,
        provider
      },
      documentId
    );

    spinner.succeed(
      picocolors.green(
        `Auto-Tuning complete in ${result.durationMs}ms across ${result.evaluatedConfigurationsCount} configurations!`
      )
    );

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log();
    console.log(
      picocolors.bold(
        picocolors.cyan(`★ Recommended Pareto-Optimal Configuration for "${documentId}":`)
      )
    );
    console.log(
      `  Strategy: ${picocolors.bold(result.bestCandidate.strategy)} | Chunk Size: ${picocolors.bold(result.bestCandidate.chunkSize.toString())} | Overlap: ${picocolors.bold(result.bestCandidate.chunkOverlap.toString())} | Fitness: ${picocolors.green(result.bestCandidate.fitnessScore.toString())}`
    );
    console.log(
      `  MRR: ${result.bestCandidate.metrics.meanReciprocalRank} | Recall@3: ${result.bestCandidate.metrics.recallAt3} | P@1: ${result.bestCandidate.metrics.precisionAt1} | Chunks: ${result.bestCandidate.metrics.totalChunks}`
    );
    console.log();

    const table = new Table({
      head: [
        picocolors.bold('Rank'),
        picocolors.bold('Strategy'),
        picocolors.bold('Size'),
        picocolors.bold('Overlap'),
        picocolors.bold('Fitness'),
        picocolors.bold('MRR'),
        picocolors.bold('Recall@3'),
        picocolors.bold('P@1'),
        picocolors.bold('Chunks')
      ],
      style: { head: [], border: [] }
    });

    const top5 = result.candidates.slice(0, 10);
    for (const c of top5) {
      table.push([
        c.rank === 1 ? picocolors.bold(picocolors.yellow(`★ #1`)) : `#${c.rank}`,
        c.strategy,
        c.chunkSize.toString(),
        c.chunkOverlap.toString(),
        c.rank === 1 ? picocolors.green(c.fitnessScore.toFixed(4)) : c.fitnessScore.toFixed(4),
        c.metrics.meanReciprocalRank.toFixed(3),
        c.metrics.recallAt3.toFixed(3),
        c.metrics.precisionAt1.toFixed(3),
        c.metrics.totalChunks.toString()
      ]);
    }

    console.log(table.toString());
    console.log();
  } catch (error) {
    spinner.fail(picocolors.red('Auto-Tuning failed!'));
    console.error(error);
    process.exit(1);
  }
}
