import { BaseChunker, ChunkingOptions, DocumentChunk, createChunkId } from './base.js';
import { RecursiveCharacterChunker } from './recursive-char.js';
import { countTokens } from '../tokenizer/token-counter.js';

export class HierarchicalChunker implements BaseChunker {
  readonly strategyName = 'hierarchical';

  private recursiveChunker = new RecursiveCharacterChunker();

  async chunk(
    documentText: string,
    options: ChunkingOptions,
    documentId: string = 'doc'
  ): Promise<DocumentChunk[]> {
    const parentSize = options.parentChunkSize || Math.max(options.chunkSize * 3, 600);
    const parentOverlap = options.parentOverlap || Math.floor(parentSize * 0.15);
    const childSize = options.chunkSize;
    const childOverlap = options.chunkOverlap;

    // 1. Generate Parent Macro Chunks
    const parentChunks = await this.recursiveChunker.chunk(documentText, {
      ...options,
      chunkSize: parentSize,
      chunkOverlap: parentOverlap
    }, documentId);

    const allChunks: DocumentChunk[] = [];

    // Tag and push parent chunks
    for (let pIdx = 0; pIdx < parentChunks.length; pIdx++) {
      const parent = parentChunks[pIdx];
      const parentId = createChunkId(documentId, `${this.strategyName}-parent`, pIdx);
      
      const enrichedParent: DocumentChunk = {
        ...parent,
        id: parentId,
        metadata: {
          ...parent.metadata,
          strategy: this.strategyName,
          level: 'parent'
        }
      };
      allChunks.push(enrichedParent);

      // 2. Generate Child Micro Chunks from this Parent's content
      const childChunks = await this.recursiveChunker.chunk(parent.content, {
        ...options,
        chunkSize: childSize,
        chunkOverlap: childOverlap
      }, `${documentId}-p${pIdx}`);

      for (let cIdx = 0; cIdx < childChunks.length; cIdx++) {
        const child = childChunks[cIdx];
        const childAbsoluteStart = parent.startIndex + child.startIndex;
        const childAbsoluteEnd = parent.startIndex + child.endIndex;

        allChunks.push({
          id: createChunkId(documentId, `${this.strategyName}-child`, allChunks.length),
          documentId,
          parentId,
          index: allChunks.length,
          content: child.content,
          startIndex: childAbsoluteStart,
          endIndex: childAbsoluteEnd,
          tokenCount: countTokens(child.content),
          metadata: {
            ...child.metadata,
            strategy: this.strategyName,
            level: 'child',
            sectionHeader: parent.metadata.sectionHeader,
            headerHierarchy: parent.metadata.headerHierarchy
          }
        });
      }
    }

    return allChunks;
  }
}
