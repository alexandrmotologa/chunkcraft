import { describe, it, expect } from 'vitest';
import { VectorStore } from '../../src/core/storage/vector-store.js';
import { MockEmbeddingProvider } from '../../src/core/embeddings/mock-provider.js';
import { DocumentChunk } from '../../src/core/chunkers/base.js';

describe('VectorStore', () => {
  const store = new VectorStore();
  const provider = new MockEmbeddingProvider(128);

  const sampleChunk1: DocumentChunk = {
    id: 'chunk_auth',
    documentId: 'doc1',
    index: 0,
    content: 'User authentication with OAuth2, JWT tokens, and multi-factor verification.',
    startIndex: 0,
    endIndex: 75,
    tokenCount: 12,
    metadata: { strategy: 'test' }
  };

  const sampleChunk2: DocumentChunk = {
    id: 'chunk_billing',
    documentId: 'doc1',
    index: 1,
    content: 'Invoicing, Stripe credit card payment processing, and subscription tiers.',
    startIndex: 80,
    endIndex: 153,
    tokenCount: 11,
    metadata: { strategy: 'test' }
  };

  it('indexes and searches vectors by similarity', async () => {
    store.clear();
    const vec1 = await provider.embedText(sampleChunk1.content);
    const vec2 = await provider.embedText(sampleChunk2.content);

    store.addChunk(sampleChunk1, vec1);
    store.addChunk(sampleChunk2, vec2);

    expect(store.size()).toBe(2);

    const queryVec = await provider.embedText('JWT token OAuth authentication');
    const results = store.search(queryVec, 2);

    expect(results.length).toBe(2);
    expect(results[0].chunk.id).toBe('chunk_auth');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].rank).toBe(1);
  });
});
