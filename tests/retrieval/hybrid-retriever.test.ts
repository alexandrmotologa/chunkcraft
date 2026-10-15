import { describe, it, expect } from 'vitest';
import { HybridRetriever } from '../../src/core/retrieval/hybrid-retriever.js';
import { VectorStore } from '../../src/core/storage/vector-store.js';
import { BM25Engine } from '../../src/core/embeddings/bm25-provider.js';
import { MockEmbeddingProvider } from '../../src/core/embeddings/mock-provider.js';
import { DocumentChunk } from '../../src/core/chunkers/base.js';

describe('HybridRetriever', () => {
  const chunks: DocumentChunk[] = [
    {
      id: 'chunk_code',
      documentId: 'doc1',
      index: 0,
      content: 'ERROR_AUTH_TOKEN_EXPIRED (0x80041001) occurs when the JWT token signature is invalid.',
      startIndex: 0,
      endIndex: 85,
      tokenCount: 16,
      metadata: { strategy: 'test' }
    },
    {
      id: 'chunk_general',
      documentId: 'doc1',
      index: 1,
      content: 'Security policies enforce strict session rotation and identity verification for users.',
      startIndex: 86,
      endIndex: 172,
      tokenCount: 14,
      metadata: { strategy: 'test' }
    }
  ];

  it('combines dense and lexical search via RRF', async () => {
    const vectorStore = new VectorStore();
    const bm25Engine = new BM25Engine();
    const provider = new MockEmbeddingProvider(128);

    bm25Engine.indexChunks(chunks);
    for (const chunk of chunks) {
      const vec = await provider.embedText(chunk.content);
      vectorStore.addChunk(chunk, vec);
    }

    const retriever = new HybridRetriever(vectorStore, bm25Engine, provider, {
      fusionMethod: 'rrf'
    });

    // Query targeting exact error code (BM25 excels at this)
    const results = await retriever.search('0x80041001 token expired', 2);

    expect(results.length).toBe(2);
    expect(results[0].chunk.id).toBe('chunk_code');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].denseRank).toBeDefined();
    expect(results[0].bm25Rank).toBe(1);
  });

  it('supports linear alpha blending', async () => {
    const vectorStore = new VectorStore();
    const bm25Engine = new BM25Engine();
    const provider = new MockEmbeddingProvider(128);

    bm25Engine.indexChunks(chunks);
    for (const chunk of chunks) {
      const vec = await provider.embedText(chunk.content);
      vectorStore.addChunk(chunk, vec);
    }

    const retriever = new HybridRetriever(vectorStore, bm25Engine, provider, {
      fusionMethod: 'linear',
      alpha: 0.7
    });

    const results = await retriever.search('security session rotation', 2);
    expect(results.length).toBe(2);
    expect(results[0].chunk.id).toBe('chunk_general');
  });
});
