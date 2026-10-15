import { DocumentChunk } from '../chunkers/base.js';
import { VectorStore, SearchResult as DenseSearchResult } from '../storage/vector-store.js';
import { BM25Engine, BM25SearchResult } from '../embeddings/bm25-provider.js';
import { EmbeddingProvider } from '../embeddings/base.js';

export type FusionMethod = 'rrf' | 'linear';

export interface HybridRetrieverOptions {
  /** Dense vector weight in linear blend [0.0 = pure BM25, 1.0 = pure Dense]. Default: 0.5 */
  alpha?: number;
  /** RRF smoothing constant k. Default: 60 */
  rrfK?: number;
  /** Fusion algorithm: 'rrf' (Reciprocal Rank Fusion) or 'linear' (normalized score blend). Default: 'rrf' */
  fusionMethod?: FusionMethod;
  /** Maximum candidates retrieved from each branch before fusion. Default: 20 */
  candidateLimit?: number;
}

export interface HybridSearchResult {
  chunk: DocumentChunk;
  score: number;
  rank: number;
  denseRank?: number;
  denseScore?: number;
  bm25Rank?: number;
  bm25Score?: number;
}

/**
 * Hybrid retrieval engine combining Dense Vector Embeddings and Okapi BM25 Sparse Search.
 * Supports Reciprocal Rank Fusion (RRF) and Min-Max Linear Score Blending.
 */
export class HybridRetriever {
  private vectorStore: VectorStore;
  private bm25Engine: BM25Engine;
  private embeddingProvider: EmbeddingProvider;
  private options: Required<HybridRetrieverOptions>;

  constructor(
    vectorStore: VectorStore,
    bm25Engine: BM25Engine,
    embeddingProvider: EmbeddingProvider,
    options: HybridRetrieverOptions = {}
  ) {
    this.vectorStore = vectorStore;
    this.bm25Engine = bm25Engine;
    this.embeddingProvider = embeddingProvider;
    this.options = {
      alpha: options.alpha ?? 0.5,
      rrfK: options.rrfK ?? 60,
      fusionMethod: options.fusionMethod ?? 'rrf',
      candidateLimit: options.candidateLimit ?? 20
    };
  }

  /**
   * Executes hybrid search for a query across dense and sparse indexes.
   */
  async search(query: string, topK: number = 5): Promise<HybridSearchResult[]> {
    const candidateK = Math.max(topK * 2, this.options.candidateLimit);

    // 1. Run Dense Search
    const queryVector = await this.embeddingProvider.embedText(query);
    const denseResults: DenseSearchResult[] = this.vectorStore.search(queryVector, candidateK);

    // 2. Run BM25 Lexical Search
    const bm25Results: BM25SearchResult[] = this.bm25Engine.search(query, candidateK);

    // 3. Fusion
    if (this.options.fusionMethod === 'linear') {
      return this.fuseLinear(denseResults, bm25Results, topK);
    }
    return this.fuseRRF(denseResults, bm25Results, topK);
  }

  /**
   * Reciprocal Rank Fusion: Score(d) = sum(1 / (k + rank_i))
   */
  private fuseRRF(
    denseResults: DenseSearchResult[],
    bm25Results: BM25SearchResult[],
    topK: number
  ): HybridSearchResult[] {
    const k = this.options.rrfK;
    const scoreMap = new Map<string, {
      chunk: DocumentChunk;
      rrfScore: number;
      denseRank?: number;
      denseScore?: number;
      bm25Rank?: number;
      bm25Score?: number;
    }>();

    // Dense contribution
    for (const item of denseResults) {
      const chunkId = item.chunk.id;
      const rankScore = 1 / (k + item.rank);
      scoreMap.set(chunkId, {
        chunk: item.chunk,
        rrfScore: rankScore,
        denseRank: item.rank,
        denseScore: item.score
      });
    }

    // BM25 contribution
    for (const item of bm25Results) {
      const chunkId = item.chunk.id;
      const rankScore = 1 / (k + item.rank);
      const existing = scoreMap.get(chunkId);

      if (existing) {
        existing.rrfScore += rankScore;
        existing.bm25Rank = item.rank;
        existing.bm25Score = item.score;
      } else {
        scoreMap.set(chunkId, {
          chunk: item.chunk,
          rrfScore: rankScore,
          bm25Rank: item.rank,
          bm25Score: item.score
        });
      }
    }

    // Sort descending by RRF score
    const sorted = Array.from(scoreMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);

    const limit = Math.min(topK, sorted.length);
    const results: HybridSearchResult[] = [];

    for (let i = 0; i < limit; i++) {
      const item = sorted[i];
      results.push({
        chunk: item.chunk,
        score: Number(item.rrfScore.toFixed(5)),
        rank: i + 1,
        denseRank: item.denseRank,
        denseScore: item.denseScore,
        bm25Rank: item.bm25Rank,
        bm25Score: item.bm25Score
      });
    }

    return results;
  }

  /**
   * Linear Min-Max normalized score blend: Score(d) = alpha * DenseNorm + (1 - alpha) * BM25Norm
   */
  private fuseLinear(
    denseResults: DenseSearchResult[],
    bm25Results: BM25SearchResult[],
    topK: number
  ): HybridSearchResult[] {
    const alpha = Math.max(0.0, Math.min(1.0, this.options.alpha));

    // Normalize dense scores to [0, 1]
    const denseScores = denseResults.map(r => r.score);
    const minDense = denseScores.length > 0 ? Math.min(...denseScores) : 0;
    const maxDense = denseScores.length > 0 ? Math.max(...denseScores) : 1;
    const denseRange = maxDense - minDense || 1;

    // Normalize BM25 scores to [0, 1]
    const bm25Scores = bm25Results.map(r => r.score);
    const minBm25 = bm25Scores.length > 0 ? Math.min(...bm25Scores) : 0;
    const maxBm25 = bm25Scores.length > 0 ? Math.max(...bm25Scores) : 1;
    const bm25Range = maxBm25 - minBm25 || 1;

    const merged = new Map<string, {
      chunk: DocumentChunk;
      blendedScore: number;
      denseRank?: number;
      denseScore?: number;
      bm25Rank?: number;
      bm25Score?: number;
    }>();

    for (const item of denseResults) {
      const normScore = (item.score - minDense) / denseRange;
      merged.set(item.chunk.id, {
        chunk: item.chunk,
        blendedScore: alpha * normScore,
        denseRank: item.rank,
        denseScore: item.score
      });
    }

    for (const item of bm25Results) {
      const normScore = (item.score - minBm25) / bm25Range;
      const existing = merged.get(item.chunk.id);

      if (existing) {
        existing.blendedScore += (1 - alpha) * normScore;
        existing.bm25Rank = item.rank;
        existing.bm25Score = item.score;
      } else {
        merged.set(item.chunk.id, {
          chunk: item.chunk,
          blendedScore: (1 - alpha) * normScore,
          bm25Rank: item.rank,
          bm25Score: item.score
        });
      }
    }

    const sorted = Array.from(merged.values()).sort((a, b) => b.blendedScore - a.blendedScore);

    const limit = Math.min(topK, sorted.length);
    const results: HybridSearchResult[] = [];

    for (let i = 0; i < limit; i++) {
      const item = sorted[i];
      results.push({
        chunk: item.chunk,
        score: Number(item.blendedScore.toFixed(4)),
        rank: i + 1,
        denseRank: item.denseRank,
        denseScore: item.denseScore,
        bm25Rank: item.bm25Rank,
        bm25Score: item.bm25Score
      });
    }

    return results;
  }
}
