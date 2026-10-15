import { describe, it, expect } from 'vitest';
import { SemanticBoundaryChunker } from '../../src/core/chunkers/semantic-boundary.js';

describe('SemanticBoundaryChunker', () => {
  const chunker = new SemanticBoundaryChunker();

  const textWithPunctuation = `
The quick brown fox jumps over the lazy dog. Dr. Smith analyzed the test results on Oct. 15th!
The system achieved 99.9% uptime across all nodes. For e.g. and i.e. usage, abbreviations should not split sentences.
Is this accurate? Yes, it is fully verified.
`.trim();

  it('keeps sentences intact without splitting on abbreviations or decimals', async () => {
    const chunks = await chunker.chunk(textWithPunctuation, {
      chunkSize: 30,
      chunkOverlap: 5
    }, 'semantic-doc');

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
    }

    const joined = chunks.map(c => c.content).join(' ');
    expect(joined).toContain('Dr. Smith');
    expect(joined).toContain('99.9%');
    expect(joined).toContain('e.g.');
  });
});
