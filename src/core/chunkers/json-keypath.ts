import { BaseChunker, ChunkingOptions, DocumentChunk, createChunkId, findChunkOffsets } from './base.js';
import { RecursiveCharacterChunker } from './recursive-char.js';
import { countTokens } from '../tokenizer/token-counter.js';

/**
 * JSON Key-Path Chunker that transforms nested JSON structures into flattened,
 * contextually enriched key-path chunks so retrieval never loses parent context.
 */
export class JsonKeyPathChunker implements BaseChunker {
  readonly strategyName = 'json-keypath';

  private fallbackChunker = new RecursiveCharacterChunker();

  async chunk(
    documentText: string,
    options: ChunkingOptions,
    documentId: string = 'json-doc'
  ): Promise<DocumentChunk[]> {
    let parsed: any;
    try {
      parsed = JSON.parse(documentText);
    } catch {
      // If not strict JSON, fallback to standard chunker
      return this.fallbackChunker.chunk(documentText, options, documentId);
    }

    const keyPathEntries: Array<{ path: string; content: string }> = [];

    const traverse = (obj: any, currentPath: string = '') => {
      if (obj === null || obj === undefined) return;

      if (typeof obj !== 'object' || Array.isArray(obj)) {
        keyPathEntries.push({
          path: currentPath || 'root',
          content: `${currentPath || 'root'}: ${JSON.stringify(obj, null, 2)}`
        });
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        const serialized = JSON.stringify(value, null, 2);

        // If this subtree fits reasonably in chunk budget, keep it as an atomic key-path unit
        if (countTokens(serialized) <= options.chunkSize && typeof value === 'object' && value !== null) {
          keyPathEntries.push({
            path: nextPath,
            content: `[${nextPath}]\n${serialized}`
          });
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, nextPath);
        } else {
          keyPathEntries.push({
            path: nextPath,
            content: `${nextPath}: ${JSON.stringify(value)}`
          });
        }
      }
    };

    traverse(parsed);

    // Merge entries into chunks respecting targetSize
    const result: DocumentChunk[] = [];
    let currentBatch: typeof keyPathEntries = [];
    let currentTokens = 0;
    let cursor = 0;

    const flushBatch = () => {
      if (currentBatch.length === 0) return;
      const mergedText = currentBatch.map(e => e.content).join('\n\n');
      const primaryPath = currentBatch[0].path;

      const offsets = findChunkOffsets(documentText, mergedText, cursor);
      cursor = offsets.nextCursor;

      result.push({
        id: createChunkId(documentId, this.strategyName, result.length),
        documentId,
        index: result.length,
        content: mergedText,
        startIndex: offsets.startIndex,
        endIndex: offsets.endIndex,
        tokenCount: countTokens(mergedText),
        metadata: {
          strategy: this.strategyName,
          sectionHeader: primaryPath,
          headerHierarchy: currentBatch.map(e => e.path)
        }
      });

      currentBatch = [];
      currentTokens = 0;
    };

    for (const entry of keyPathEntries) {
      const entryTokens = countTokens(entry.content);

      if (currentTokens + entryTokens > options.chunkSize && currentBatch.length > 0) {
        flushBatch();
      }

      currentBatch.push(entry);
      currentTokens += entryTokens;
    }

    flushBatch();
    return result;
  }
}
