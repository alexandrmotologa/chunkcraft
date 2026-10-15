import { BaseChunker, ChunkingOptions, DocumentChunk, createChunkId, findChunkOffsets } from './base.js';
import { countTokens } from '../tokenizer/token-counter.js';

export class SemanticBoundaryChunker implements BaseChunker {
  readonly strategyName = 'semantic-boundary';

  async chunk(
    documentText: string,
    options: ChunkingOptions,
    documentId: string = 'doc'
  ): Promise<DocumentChunk[]> {
    const sentences = this.splitIntoSentences(documentText);
    const targetSize = options.chunkSize;
    const overlapTokens = Math.min(options.chunkOverlap, Math.floor(targetSize * 0.8));
    const isTokens = !options.useCharBudget;
    const measure = (s: string) => (isTokens ? countTokens(s) : s.length);

    const rawChunks: string[] = [];
    let currentBatch: string[] = [];
    let currentTokens = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = measure(sentence);

      if (currentTokens + sentenceTokens > targetSize && currentBatch.length > 0) {
        rawChunks.push(currentBatch.join(' '));

        if (overlapTokens > 0) {
          const overlapBatch: string[] = [];
          let accumulatedOverlap = 0;

          for (let j = currentBatch.length - 1; j >= 0; j--) {
            const s = currentBatch[j];
            const sTokens = measure(s);
            if (accumulatedOverlap + sTokens <= overlapTokens) {
              overlapBatch.unshift(s);
              accumulatedOverlap += sTokens;
            } else {
              break;
            }
          }

          currentBatch = [...overlapBatch];
          currentTokens = accumulatedOverlap;
        } else {
          currentBatch = [];
          currentTokens = 0;
        }
      }

      currentBatch.push(sentence);
      currentTokens += sentenceTokens;
    }

    if (currentBatch.length > 0) {
      rawChunks.push(currentBatch.join(' '));
    }

    const result: DocumentChunk[] = [];
    let cursor = 0;

    for (let i = 0; i < rawChunks.length; i++) {
      const content = rawChunks[i].trim();
      if (!content) continue;

      const offsets = findChunkOffsets(documentText, content, cursor);
      cursor = offsets.nextCursor;

      const headerMatch = content.match(/^(#{1,6}\s+[^\n]+)/m);
      const sectionHeader = headerMatch ? headerMatch[1].replace(/^#+\s*/, '') : undefined;

      result.push({
        id: createChunkId(documentId, this.strategyName, result.length),
        documentId,
        index: result.length,
        content,
        startIndex: offsets.startIndex,
        endIndex: offsets.endIndex,
        tokenCount: countTokens(content),
        metadata: {
          strategy: this.strategyName,
          sectionHeader,
          headerHierarchy: sectionHeader ? [sectionHeader] : undefined
        }
      });
    }

    return result;
  }

  /**
   * Splits text into sentence units without severing abbreviations, URLs, or decimals.
   */
  private splitIntoSentences(text: string): string[] {
    if (!text) return [];

    // Replace common non-terminal dots temporarily to protect them
    const protectedText = text
      .replace(/\b(e\.g\.|i\.e\.|etc\.|vs\.|mr\.|mrs\.|ms\.|dr\.|prof\.|inc\.|ltd\.|corp\.)/gi, (match) => {
        return match.replace(/\./g, '__DOT__');
      })
      .replace(/(\d+)\.(\d+)/g, '$1__DOT__$2'); // e.g. 3.14 or v1.0

    // Split on sentence-ending punctuation followed by whitespace or line break
    const rawSentences = protectedText.split(/(?<=[.!?])(?:\s+|\n+)/);

    const cleanSentences: string[] = [];
    for (const raw of rawSentences) {
      const restored = raw.replace(/__DOT__/g, '.').trim();
      if (restored.length > 0) {
        cleanSentences.push(restored);
      }
    }

    return cleanSentences;
  }
}
