import { describe, it, expect } from 'vitest';
import { countTokens, analyzeTokenMetrics, tokenize } from '../../src/core/tokenizer/token-counter.js';

describe('TokenCounter', () => {
  it('counts zero tokens for empty or whitespace-only strings', () => {
    expect(countTokens('')).toBe(0);
    expect(countTokens('   \n\t ')).toBe(0);
  });

  it('accurately estimates single and multi-word token counts', () => {
    expect(countTokens('hello')).toBe(1);
    expect(countTokens('hello world')).toBe(2);
    expect(countTokens('Retrieval-Augmented Generation (RAG)')).toBeGreaterThanOrEqual(5);
  });

  it('analyzes token metrics and reports reasonable chars-per-token ratio', () => {
    const text = 'ChunkCraft provides high accuracy benchmark evaluation for RAG pipelines.';
    const metrics = analyzeTokenMetrics(text);

    expect(metrics.characterCount).toBe(text.length);
    expect(metrics.wordCount).toBe(9);
    expect(metrics.tokenCount).toBeGreaterThan(5);
    expect(metrics.ratioCharsPerToken).toBeGreaterThan(2);
    expect(metrics.ratioCharsPerToken).toBeLessThan(7);
  });

  it('tokenizes text into individual BPE fragments', () => {
    const tokens = tokenize('Hello, world! 123');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.join('')).toBe('Hello, world! 123');
  });
});
