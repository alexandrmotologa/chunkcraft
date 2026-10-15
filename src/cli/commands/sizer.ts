import fs from 'node:fs';
import path from 'node:path';
import picocolors from 'picocolors';
import Table from 'cli-table3';
import { getChunker } from '../../core/chunkers/index.js';
import { calculateCostAndSizing } from '../../core/storage/cost-calculator.js';

export interface SizerCommandOptions {
  strategy?: string;
  chunkSize?: string;
  chunkOverlap?: string;
  json?: boolean;
}

export async function executeSizer(filePath: string, options: SizerCommandOptions): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(picocolors.red(`Error: File not found at ${resolvedPath}`));
    process.exit(1);
  }

  const documentText = fs.readFileSync(resolvedPath, 'utf8');
  const documentId = path.basename(resolvedPath);

  const strategyName = options.strategy || 'recursive-char';
  const chunkSize = Number(options.chunkSize) || 500;
  const chunkOverlap = Number(options.chunkOverlap) || 50;

  const chunker = getChunker(strategyName);
  const chunks = await chunker.chunk(documentText, { chunkSize, chunkOverlap }, documentId);
  const totalTokens = chunks.reduce((acc, c) => acc + c.tokenCount, 0);

  const estimate = calculateCostAndSizing(totalTokens, chunks.length);

  if (options.json) {
    console.log(JSON.stringify(estimate, null, 2));
    return;
  }

  console.log();
  console.log(
    picocolors.bold(
      picocolors.cyan(`Cost & Vector DB Storage Sizer for "${documentId}":`)
    )
  );
  console.log(
    `  Total Chunks: ${picocolors.bold(estimate.totalChunks.toString())} | Total Tokens: ${picocolors.bold(estimate.totalTokens.toLocaleString())} | Avg Tokens/Chunk: ${picocolors.bold(estimate.avgTokensPerChunk.toString())}`
  );
  console.log();

  const table = new Table({
    head: [
      picocolors.bold('Provider / Model'),
      picocolors.bold('Dimensions'),
      picocolors.bold('Ingestion Cost'),
      picocolors.bold('Raw Vectors'),
      picocolors.bold('HNSW Index (RAM)'),
      picocolors.bold('Total Footprint')
    ],
    style: { head: [], border: [] }
  });

  for (const p of estimate.providerEstimates) {
    const costStr = p.ingestionCostUsd === 0 ? picocolors.green('$0.00 (Self-hosted)') : `$${p.ingestionCostUsd.toFixed(5)}`;
    table.push([
      `${p.provider} (${p.model})`,
      p.dimensions.toString(),
      costStr,
      `${(p.rawVectorBytes / 1024).toFixed(1)} KB`,
      `${(p.hnswIndexBytes / 1024).toFixed(1)} KB`,
      picocolors.bold(`${p.totalStorageMb} MB`)
    ]);
  }

  console.log(table.toString());
  console.log();
}
