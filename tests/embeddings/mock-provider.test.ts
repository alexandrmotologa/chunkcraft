import { describe, it, expect } from 'vitest';
import { MockEmbeddingProvider } from '../../src/core/embeddings/mock-provider.js';
import { cosineSimilarity } from '../../src/core/storage/vector-math.js';

describe('MockEmbeddingProvider', () => {
  const provider = new MockEmbeddingProvider(384);

  it('produces identical vectors for identical inputs (determinism)', async () => {
    const text = 'Retrieval Augmented Generation with Postgres pgvector';
    const vec1 = await provider.embedText(text);
    const vec2 = await provider.embedText(text);

    expect(vec1.length).toBe(384);
    expect(vec2.length).toBe(384);
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1.0, 5);
  });

  it('produces high similarity for semantically overlapping sentences', async () => {
    const base = 'PostgreSQL database cluster with streaming replication and failover';
    const similar = 'Postgres database clusters with streaming replication';
    const unrelated = 'Chocolate cake recipe with strawberries and vanilla cream';

    const vBase = await provider.embedText(base);
    const vSimilar = await provider.embedText(similar);
    const vUnrelated = await provider.embedText(unrelated);

    const simSimilar = cosineSimilarity(vBase, vSimilar);
    const simUnrelated = cosineSimilarity(vBase, vUnrelated);

    expect(simSimilar).toBeGreaterThan(0.6);
    expect(simUnrelated).toBeLessThan(simSimilar);
  });
});
