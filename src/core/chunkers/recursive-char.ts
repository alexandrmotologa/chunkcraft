import { BaseChunker, ChunkingOptions, DocumentChunk, createChunkId, findChunkOffsets } from './base.js';
import { countTokens } from '../tokenizer/token-counter.js';

export class RecursiveCharacterChunker implements BaseChunker {
  readonly strategyName = 'recursive-char';

  private defaultSeparators = ['\n\n', '\n', '. ', ' ', ''];

  async chunk(
    documentText: string,
    options: ChunkingOptions,
    documentId: string = 'doc'
  ): Promise<DocumentChunk[]> {
    const rawChunks = this.splitText(documentText, options);
    const result: DocumentChunk[] = [];
    let cursor = 0;

    for (let i = 0; i < rawChunks.length; i++) {
      const content = rawChunks[i].trim();
      if (!content) continue;

      const offsets = findChunkOffsets(documentText, content, cursor);
      cursor = offsets.nextCursor;

      // Extract section header if present at start or recent line
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

  private splitText(text: string, options: ChunkingOptions): string[] {
    const separators = options.separators || this.defaultSeparators;
    const targetSize = options.chunkSize;
    const overlap = Math.min(options.chunkOverlap, Math.floor(targetSize * 0.8));
    const isTokens = !options.useCharBudget;

    const measure = (s: string) => (isTokens ? countTokens(s) : s.length);

    // Recursive piece splitter
    const splitRecursive = (textChunk: string, sepIndex: number): string[] => {
      if (!textChunk) return [];
      if (measure(textChunk) <= targetSize) {
        return [textChunk];
      }
      if (sepIndex >= separators.length) {
        // Fallback hard split if no more separators exist
        const pieces: string[] = [];
        let pos = 0;
        const step = isTokens ? Math.max(10, Math.floor(targetSize * 3.5)) : targetSize;
        while (pos < textChunk.length) {
          pieces.push(textChunk.slice(pos, pos + step));
          pos += step;
        }
        return pieces;
      }

      const separator = separators[sepIndex];
      let parts: string[];

      if (separator === '') {
        parts = Array.from(textChunk);
      } else {
        parts = textChunk.split(separator);
      }

      const validPieces: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        let piece = parts[i];
        if (i < parts.length - 1 && separator !== '') {
          piece = piece + separator;
        }
        if (!piece) continue;

        if (measure(piece) > targetSize) {
          const subPieces = splitRecursive(piece, sepIndex + 1);
          validPieces.push(...subPieces);
        } else {
          validPieces.push(piece);
        }
      }

      return validPieces;
    };

    const initialPieces = splitRecursive(text, 0);

    // Merge pieces into chunks respecting targetSize and overlap
    const mergedChunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;

    for (let i = 0; i < initialPieces.length; i++) {
      const piece = initialPieces[i];
      const pieceTokens = measure(piece);

      if (currentTokens + pieceTokens > targetSize && currentChunk.length > 0) {
        const fullChunk = currentChunk.join('');
        mergedChunks.push(fullChunk);

        // Build overlap for next chunk
        if (overlap > 0) {
          const overlapPieces: string[] = [];
          let accumulatedOverlap = 0;

          for (let j = currentChunk.length - 1; j >= 0; j--) {
            const p = currentChunk[j];
            const pTokens = measure(p);
            if (accumulatedOverlap + pTokens <= overlap) {
              overlapPieces.unshift(p);
              accumulatedOverlap += pTokens;
            } else {
              break;
            }
          }

          currentChunk = [...overlapPieces];
          currentTokens = accumulatedOverlap;
        } else {
          currentChunk = [];
          currentTokens = 0;
        }
      }

      currentChunk.push(piece);
      currentTokens += pieceTokens;
    }

    if (currentChunk.length > 0) {
      mergedChunks.push(currentChunk.join(''));
    }

    return mergedChunks;
  }
}
