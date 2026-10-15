import http, { Server } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest, ServerState } from './api-router.js';

export interface ServerOptions {
  port?: number;
  host?: string;
  documentPath?: string;
  initialDocumentText?: string;
  staticDir?: string;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

export class LocalServer {
  private server: Server | null = null;
  private state: ServerState;
  private staticDir: string;

  constructor(options: ServerOptions = {}) {
    let initialDoc = options.initialDocumentText || '';
    let docId = 'sample-doc';

    if (options.documentPath && fs.existsSync(options.documentPath)) {
      initialDoc = fs.readFileSync(options.documentPath, 'utf8');
      docId = path.basename(options.documentPath);
    } else if (!initialDoc) {
      initialDoc = `# ChunkCraft Sample Document\n\nRetrieval-Augmented Generation (RAG) empowers LLMs with verified domain knowledge.`;
    }

    this.state = {
      activeDocumentText: initialDoc,
      activeDocumentId: docId
    };

    // Determine static assets directory (dist/studio)
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const defaultStatic = path.resolve(currentDir, '..', 'studio');
    const fallbackDist = path.resolve(currentDir, '..', '..', 'dist', 'studio');

    this.staticDir = options.staticDir || (fs.existsSync(fallbackDist) ? fallbackDist : defaultStatic);
  }

  async start(port: number = 50090, host: string = 'localhost'): Promise<{ port: number; url: string }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // 1. Try API Router
        const handled = await handleApiRequest(req, res, this.state);
        if (handled) return;

        // 2. Serve Static Assets
        this.serveStatic(req, res);
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} in use, trying port ${port + 1}...`);
          this.server?.close();
          resolve(this.start(port + 1, host));
        } else {
          reject(err);
        }
      });

      this.server.listen(port, host, () => {
        const url = `http://${host}:${port}`;
        resolve({ port, url });
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close(err => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private serveStatic(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/') {
      pathname = '/index.html';
    }

    let filePath = path.join(this.staticDir, pathname);

    // If file doesn't exist, fallback to index.html (SPA routing)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(this.staticDir, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>ChunkCraft Studio</title><style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:2rem;text-align:center;}h1{color:#00f5ff;}</style></head>
<body>
  <h1>ChunkCraft Studio Server Running</h1>
  <p>Static bundle is compiling or running in dev mode. Connect via Vite dev server or run <code>npm run build:studio</code>.</p>
</body>
</html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  }
}
