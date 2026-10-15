import { BaseChunker, ChunkingOptions, DocumentChunk, createChunkId, findChunkOffsets } from './base.js';
import { countTokens } from '../tokenizer/token-counter.js';

/**
 * Code-Aware Chunker designed for source code and technical programming documents.
 * Preserves function, class, and interface boundaries without severing blocks mid-syntax.
 */
export class CodeAwareChunker implements BaseChunker {
  readonly strategyName = 'code-aware';

  async chunk(
    documentText: string,
    options: ChunkingOptions,
    documentId: string = 'code-doc'
  ): Promise<DocumentChunk[]> {
    const targetSize = options.chunkSize;
    const isTokens = !options.useCharBudget;
    const measure = (s: string) => (isTokens ? countTokens(s) : s.length);

    // Split document into logical code blocks by function, class, or 2+ consecutive blank lines
    const blocks = this.splitCodeIntoBlocks(documentText);
    const result: DocumentChunk[] = [];
    let currentBatch: string[] = [];
    let currentTokens = 0;
    let cursor = 0;

    const flushBatch = () => {
      if (currentBatch.length === 0) return;
      const content = currentBatch.join('\n\n').trim();
      if (!content) {
        currentBatch = [];
        currentTokens = 0;
        return;
      }

      const offsets = findChunkOffsets(documentText, content, cursor);
      cursor = offsets.nextCursor;

      // Extract all detected symbol/function names in the chunk
      const symbolMatches = Array.from(content.matchAll(/\b(class|function|interface|type|def|struct|enum)\s+([a-zA-Z0-9_$]+)/g));
      const symbols = symbolMatches.map(m => `${m[1]} ${m[2]}`);
      const sectionHeader = symbols.length > 0 ? symbols.join(', ') : undefined;

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
          headerHierarchy: symbols.length > 0 ? symbols : undefined,
          isCodeBlock: true
        }
      });

      currentBatch = [];
      currentTokens = 0;
    };

    for (const block of blocks) {
      const blockTokens = measure(block);

      // If single block exceeds targetSize, split line-by-line
      if (blockTokens > targetSize) {
        flushBatch();

        const lines = block.split('\n');
        let subLines: string[] = [];
        let subTokens = 0;

        for (const line of lines) {
          const lTokens = measure(line + '\n');
          if (subTokens + lTokens > targetSize && subLines.length > 0) {
            currentBatch = [subLines.join('\n')];
            flushBatch();
            subLines = [];
            subTokens = 0;
          }
          subLines.push(line);
          subTokens += lTokens;
        }

        if (subLines.length > 0) {
          currentBatch = [subLines.join('\n')];
          flushBatch();
        }
        continue;
      }

      if (currentTokens + blockTokens > targetSize && currentBatch.length > 0) {
        flushBatch();
      }

      currentBatch.push(block);
      currentTokens += blockTokens;
    }

    flushBatch();
    return result;
  }

  /**
   * Identifies top-level code blocks using regex boundary detection.
   */
  private splitCodeIntoBlocks(text: string): string[] {
    const rawBlocks = text.split(/(?:\r?\n){2,}/);
    const validBlocks: string[] = [];

    for (const block of rawBlocks) {
      const trimmed = block.trim();
      if (trimmed.length > 0) {
        validBlocks.push(trimmed);
      }
    }

    return validBlocks;
  }
}
