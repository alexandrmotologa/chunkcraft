import { describe, it, expect } from 'vitest';
import { RecursiveCharacterChunker } from '../../src/core/chunkers/recursive-char.js';
import { calculateChunkStats } from '../../src/core/chunkers/base.js';

describe('RecursiveCharacterChunker', () => {
  const chunker = new RecursiveCharacterChunker();

  const sampleDoc = `
# Engineering Handbook

## 1. Architecture Overview
Our microservice platform utilizes an event-driven architecture powered by Kafka and Postgres.
Every service produces state change events to domain-specific topics.

## 2. Authentication Protocol
All inbound requests require a valid JWT bearer token issued by the corporate auth provider.
Tokens expire every 3600 seconds and must be refreshed via the refresh token endpoint.

## 3. Rate Limiting Guidelines
API rate limits are enforced via distributed Token Bucket algorithms.
Each client tier has separate quotas: Free (60 req/min), Pro (600 req/min), and Enterprise (6000 req/min).
`.trim();

  it('splits document into valid non-empty chunks respecting target token size', async () => {
    const chunks = await chunker.chunk(sampleDoc, {
      chunkSize: 40,
      chunkOverlap: 10
    }, 'test-doc');

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.startIndex).toBeGreaterThanOrEqual(0);
      expect(chunk.endIndex).toBeGreaterThan(chunk.startIndex);
      expect(chunk.tokenCount).toBeGreaterThan(0);
      expect(chunk.metadata.strategy).toBe('recursive-char');
    }
  });

  it('preserves section headers in chunk metadata when present', async () => {
    const chunks = await chunker.chunk(sampleDoc, {
      chunkSize: 50,
      chunkOverlap: 10
    }, 'test-doc');

    const headers = chunks.map(c => c.metadata.sectionHeader).filter(Boolean);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('computes chunk aggregation stats and fragmentation score', async () => {
    const chunks = await chunker.chunk(sampleDoc, {
      chunkSize: 45,
      chunkOverlap: 10
    }, 'test-doc');

    const stats = calculateChunkStats(chunks, sampleDoc, 5.2);
    expect(stats.totalChunks).toBe(chunks.length);
    expect(stats.averageChunkTokens).toBeGreaterThan(0);
    expect(stats.minChunkTokens).toBeGreaterThan(0);
    expect(stats.maxChunkTokens).toBeGreaterThanOrEqual(stats.minChunkTokens);
    expect(stats.fragmentationScore).toBeGreaterThanOrEqual(0);
    expect(stats.fragmentationScore).toBeLessThanOrEqual(1);
  });
});
