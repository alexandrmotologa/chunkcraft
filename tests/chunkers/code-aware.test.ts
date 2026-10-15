import { describe, it, expect } from 'vitest';
import { CodeAwareChunker } from '../../src/core/chunkers/code-aware.js';

describe('CodeAwareChunker', () => {
  const chunker = new CodeAwareChunker();

  const tsCode = `
export interface VectorConfig {
  dimensions: number;
  metric: 'cosine' | 'dot_product';
}

export class VectorEngine {
  private config: VectorConfig;

  constructor(config: VectorConfig) {
    this.config = config;
  }

  public search(query: Float64Array): number[] {
    return [1, 2, 3];
  }
}
`.trim();

  it('chunks code without breaking function or class definitions', async () => {
    const chunks = await chunker.chunk(tsCode, {
      chunkSize: 50,
      chunkOverlap: 10
    }, 'code-test');

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.metadata.isCodeBlock).toBe(true);
    }

    const classChunk = chunks.find(c => c.content.includes('class VectorEngine'));
    expect(classChunk).toBeDefined();
    expect(classChunk?.metadata.sectionHeader).toContain('VectorEngine');
  });
});
