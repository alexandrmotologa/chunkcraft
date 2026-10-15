import { DocumentChunk } from '../chunkers/base.js';

export interface BM25Options {
  k1?: number; // Term frequency saturation (default: 1.5)
  b?: number;  // Document length normalization (default: 0.75)
}

export interface BM25SearchResult {
  chunk: DocumentChunk;
  score: number;
  rank: number;
}

/**
 * In-memory Okapi BM25 search engine for lexical retrieval benchmarking.
 */
export class BM25Engine {
  private k1: number;
  private b: number;
  private chunks: DocumentChunk[] = [];
  private docTokens: string[][] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private docFrequencies: Map<string, number> = new Map();
  private vocabulary: Set<string> = new Set();

  constructor(options: BM25Options = {}) {
    this.k1 = options.k1 ?? 1.5;
    this.b = options.b ?? 0.75;
  }

  /**
   * Tokenizes text into lowercase lexical words, removing punctuation.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[\s,.;:!?()\[\]{}"'`<>\/\\#*=_~+-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  /**
   * Indexes a collection of document chunks into the BM25 inverted index.
   */
  indexChunks(chunks: DocumentChunk[]): void {
    this.chunks = chunks;
    this.docTokens = [];
    this.docLengths = [];
    this.docFrequencies.clear();
    this.vocabulary.clear();

    let totalLength = 0;

    for (const chunk of chunks) {
      const tokens = this.tokenize(chunk.content);
      this.docTokens.push(tokens);
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const seenTerms = new Set<string>();
      for (const term of tokens) {
        this.vocabulary.add(term);
        if (!seenTerms.has(term)) {
          seenTerms.add(term);
          this.docFrequencies.set(term, (this.docFrequencies.get(term) || 0) + 1);
        }
      }
    }

    this.avgDocLength = chunks.length > 0 ? totalLength / chunks.length : 0;
  }

  /**
   * Computes Inverse Document Frequency (IDF) with Robertson-Spärck Jones formula.
   */
  private idf(term: string): number {
    const N = this.chunks.length;
    const n = this.docFrequencies.get(term) || 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  }

  /**
   * Scores all indexed chunks against a search query and returns top-K results.
   */
  search(query: string, topK: number = 5): BM25SearchResult[] {
    if (this.chunks.length === 0) return [];

    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    const scores: Array<{ index: number; score: number }> = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const tokens = this.docTokens[i];
      const docLen = this.docLengths[i];
      let docScore = 0;

      // Count term frequencies in this document
      const tfMap = new Map<string, number>();
      for (const term of tokens) {
        tfMap.set(term, (tfMap.get(term) || 0) + 1);
      }

      for (const qTerm of queryTerms) {
        const tf = tfMap.get(qTerm) || 0;
        if (tf === 0) continue;

        const termIdf = this.idf(qTerm);
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / (this.avgDocLength || 1)));

        docScore += termIdf * (numerator / denominator);
      }

      if (docScore > 0) {
        scores.push({ index: i, score: docScore });
      }
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    const results: BM25SearchResult[] = [];
    const maxK = Math.min(topK, scores.length);

    for (let rank = 0; rank < maxK; rank++) {
      const item = scores[rank];
      results.push({
        chunk: this.chunks[item.index],
        score: Number(item.score.toFixed(4)),
        rank: rank + 1
      });
    }

    return results;
  }
}
