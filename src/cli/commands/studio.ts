import path from 'node:path';
import picocolors from 'picocolors';
import open from 'open';
import { LocalServer } from '../../server/local-server.js';

export interface StudioCommandOptions {
  port?: string;
  host?: string;
  open?: boolean;
}

export async function executeStudio(filePath?: string, options: StudioCommandOptions = {}): Promise<void> {
  const port = Number(options.port) || 50090;
  const host = options.host || 'localhost';
  const shouldOpen = options.open !== false;

  let resolvedPath: string | undefined;
  if (filePath) {
    resolvedPath = path.resolve(filePath);
  }

  const server = new LocalServer({
    documentPath: resolvedPath
  });

  try {
    const { port: actualPort, url } = await server.start(port, host);

    console.log('\n' + picocolors.bold(picocolors.cyan('┌─────────────────────────────────────────────────────────┐')));
    console.log(picocolors.bold(picocolors.cyan('│                ChunkCraft Web Studio                    │')));
    console.log(picocolors.bold(picocolors.cyan('└─────────────────────────────────────────────────────────┘')));
    console.log(`\n  ${picocolors.green('●')} Studio running at: ${picocolors.bold(picocolors.underline(url))}`);
    if (resolvedPath) {
      console.log(`  ${picocolors.cyan('●')} Loaded document:   ${picocolors.bold(path.basename(resolvedPath))}`);
    }
    console.log(`\n  ${picocolors.dim('Press Ctrl+C to exit server.')}\n`);

    if (shouldOpen) {
      try {
        await open(url);
      } catch {
        // Ignore open errors in headless / CI environments
      }
    }
  } catch (error: any) {
    console.error(picocolors.red(`Failed to start Studio server: ${error.message}`));
    process.exit(1);
  }
}
