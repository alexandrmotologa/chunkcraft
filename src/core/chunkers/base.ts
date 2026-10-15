import { countTokens } from '../tokenizer/token-counter.js';

export interface DocumentChunk {
  id: string;
  documentId: string;
  index: number;
  content: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
  parentId?: string;
  metadata: {
    sectionHeader?: string;
    headerHierarchy?: string[];
    isCodeBlock?: boolean;
    strategy: string;
    level?: 'parent' | 'child' | 'leaf';
    custom?: Record<string, unknown>;
  };
}

export interface ChunkingOptions {
  /** Target size per chunk in tokens (or characters if useCharBudget is true) */
  chunkSize: number;
  /** Overlap between consecutive chunks in tokens */
  chunkOverlap: number;
  /** Whether chunkSize is interpreted in characters instead of tokens */
  useCharBudget?: boolean;
  /** Keep Markdown code blocks whole without slicing them */
  preserveCodeBlocks?: boolean;
  /** Retain section headers in chunk content or metadata */
  preserveHeaders?: boolean;
  /** Custom separators for recursive chunking */
  separators?: string[];
  /** Parent chunk size for hierarchical chunking */
  parentChunkSize?: number;
  /** Parent overlap for hierarchical chunking */
  parentOverlap?: number;
}

export interface ChunkingResult {
  strategy: string;
  documentId: string;
  documentLengthChars: number;
  totalTokens: number;
  chunks: DocumentChunk[];
  stats: {
    totalChunks: number;
    averageChunkTokens: number;
    minChunkTokens: number;
    maxChunkTokens: number;
    varianceChunkTokens: number;
    durationMs: number;
    fragmentationScore: number;
  };
}

export interface BaseChunker {
  readonly strategyName: string;
  chunk(documentText: string, options: ChunkingOptions, documentId?: string): Promise<DocumentChunk[]>;
}

/**
 * Creates a unique deterministic chunk identifier based on document, strategy, and index.
 */
export function createChunkId(documentId: string, strategy: string, index: number): string {
  const cleanDoc = documentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStrat = strategy.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanDoc}::${cleanStrat}::c${String(index).padStart(4, '0')}`;
}

/**
 * Computes exact start and end character offsets of a substring inside the source document text,
 * advancing from a known search offset to correctly handle duplicate substrings.
 */
export function findChunkOffsets(
  sourceText: string,
  chunkContent: string,
  searchCursor: number = 0
): { startIndex: number; endIndex: number; nextCursor: number } {
  const trimmed = chunkContent.trim();
  if (!trimmed) {
    return { startIndex: searchCursor, endIndex: searchCursor, nextCursor: searchCursor };
  }

  // First try searching from the current cursor
  let foundAt = sourceText.indexOf(trimmed, searchCursor);
  if (foundAt === -1) {
    // If not found ahead, search from beginning
    foundAt = sourceText.indexOf(trimmed, 0);
  }

  if (foundAt === -1) {
    // Fallback: boundary clamped to cursor
    return {
      startIndex: searchCursor,
      endIndex: Math.min(sourceText.length, searchCursor + trimmed.length),
      nextCursor: Math.min(sourceText.length, searchCursor + trimmed.length)
    };
  }

  const endIndex = foundAt + trimmed.length;
  return {
    startIndex: foundAt,
    endIndex,
    nextCursor: foundAt + Math.floor(trimmed.length * 0.4) // step forward sensibly
  };
}

/**
 * Aggregates statistics for an array of document chunks.
 */
export function calculateChunkStats(
  chunks: DocumentChunk[],
  documentText: string,
  durationMs: number
): ChunkingResult['stats'] {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      averageChunkTokens: 0,
      minChunkTokens: 0,
      maxChunkTokens: 0,
      varianceChunkTokens: 0,
      durationMs,
      fragmentationScore: 0
    };
  }

  const tokenCounts = chunks.map(c => c.tokenCount);
  const totalTokens = tokenCounts.reduce((acc, count) => acc + count, 0);
  const averageChunkTokens = totalTokens / chunks.length;

  const minChunkTokens = Math.min(...tokenCounts);
  const maxChunkTokens = Math.max(...tokenCounts);

  const variance = tokenCounts.reduce((acc, count) => acc + Math.pow(count - averageChunkTokens, 2), 0) / chunks.length;

  // Calculate Context Fragmentation Score:
  // Evaluates how frequently double-newline paragraph boundaries were severed within chunks
  const paragraphs = documentText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  let severedParagraphs = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length < 40) continue;
    // Check if paragraph is divided across multiple chunks
    let containingChunks = 0;
    for (const chunk of chunks) {
      if (chunk.content.includes(trimmed)) {
        containingChunks = 1;
        break;
      }
      // Partial intersection check
      const snippet = trimmed.slice(0, Math.min(trimmed.length, 30));
      if (chunk.content.includes(snippet)) {
        containingChunks++;
      }
    }
    if (containingChunks > 1) {
      severedParagraphs++;
    }
  }

  const fragmentationScore = paragraphs.length > 0
    ? Number((severedParagraphs / paragraphs.length).toFixed(4))
    : 0;

  return {
    totalChunks: chunks.length,
    averageChunkTokens: Number(averageChunkTokens.toFixed(1)),
    minChunkTokens,
    maxChunkTokens,
    varianceChunkTokens: Number(variance.toFixed(1)),
    durationMs: Number(durationMs.toFixed(2)),
    fragmentationScore
  };
}
