import { describe, it, expect } from 'vitest';
import { HierarchicalChunker } from '../../src/core/chunkers/hierarchical.js';

describe('HierarchicalChunker', () => {
  const chunker = new HierarchicalChunker();

  const longDoc = `
# System Architecture

## Ingestion Pipeline
The ingestion pipeline processes unstructured files in parallel workers.
Each worker extracts text, normalizes characters, and produces token streams.

## Storage Hierarchy
Data is stored across hot NVMe cache and cold object storage.
Cache invalidation uses LRU eviction with a 48 hour maximum TTL.

## Retrieval Engine
Retrieval computes cosine similarity across indexed embeddings.
Results are re-ranked using cross-encoder models before reaching the generation prompt.
`.repeat(3);

  it('generates parent macro chunks and child micro chunks with parentId references', async () => {
    const chunks = await chunker.chunk(longDoc, {
      chunkSize: 30,
      chunkOverlap: 5,
      parentChunkSize: 120,
      parentOverlap: 20
    }, 'hierarchy-doc');

    expect(chunks.length).toBeGreaterThan(0);

    const parentChunks = chunks.filter(c => c.metadata.level === 'parent');
    const childChunks = chunks.filter(c => c.metadata.level === 'child');

    expect(parentChunks.length).toBeGreaterThan(0);
    expect(childChunks.length).toBeGreaterThan(0);

    // Each child chunk must have a valid parentId matching one of the parent chunks
    const parentIds = new Set(parentChunks.map(p => p.id));
    for (const child of childChunks) {
      expect(child.parentId).toBeDefined();
      expect(parentIds.has(child.parentId!)).toBe(true);
    }
  });
});
