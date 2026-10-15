import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  dotProduct,
  l2Norm,
  l2Normalize,
  euclideanDistance
} from '../../src/core/storage/vector-math.js';

describe('VectorMath', () => {
  it('computes dot product of identical vectors correctly', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(dotProduct(a, b)).toBe(32);
  });

  it('computes L2 norm and normalizes vector to unit length', () => {
    const vec = new Float64Array([3, 4]);
    expect(l2Norm(vec)).toBe(5);

    const normalized = l2Normalize(vec);
    expect(l2Norm(normalized)).toBeCloseTo(1.0, 5);
    expect(normalized[0]).toBeCloseTo(0.6, 5);
    expect(normalized[1]).toBeCloseTo(0.8, 5);
  });

  it('computes cosine similarity accurately', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const c = [0, 1, 0];
    const d = [-1, 0, 0];

    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
    expect(cosineSimilarity(a, c)).toBeCloseTo(0.0, 5);
    expect(cosineSimilarity(a, d)).toBeCloseTo(-1.0, 5);
  });

  it('computes euclidean distance between points', () => {
    const a = [0, 0];
    const b = [3, 4];
    expect(euclideanDistance(a, b)).toBe(5);
  });
});
