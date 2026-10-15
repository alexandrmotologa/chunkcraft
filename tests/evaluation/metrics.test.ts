import { describe, it, expect } from 'vitest';
import {
  isChunkRelevant,
  evaluateQuery,
  aggregateBenchmarkMetrics,
  GoldenQuery
} from '../../src/core/evaluation/metrics.js';
import { DocumentChunk } from '../../src/core/chunkers/base.js';
import { SearchResult } from '../../src/core/storage/vector-store.js';

describe('EvaluationMetrics', () => {
  const query: GoldenQuery = {
    id: 'q1',
    query: 'How does Kafka handle event streaming?',
    relevantKeywords: ['kafka', 'event', 'streaming'],
    expectedMatchingSubstrings: ['distributed event streaming platform']
  };

  const relevantChunk: DocumentChunk = {
    id: 'c1',
    documentId: 'doc1',
    index: 0,
    content: 'Kafka is a distributed event streaming platform used across production systems.',
    startIndex: 0,
    endIndex: 78,
    tokenCount: 12,
    metadata: { strategy: 'test' }
  };

  const irrelevantChunk: DocumentChunk = {
    id: 'c2',
    documentId: 'doc1',
    index: 1,
    content: 'PostgreSQL provides relational tables and ACID transactions.',
    startIndex: 80,
    endIndex: 140,
    tokenCount: 10,
    metadata: { strategy: 'test' }
  };

  it('determines chunk relevance based on substrings and keyword overlap', () => {
    expect(isChunkRelevant(relevantChunk, query)).toBe(true);
    expect(isChunkRelevant(irrelevantChunk, query)).toBe(false);
  });

  it('computes Precision@K, Recall@K, and MRR correctly', () => {
    const retrieved: SearchResult[] = [
      { chunk: relevantChunk, score: 0.95, rank: 1 },
      { chunk: irrelevantChunk, score: 0.40, rank: 2 }
    ];

    const result = evaluateQuery(query, retrieved, [relevantChunk, irrelevantChunk]);

    expect(result.firstRelevantRank).toBe(1);
    expect(result.reciprocalRank).toBe(1.0);
    expect(result.precisionAt1).toBe(1.0);
    expect(result.precisionAt3).toBeCloseTo(1 / 3, 2);
    expect(result.recallAt3).toBe(1.0);
  });

  it('aggregates multi-query metrics into overall benchmark score', () => {
    const q1Result = evaluateQuery(
      query,
      [{ chunk: relevantChunk, score: 0.9, rank: 1 }],
      [relevantChunk]
    );

    const metrics = aggregateBenchmarkMetrics(
      'recursive-char',
      'mock',
      [relevantChunk, irrelevantChunk],
      [q1Result],
      { chunkingLatencyMs: 2, indexingLatencyMs: 5, retrievalLatencyMs: 1 },
      0.05
    );

    expect(metrics.strategyName).toBe('recursive-char');
    expect(metrics.totalChunks).toBe(2);
    expect(metrics.precisionAt1).toBe(1.0);
    expect(metrics.meanReciprocalRank).toBe(1.0);
    expect(metrics.hitRate).toBe(1.0);
    expect(metrics.contextFragmentationScore).toBe(0.05);
  });
});
