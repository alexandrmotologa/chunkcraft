import { describe, it, expect } from 'vitest';
import { BM25Engine } from '../../src/core/embeddings/bm25-provider.js';
import { DocumentChunk } from '../../src/core/chunkers/base.js';

describe('BM25Engine', () => {
  const engine = new BM25Engine();

  const chunks: DocumentChunk[] = [
    {
      id: 'c1',
      documentId: 'doc1',
      index: 0,
      content: 'Kafka is a distributed event streaming platform used for high-throughput data pipelines.',
      startIndex: 0,
      endIndex: 88,
      tokenCount: 15,
      metadata: { strategy: 'test' }
    },
    {
      id: 'c2',
      documentId: 'doc1',
      index: 1,
      content: 'PostgreSQL provides relational storage, ACID compliance, and pgvector extension for AI search.',
      startIndex: 90,
      endIndex: 185,
      tokenCount: 16,
      metadata: { strategy: 'test' }
    },
    {
      id: 'c3',
      documentId: 'doc1',
      index: 2,
      content: 'Redis serves as an in-memory key-value cache with sub-millisecond response latency.',
      startIndex: 190,
      endIndex: 275,
      tokenCount: 14,
      metadata: { strategy: 'test' }
    }
  ];

  it('ranks relevant documents first for lexical keywords', () => {
    engine.indexChunks(chunks);

    const results = engine.search('PostgreSQL relational database ACID', 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.id).toBe('c2');
    expect(results[0].rank).toBe(1);
    expect(results[0].score).toBeGreaterThan(0);

    const kafkaResults = engine.search('Kafka event streaming', 1);
    expect(kafkaResults[0].chunk.id).toBe('c1');
  });
});
