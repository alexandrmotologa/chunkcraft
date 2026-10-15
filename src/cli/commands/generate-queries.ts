import fs from 'node:fs';
import path from 'node:path';
import picocolors from 'picocolors';
import { generateGoldenQueries } from '../../core/evaluation/golden-query-gen.js';

export interface GenerateQueriesOptions {
  count?: string;
  output?: string;
}

export async function executeGenerateQueries(filePath: string, options: GenerateQueriesOptions): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(picocolors.red(`Error: File not found at ${resolvedPath}`));
    process.exit(1);
  }

  const documentText = fs.readFileSync(resolvedPath, 'utf8');
  const count = Number(options.count) || 5;

  const queries = generateGoldenQueries(documentText, count);

  if (options.output) {
    const outPath = path.resolve(options.output);
    fs.writeFileSync(outPath, JSON.stringify(queries, null, 2), 'utf8');
    console.log(picocolors.green(`✓ Generated ${queries.length} golden queries and saved to ${options.output}`));
  } else {
    console.log(JSON.stringify(queries, null, 2));
  }
}
