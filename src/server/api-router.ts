import { IncomingMessage, ServerResponse } from 'node:http';
import { getChunker, listAvailableStrategies, calculateChunkStats, DocumentChunk } from '../core/chunkers/index.js';
import { getEmbeddingProvider, listAvailableEmbeddingProviders, BM25Engine } from '../core/embeddings/index.js';
import { VectorStore } from '../core/storage/vector-store.js';
import { BenchmarkRunner } from '../core/evaluation/test-runner.js';
import { generateGoldenQueries } from '../core/evaluation/golden-query-gen.js';
import { countTokens } from '../core/tokenizer/token-counter.js';

export interface ServerState {
  activeDocumentText: string;
  activeDocumentId: string;
}

/**
 * Handles incoming API requests and routes them to core ChunkCraft engines.
 */
export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  state: ServerState
): Promise<boolean> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/')) {
    return false; // Hand off to static file handler
  }

  // Set CORS and JSON headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  const sendJson = (statusCode: number, data: unknown) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const readJsonBody = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 20 * 1024 * 1024) {
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error('Invalid JSON in request body'));
        }
      });
      req.on('error', reject);
    });
  };

  try {
    // GET /api/strategies
    if (req.method === 'GET' && pathname === '/api/strategies') {
      sendJson(200, { strategies: listAvailableStrategies() });
      return true;
    }

    // GET /api/samples
    if (req.method === 'GET' && pathname === '/api/samples') {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const sampleDir = path.resolve('examples/sample-docs');
      const samples: Array<{ id: string; title: string; text: string }> = [];

      if (fs.existsSync(sampleDir)) {
        const files = fs.readdirSync(sampleDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const content = fs.readFileSync(path.join(sampleDir, file), 'utf8');
            samples.push({
              id: file,
              title: file.replace('.md', '').replace(/-/g, ' '),
              text: content
            });
          }
        }
      }

      sendJson(200, { samples });
      return true;
    }

    // GET /api/providers
    if (req.method === 'GET' && pathname === '/api/providers') {
      sendJson(200, {
        providers: listAvailableEmbeddingProviders(),
        hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
        hasVoyageKey: Boolean(process.env.VOYAGE_API_KEY)
      });
      return true;
    }

    // GET /api/document
    if (req.method === 'GET' && pathname === '/api/document') {
      sendJson(200, {
        documentId: state.activeDocumentId,
        documentText: state.activeDocumentText,
        lengthChars: state.activeDocumentText.length,
        tokenCount: countTokens(state.activeDocumentText)
      });
      return true;
    }

    // POST /api/document
    if (req.method === 'POST' && pathname === '/api/document') {
      const body = await readJsonBody();
      if (!body.documentText) {
        sendJson(400, { error: 'documentText is required' });
        return true;
      }
      state.activeDocumentText = body.documentText;
      state.activeDocumentId = body.documentId || 'custom-doc';
      sendJson(200, {
        status: 'updated',
        documentId: state.activeDocumentId,
        lengthChars: state.activeDocumentText.length,
        tokenCount: countTokens(state.activeDocumentText)
      });
      return true;
    }

    // POST /api/chunk
    if (req.method === 'POST' && pathname === '/api/chunk') {
      const body = await readJsonBody();
      const text = body.documentText || state.activeDocumentText;
      const strategy = body.strategy || 'recursive-char';
      const options = {
        chunkSize: Number(body.chunkSize) || 500,
        chunkOverlap: Number(body.chunkOverlap) || 50,
        preserveCodeBlocks: body.preserveCodeBlocks ?? true,
        preserveHeaders: body.preserveHeaders ?? true
      };

      const chunker = getChunker(strategy);
      const startTime = performance.now();
      const chunks = await chunker.chunk(text, options, state.activeDocumentId);
      const durationMs = performance.now() - startTime;
      const stats = calculateChunkStats(chunks, text, durationMs);

      sendJson(200, {
        strategy,
        chunks,
        stats
      });
      return true;
    }

    // POST /api/query (Interactive Vector Search)
    if (req.method === 'POST' && pathname === '/api/query') {
      const body = await readJsonBody();
      const query = (body.query || '').trim();
      if (!query) {
        sendJson(400, { error: 'query string is required' });
        return true;
      }

      const text = body.documentText || state.activeDocumentText;
      const strategy = body.strategy || 'recursive-char';
      const options = {
        chunkSize: Number(body.chunkSize) || 500,
        chunkOverlap: Number(body.chunkOverlap) || 50
      };
      const providerName = body.provider || 'mock';
      const topK = Number(body.topK) || 5;

      const chunker = getChunker(strategy);
      const chunks = await chunker.chunk(text, options, state.activeDocumentId);

      let results: any[] = [];
      const startTime = performance.now();

      if (providerName === 'bm25') {
        const engine = new BM25Engine();
        engine.indexChunks(chunks);
        results = engine.search(query, topK);
      } else {
        const provider = getEmbeddingProvider(providerName, body.providerConfig || {});
        const vectorStore = new VectorStore();
        const texts = chunks.map(c => c.content);
        const embeddings = await provider.embedBatch(texts);
        for (let i = 0; i < chunks.length; i++) {
          vectorStore.addChunk(chunks[i], embeddings[i]);
        }
        const queryVector = await provider.embedText(query);
        results = vectorStore.search(queryVector, topK);
      }

      const latencyMs = performance.now() - startTime;

      sendJson(200, {
        query,
        provider: providerName,
        strategy,
        totalChunks: chunks.length,
        latencyMs: Number(latencyMs.toFixed(2)),
        results
      });
      return true;
    }

    // POST /api/generate-queries
    if (req.method === 'POST' && pathname === '/api/generate-queries') {
      const body = await readJsonBody();
      const text = body.documentText || state.activeDocumentText;
      const count = Number(body.count) || 5;
      const queries = generateGoldenQueries(text, count);
      sendJson(200, { queries });
      return true;
    }

    // POST /api/benchmark
    if (req.method === 'POST' && pathname === '/api/benchmark') {
      const body = await readJsonBody();
      const text = body.documentText || state.activeDocumentText;
      const strategies = body.strategies || listAvailableStrategies();
      const options = {
        chunkSize: Number(body.chunkSize) || 500,
        chunkOverlap: Number(body.chunkOverlap) || 50,
        strategies,
        provider: body.provider || 'mock',
        providerConfig: body.providerConfig
      };

      let queries = body.queries;
      if (!queries || !Array.isArray(queries) || queries.length === 0) {
        queries = generateGoldenQueries(text, 5);
      }

      const runner = new BenchmarkRunner();
      const suiteResult = await runner.runSuite(text, queries, options, state.activeDocumentId);

      sendJson(200, suiteResult);
      return true;
    }

    sendJson(404, { error: `Endpoint not found: ${pathname}` });
    return true;
  } catch (error: any) {
    sendJson(500, { error: error.message || 'Internal server error' });
    return true;
  }
}
