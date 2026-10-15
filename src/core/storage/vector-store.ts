import { DocumentChunk } from '../chunkers/base.js';
import { cosineSimilarity } from './vector-math.js';

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  rank: number;
}

export interface VectorEntry {
  chunk: DocumentChunk;
  vector: Float64Array;
}

/**
 * In-memory vector store with fast top-K cosine similarity retrieval.
 */
export class VectorStore {
  private entries: VectorEntry[] = [];

  /**
   * Adds a single chunk and its embedding vector.
   */
  addChunk(chunk: DocumentChunk, vector: Float64Array): void {
    this.entries.push({ chunk, vector });
  }

  /**
   * Adds a batch of chunk-vector pairs.
   */
  addBatch(batch: VectorEntry[]): void {
    for (const item of batch) {
      this.entries.push(item);
    }
  }

  /**
   * Performs top-K similarity search against all stored vectors.
   */
  search(queryVector: Float64Array, topK: number = 5, minScore: number = -1.0): SearchResult[] {
    if (this.entries.length === 0) {
      return [];
    }

    const scored: Array<{ chunk: DocumentChunk; score: number }> = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const score = cosineSimilarity(queryVector, entry.vector);
      if (score >= minScore) {
        scored.push({ chunk: entry.chunk, score });
      }
    }

    // Sort descending by similarity score
    scored.sort((a, b) => b.score - a.score);

    const limit = Math.min(topK, scored.length);
    const results: SearchResult[] = [];

    for (let rank = 0; rank < limit; rank++) {
      results.push({
        chunk: scored[rank].chunk,
        score: Number(scored[rank].score.toFixed(4)),
        rank: rank + 1
      });
    }

    return results;
  }

  /**
   * Returns total count of indexed vectors.
   */
  size(): number {
    return this.entries.length;
  }

  /**
   * Returns all stored chunks.
   */
  getChunks(): DocumentChunk[] {
    return this.entries.map(e => e.chunk);
  }

  /**
   * Clears the store.
   */
  clear(): void {
    this.entries = [];
  }
}
