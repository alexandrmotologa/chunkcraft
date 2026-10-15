import { BaseChunker, ChunkingOptions, DocumentChunk, calculateChunkStats } from '../chunkers/base.js';
import { getChunker } from '../chunkers/index.js';
import { EmbeddingProvider } from '../embeddings/base.js';
import { getEmbeddingProvider } from '../embeddings/index.js';
import { BM25Engine } from '../embeddings/bm25-provider.js';
import { VectorStore } from '../storage/vector-store.js';
import {
  GoldenQuery,
  StrategyEvaluationReport,
  evaluateQuery,
  aggregateBenchmarkMetrics
} from './metrics.js';

export interface BenchmarkSuiteOptions extends ChunkingOptions {
  strategies?: string[];
  provider?: string;
  providerConfig?: Record<string, unknown>;
  topK?: number;
}

export interface SuiteEvaluationResult {
  documentId: string;
  documentLengthChars: number;
  provider: string;
  strategies: StrategyEvaluationReport[];
  queries: GoldenQuery[];
}

export class BenchmarkRunner {
  /**
   * Executes benchmark evaluation for a single chunking strategy.
   */
  async runSingleStrategy(
    documentText: string,
    strategyName: string,
    options: ChunkingOptions,
    provider: EmbeddingProvider | string,
    queries: GoldenQuery[],
    documentId: string = 'doc'
  ): Promise<StrategyEvaluationReport> {
    const chunker: BaseChunker = getChunker(strategyName);
    const resolvedProvider = typeof provider === 'string'
      ? (provider === 'bm25' ? 'bm25' : getEmbeddingProvider(provider))
      : provider;

    // 1. Chunking Phase
    const chunkStart = performance.now();
    const chunks: DocumentChunk[] = await chunker.chunk(documentText, options, documentId);
    const chunkingLatencyMs = performance.now() - chunkStart;

    const stats = calculateChunkStats(chunks, documentText, chunkingLatencyMs);

    // 2. Indexing Phase
    const indexStart = performance.now();
    let vectorStore: VectorStore | null = null;
    let bm25Engine: BM25Engine | null = null;
    let providerName: string = 'unknown';

    if (resolvedProvider === 'bm25') {
      providerName = 'bm25-lexical';
      bm25Engine = new BM25Engine();
      bm25Engine.indexChunks(chunks);
    } else {
      providerName = resolvedProvider.providerName;
      vectorStore = new VectorStore();
      const texts = chunks.map(c => c.content);
      const embeddings = await resolvedProvider.embedBatch(texts);
      for (let i = 0; i < chunks.length; i++) {
        vectorStore.addChunk(chunks[i], embeddings[i]);
      }
    }
    const indexingLatencyMs = performance.now() - indexStart;

    // 3. Retrieval & Scoring Phase
    const retrievalStart = performance.now();
    const queryResults = [];

    for (const q of queries) {
      let topResults: any[] = [];
      if (bm25Engine) {
        topResults = bm25Engine.search(q.query, 5);
      } else if (vectorStore && typeof resolvedProvider !== 'string') {
        const qVec = await resolvedProvider.embedText(q.query);
        topResults = vectorStore.search(qVec, 5);
      }

      const evaluated = evaluateQuery(q, topResults, chunks);
      queryResults.push(evaluated);
    }
    const retrievalLatencyMs = performance.now() - retrievalStart;

    // 4. Metric Aggregation
    const metrics = aggregateBenchmarkMetrics(
      strategyName,
      providerName,
      chunks,
      queryResults,
      {
        chunkingLatencyMs,
        indexingLatencyMs,
        retrievalLatencyMs
      },
      stats.fragmentationScore
    );

    return {
      metrics,
      queryResults
    };
  }

  /**
   * Executes a multi-strategy benchmark suite and returns side-by-side results.
   */
  async runSuite(
    documentText: string,
    queries: GoldenQuery[],
    options: BenchmarkSuiteOptions = { chunkSize: 500, chunkOverlap: 50 },
    documentId: string = 'doc'
  ): Promise<SuiteEvaluationResult> {
    const strategies = options.strategies || [
      'recursive-char',
      'markdown-ast',
      'semantic-boundary',
      'token-window'
    ];

    const providerName = options.provider || 'mock';
    const provider = providerName === 'bm25'
      ? 'bm25'
      : getEmbeddingProvider(providerName, options.providerConfig as any);

    const reports: StrategyEvaluationReport[] = [];

    for (const strat of strategies) {
      const report = await this.runSingleStrategy(
        documentText,
        strat,
        options,
        provider,
        queries,
        documentId
      );
      reports.push(report);
    }

    return {
      documentId,
      documentLengthChars: documentText.length,
      provider: typeof provider === 'string' ? provider : provider.providerName,
      strategies: reports,
      queries
    };
  }
}
