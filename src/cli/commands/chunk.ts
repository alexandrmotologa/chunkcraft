import fs from 'node:fs';
import path from 'node:path';
import picocolors from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import { getChunker, calculateChunkStats } from '../../core/chunkers/index.js';

export interface ChunkCommandOptions {
  strategy?: string;
  chunkSize?: string;
  chunkOverlap?: string;
  preserveCodeBlocks?: boolean;
  preserveHeaders?: boolean;
  json?: boolean;
  output?: string;
}

export async function executeChunk(filePath: string, options: ChunkCommandOptions): Promise<void> {
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

  const spinner = ora(`Chunking "${documentId}" with strategy "${strategyName}"...`).start();

  try {
    const chunker = getChunker(strategyName);
    const startTime = performance.now();
    const chunks = await chunker.chunk(documentText, {
      chunkSize,
      chunkOverlap,
      preserveCodeBlocks: options.preserveCodeBlocks ?? true,
      preserveHeaders: options.preserveHeaders ?? true
    }, documentId);
    const durationMs = performance.now() - startTime;

    const stats = calculateChunkStats(chunks, documentText, durationMs);
    spinner.succeed(`Generated ${chunks.length} chunks in ${durationMs.toFixed(1)}ms`);

    if (options.json) {
      const outputData = {
        documentId,
        strategy: strategyName,
        options: { chunkSize, chunkOverlap },
        stats,
        chunks
      };
      if (options.output) {
        fs.writeFileSync(path.resolve(options.output), JSON.stringify(outputData, null, 2), 'utf8');
        console.log(picocolors.green(`Saved chunks to ${options.output}`));
      } else {
        console.log(JSON.stringify(outputData, null, 2));
      }
      return;
    }

    // Display summary table
    const table = new Table({
      head: [picocolors.bold('Metric'), picocolors.bold('Value')],
      style: { head: [], border: [] }
    });

    table.push(
      ['Document', picocolors.cyan(documentId)],
      ['Length', `${documentText.length.toLocaleString()} characters`],
      ['Strategy', picocolors.cyan(strategyName)],
      ['Target Chunk Size', `${chunkSize} tokens`],
      ['Chunk Overlap', `${chunkOverlap} tokens`],
      ['Total Chunks', picocolors.bold(stats.totalChunks.toString())],
      ['Average Tokens', `${stats.averageChunkTokens.toFixed(1)} tokens`],
      ['Min / Max Tokens', `${stats.minChunkTokens} / ${stats.maxChunkTokens}`],
      ['Token Variance', stats.varianceChunkTokens.toFixed(1)],
      ['Fragmentation Score', `${(stats.fragmentationScore * 100).toFixed(1)}%`],
      ['Processing Time', `${stats.durationMs.toFixed(1)} ms`]
    );

    console.log('\n' + table.toString() + '\n');

    // Display first 2 chunks preview
    console.log(picocolors.bold('=== Chunk Previews (First 2) ===\n'));
    for (let i = 0; i < Math.min(2, chunks.length); i++) {
      const c = chunks[i];
      console.log(
        picocolors.cyan(`[Chunk #${c.index} | ${c.tokenCount} tokens | chars ${c.startIndex}-${c.endIndex}]`)
      );
      if (c.metadata.sectionHeader) {
        console.log(picocolors.dim(`Section: ${c.metadata.sectionHeader}`));
      }
      console.log(c.content.slice(0, 180) + '...\n');
    }

    if (options.output) {
      fs.writeFileSync(
        path.resolve(options.output),
        JSON.stringify({ documentId, strategy: strategyName, stats, chunks }, null, 2),
        'utf8'
      );
      console.log(picocolors.green(`✓ Saved complete chunk output to ${options.output}`));
    }
  } catch (error: any) {
    spinner.fail(`Chunking failed: ${error.message}`);
    process.exit(1);
  }
}
