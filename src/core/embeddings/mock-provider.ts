import { EmbeddingProvider } from './base.js';
import { l2Normalize } from '../storage/vector-math.js';

/**
 * Deterministic pseudo-embedding provider using Random Projection (Johnson-Lindenstrauss).
 * Maps word and character n-grams to high-dimensional unit vectors.
 * Preserves semantic overlap (shared words/phrases produce high cosine similarity)
 * with zero cloud dependencies or external model downloads.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly providerName: string;
  readonly dimensions: number;

  constructor(dimensions: number = 384, providerName: string = 'mock-deterministic') {
    this.dimensions = dimensions;
    this.providerName = providerName;
  }

  async embedText(text: string): Promise<Float64Array> {
    const vector = new Float64Array(this.dimensions);
    const cleaned = text.toLowerCase().trim();

    if (!cleaned) {
      return vector;
    }

    // Extract word tokens and character 3-grams for morphological sensitivity
    const words = cleaned.split(/[\s,.;:!?()\[\]{}"'`<>\/\\#*=_~+-]+/).filter(w => w.length > 0);
    const ngrams: string[] = [...words];

    for (const w of words) {
      if (w.length >= 4) {
        for (let i = 0; i <= w.length - 3; i++) {
          ngrams.push(w.slice(i, i + 3));
        }
      }
    }

    if (ngrams.length === 0) {
      return vector;
    }

    // Random projection into dense dimensions
    for (const item of ngrams) {
      const hash1 = this.fnv1a(item);
      const hash2 = this.fnv1a(item + '_salt');

      const idx1 = Math.abs(hash1) % this.dimensions;
      const idx2 = Math.abs(hash2) % this.dimensions;
      const idx3 = Math.abs(hash1 ^ hash2) % this.dimensions;

      const sign1 = (hash1 & 1) === 0 ? 1.0 : -1.0;
      const sign2 = (hash2 & 1) === 0 ? 1.0 : -1.0;
      const sign3 = ((hash1 >> 1) & 1) === 0 ? 1.0 : -1.0;

      vector[idx1] += sign1;
      vector[idx2] += sign2 * 0.75;
      vector[idx3] += sign3 * 0.5;
    }

    return l2Normalize(vector);
  }

  async embedBatch(texts: string[]): Promise<Float64Array[]> {
    return Promise.all(texts.map(t => this.embedText(t)));
  }

  /**
   * 32-bit FNV-1a non-cryptographic hash function
   */
  private fnv1a(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash;
  }
}
