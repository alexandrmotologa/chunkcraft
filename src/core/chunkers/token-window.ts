import { BaseChunker, ChunkingOptions, DocumentChunk, createChunkId, findChunkOffsets } from './base.js';
import { countTokens, tokenize } from '../tokenizer/token-counter.js';

export class TokenSlidingWindowChunker implements BaseChunker {
  readonly strategyName = 'token-window';

  async chunk(
    documentText: string,
    options: ChunkingOptions,
    documentId: string = 'doc'
  ): Promise<DocumentChunk[]> {
    const tokens = tokenize(documentText);
    const windowSize = Math.max(1, options.chunkSize);
    const overlap = Math.min(options.chunkOverlap, Math.floor(windowSize * 0.9));
    const step = Math.max(1, windowSize - overlap);

    const result: DocumentChunk[] = [];
    let tokenIndex = 0;
    let cursor = 0;

    while (tokenIndex < tokens.length) {
      const windowTokens = tokens.slice(tokenIndex, tokenIndex + windowSize);
      const content = windowTokens.join('').trim();

      if (content.length > 0) {
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

      tokenIndex += step;
      // Break if we've already covered the end of the token stream
      if (tokenIndex >= tokens.length) {
        break;
      }
    }

    return result;
  }
}
