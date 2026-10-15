import { DocumentChunk } from '../chunkers/base.js';
import { GoldenQuery, evaluateQuery, aggregateBenchmarkMetrics, BenchmarkMetrics } from './metrics.js';
import { getEmbeddingProvider } from '../embeddings/index.js';
import { BM25Engine } from '../embeddings/bm25-provider.js';
import { VectorStore } from '../storage/vector-store.js';
import { calculateCostAndSizing } from '../storage/cost-calculator.js';

export interface ShootoutCandidateResult {
  rank: number;
  provider: string;
  model: string;
  dimensions: number;
  indexingLatencyMs: number;
  avgQueryLatencyMs: number;
  storageMb: number;
  ingestionCostUsd: number;
  metrics: BenchmarkMetrics;
}

export interface ShootoutResult {
  documentId: string;
  totalChunks: number;
  testedProvidersCount: number;
  candidates: ShootoutCandidateResult[];
  winner: ShootoutCandidateResult;
  durationMs: number;
}

export interface ShootoutTarget {
  provider: string;
  model?: string;
  dimensions?: number;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Executes a side-by-side benchmark comparing multiple embedding models
 * on the exact same chunks and golden queries.
 */
export class ModelShootout {
  async runShootout(
    chunks: DocumentChunk[],
    queries: GoldenQuery[],
    targets: ShootoutTarget[] = [
      { provider: 'bm25' },
      { provider: 'mock', dimensions: 384 },
      { provider: 'mock', dimensions: 768 }
    ],
    documentId: string = 'doc'
  ): Promise<ShootoutResult> {
    const startTime = performance.now();
    const candidates: ShootoutCandidateResult[] = [];
    const totalTokens = chunks.reduce((acc, c) => acc + c.tokenCount, 0);

    for (const target of targets) {
      const isBM25 = target.provider.toLowerCase() === 'bm25';
      const indexStart = performance.now();
      let dimensions = target.dimensions || (isBM25 ? 0 : 384);
      let bm25Engine: BM25Engine | null = null;
      let vectorStore: VectorStore | null = null;
      let providerInstance: any = null;

      if (isBM25) {
        bm25Engine = new BM25Engine();
        bm25Engine.indexChunks(chunks);
      } else {
        providerInstance = getEmbeddingProvider(target.provider, {
          dimensions: target.dimensions,
          model: target.model,
          apiKey: target.apiKey,
          baseUrl: target.baseUrl
        });
        dimensions = providerInstance.dimensions;
        vectorStore = new VectorStore();
        const texts = chunks.map(c => c.content);
        const embeddings = await providerInstance.embedBatch(texts);
        for (let i = 0; i < chunks.length; i++) {
          vectorStore.addChunk(chunks[i], embeddings[i]);
        }
      }
      const indexingLatencyMs = performance.now() - indexStart;

      // Query evaluation
      const queryLatencies: number[] = [];
      const queryResults = [];

      for (const q of queries) {
        const qStart = performance.now();
        let topResults: any[] = [];
        if (bm25Engine) {
          topResults = bm25Engine.search(q.query, 5);
        } else if (vectorStore && providerInstance) {
          const qVec = await providerInstance.embedText(q.query);
          topResults = vectorStore.search(qVec, 5);
        }
        queryLatencies.push(performance.now() - qStart);
        queryResults.push(evaluateQuery(q, topResults, chunks));
      }

      const avgQueryLatencyMs = queryLatencies.length > 0
        ? queryLatencies.reduce((a, b) => a + b, 0) / queryLatencies.length
        : 0;

      const totalRetrievalLatencyMs = queryLatencies.reduce((a, b) => a + b, 0);

      const metrics = aggregateBenchmarkMetrics(
        'current-chunks',
        isBM25 ? 'bm25' : target.provider,
        chunks,
        queryResults,
        {
          chunkingLatencyMs: 0,
          indexingLatencyMs,
          retrievalLatencyMs: totalRetrievalLatencyMs
        },
        0.1
      );

      // Sizing & Cost
      const sizing = calculateCostAndSizing(totalTokens, chunks.length);
      const matchedCost = sizing.providerEstimates.find(
        p => p.provider.includes(target.provider) || p.dimensions === dimensions
      );

      candidates.push({
        rank: 0,
        provider: target.provider,
        model: target.model || (isBM25 ? 'BM25-Okapi' : providerInstance?.providerName || target.provider),
        dimensions,
        indexingLatencyMs: Number(indexingLatencyMs.toFixed(2)),
        avgQueryLatencyMs: Number(avgQueryLatencyMs.toFixed(2)),
        storageMb: matchedCost ? matchedCost.totalStorageMb : Number(((chunks.length * dimensions * 4) / (1024 * 1024)).toFixed(3)),
        ingestionCostUsd: matchedCost ? matchedCost.ingestionCostUsd : 0,
        metrics
      });
    }

    // Rank candidates by MRR descending, then lowest query latency
    candidates.sort((a, b) => {
      if (b.metrics.meanReciprocalRank !== a.metrics.meanReciprocalRank) {
        return b.metrics.meanReciprocalRank - a.metrics.meanReciprocalRank;
      }
      return a.avgQueryLatencyMs - b.avgQueryLatencyMs;
    });

    for (let i = 0; i < candidates.length; i++) {
      candidates[i].rank = i + 1;
    }

    const durationMs = performance.now() - startTime;

    return {
      documentId,
      totalChunks: chunks.length,
      testedProvidersCount: candidates.length,
      candidates,
      winner: candidates[0],
      durationMs: Number(durationMs.toFixed(1))
    };
  }
}
