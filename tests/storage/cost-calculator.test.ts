import { describe, it, expect } from 'vitest';
import { calculateCostAndSizing } from '../../src/core/storage/cost-calculator.js';

describe('calculateCostAndSizing', () => {
  it('computes realistic ingestion costs and vector DB footprint', () => {
    const totalTokens = 500_000;
    const totalChunks = 1_000;

    const estimate = calculateCostAndSizing(totalTokens, totalChunks);

    expect(estimate.totalChunks).toBe(1_000);
    expect(estimate.totalTokens).toBe(500_000);
    expect(estimate.avgTokensPerChunk).toBe(500);
    expect(estimate.providerEstimates.length).toBeGreaterThan(0);

    const openaiSmall = estimate.providerEstimates.find(p => p.provider === 'openai-small');
    expect(openaiSmall).toBeDefined();
    // 500k tokens at $0.02 / 1M = $0.01
    expect(openaiSmall?.ingestionCostUsd).toBe(0.01);
    expect(openaiSmall?.rawVectorBytes).toBe(1_000 * 1536 * 4); // 6,144,000 bytes
    expect(openaiSmall?.hnswIndexBytes).toBeGreaterThan(0);
    expect(openaiSmall?.totalStorageMb).toBeGreaterThan(0);
  });
});
