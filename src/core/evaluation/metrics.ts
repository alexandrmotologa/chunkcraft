import { DocumentChunk } from '../chunkers/base.js';
import { SearchResult } from '../storage/vector-store.js';

export interface GoldenQuery {
  id: string;
  query: string;
  relevantKeywords: string[];
  expectedMatchingSubstrings?: string[];
  expectedChunkIds?: string[];
}

export interface RetrievedChunkDetail {
  id: string;
  rank: number;
  score: number;
  isRelevant: boolean;
  contentPreview: string;
  sectionHeader?: string;
}

export interface QueryEvaluationResult {
  queryId: string;
  query: string;
  retrieved: RetrievedChunkDetail[];
  firstRelevantRank: number | null;
  reciprocalRank: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt3: number;
  recallAt5: number;
}

export interface BenchmarkMetrics {
  strategyName: string;
  providerName: string;
  totalChunks: number;
  averageChunkSize: number;
  chunkSizeVariance: number;
  chunkingLatencyMs: number;
  indexingLatencyMs: number;
  retrievalLatencyMs: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt3: number;
  recallAt5: number;
  meanReciprocalRank: number;
  hitRate: number;
  contextFragmentationScore: number;
}

export interface StrategyEvaluationReport {
  metrics: BenchmarkMetrics;
  queryResults: QueryEvaluationResult[];
}

/**
 * Determines whether a retrieved chunk satisfies relevance criteria for a golden query.
 */
export function isChunkRelevant(chunk: DocumentChunk, query: GoldenQuery): boolean {
  if (query.expectedChunkIds && query.expectedChunkIds.includes(chunk.id)) {
    return true;
  }

  const contentLower = chunk.content.toLowerCase();

  // 1. Substring exact matching (highest precision indicator)
  if (query.expectedMatchingSubstrings && query.expectedMatchingSubstrings.length > 0) {
    for (const sub of query.expectedMatchingSubstrings) {
      if (contentLower.includes(sub.toLowerCase().trim())) {
        return true;
      }
    }
  }

  // 2. Keyword density matching
  if (query.relevantKeywords && query.relevantKeywords.length > 0) {
    const matchedKeywords = query.relevantKeywords.filter(kw =>
      contentLower.includes(kw.toLowerCase().trim())
    );
    // At least half of keywords or at least 2 keywords if list is short
    const threshold = Math.max(1, Math.ceil(query.relevantKeywords.length * 0.5));
    if (matchedKeywords.length >= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates retrieval results for a single query.
 */
export function evaluateQuery(
  query: GoldenQuery,
  retrieved: SearchResult[],
  allChunks: DocumentChunk[]
): QueryEvaluationResult {
  // Determine all truly relevant chunks in the entire document corpus
  const totalRelevantInCorpus = allChunks.filter(c => isChunkRelevant(c, query)).length;

  const retrievedDetails: RetrievedChunkDetail[] = [];
  let firstRelevantRank: number | null = null;

  for (let i = 0; i < retrieved.length; i++) {
    const item = retrieved[i];
    const isRel = isChunkRelevant(item.chunk, query);

    if (isRel && firstRelevantRank === null) {
      firstRelevantRank = item.rank;
    }

    retrievedDetails.push({
      id: item.chunk.id,
      rank: item.rank,
      score: item.score,
      isRelevant: isRel,
      contentPreview: item.chunk.content.slice(0, 120).replace(/\n/g, ' ') + '...',
      sectionHeader: item.chunk.metadata.sectionHeader
    });
  }

  const reciprocalRank = firstRelevantRank !== null ? 1 / firstRelevantRank : 0;

  // Precision@K calculations
  const countRelAtK = (k: number) => {
    const topSlice = retrievedDetails.slice(0, k);
    return topSlice.filter(r => r.isRelevant).length;
  };

  const p1 = countRelAtK(1) / 1;
  const p3 = countRelAtK(3) / 3;
  const p5 = countRelAtK(5) / 5;

  // Recall@K calculations
  const denom = Math.max(1, totalRelevantInCorpus);
  const r3 = Math.min(1.0, countRelAtK(3) / denom);
  const r5 = Math.min(1.0, countRelAtK(5) / denom);

  return {
    queryId: query.id,
    query: query.query,
    retrieved: retrievedDetails,
    firstRelevantRank,
    reciprocalRank: Number(reciprocalRank.toFixed(4)),
    precisionAt1: Number(p1.toFixed(4)),
    precisionAt3: Number(p3.toFixed(4)),
    precisionAt5: Number(p5.toFixed(4)),
    recallAt3: Number(r3.toFixed(4)),
    recallAt5: Number(r5.toFixed(4))
  };
}

/**
 * Aggregates benchmark metrics across all evaluated queries for a strategy.
 */
export function aggregateBenchmarkMetrics(
  strategyName: string,
  providerName: string,
  chunks: DocumentChunk[],
  queryResults: QueryEvaluationResult[],
  timings: {
    chunkingLatencyMs: number;
    indexingLatencyMs: number;
    retrievalLatencyMs: number;
  },
  fragmentationScore: number
): BenchmarkMetrics {
  const qCount = Math.max(1, queryResults.length);

  const avgP1 = queryResults.reduce((acc, q) => acc + q.precisionAt1, 0) / qCount;
  const avgP3 = queryResults.reduce((acc, q) => acc + q.precisionAt3, 0) / qCount;
  const avgP5 = queryResults.reduce((acc, q) => acc + q.precisionAt5, 0) / qCount;
  const avgR3 = queryResults.reduce((acc, q) => acc + q.recallAt3, 0) / qCount;
  const avgR5 = queryResults.reduce((acc, q) => acc + q.recallAt5, 0) / qCount;
  const mrr = queryResults.reduce((acc, q) => acc + q.reciprocalRank, 0) / qCount;

  const hits = queryResults.filter(q => q.firstRelevantRank !== null).length;
  const hitRate = hits / qCount;

  const tokenCounts = chunks.map(c => c.tokenCount);
  const avgChunkSize = tokenCounts.length > 0
    ? tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length
    : 0;

  const variance = tokenCounts.length > 0
    ? tokenCounts.reduce((acc, count) => acc + Math.pow(count - avgChunkSize, 2), 0) / tokenCounts.length
    : 0;

  return {
    strategyName,
    providerName,
    totalChunks: chunks.length,
    averageChunkSize: Number(avgChunkSize.toFixed(1)),
    chunkSizeVariance: Number(variance.toFixed(1)),
    chunkingLatencyMs: Number(timings.chunkingLatencyMs.toFixed(2)),
    indexingLatencyMs: Number(timings.indexingLatencyMs.toFixed(2)),
    retrievalLatencyMs: Number(timings.retrievalLatencyMs.toFixed(2)),
    precisionAt1: Number(avgP1.toFixed(3)),
    precisionAt3: Number(avgP3.toFixed(3)),
    precisionAt5: Number(avgP5.toFixed(3)),
    recallAt3: Number(avgR3.toFixed(3)),
    recallAt5: Number(avgR5.toFixed(3)),
    meanReciprocalRank: Number(mrr.toFixed(3)),
    hitRate: Number(hitRate.toFixed(3)),
    contextFragmentationScore: Number(fragmentationScore.toFixed(3))
  };
}
