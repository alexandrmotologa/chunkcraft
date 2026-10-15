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

export interface ChunkingStats {
  totalChunks: number;
  averageChunkTokens: number;
  minChunkTokens: number;
  maxChunkTokens: number;
  varianceChunkTokens: number;
  durationMs: number;
  fragmentationScore: number;
}

export interface GoldenQuery {
  id: string;
  query: string;
  relevantKeywords: string[];
  expectedMatchingSubstrings?: string[];
}

export interface BenchmarkMetrics {
  strategyName: string;
  providerName: string;
  totalChunks: number;
  averageChunkSize: number;
  chunkSizeVariance: number;
  chunkingLatencyMs: number;
  indexingLatencyMs: number;
  retrievalLatencyMs: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt3: number;
  recallAt5: number;
  meanReciprocalRank: number;
  hitRate: number;
  contextFragmentationScore: number;
}

export interface QueryEvaluationResult {
  queryId: string;
  query: string;
  retrieved: Array<{
    id: string;
    rank: number;
    score: number;
    isRelevant: boolean;
    contentPreview: string;
    sectionHeader?: string;
  }>;
  firstRelevantRank: number | null;
  reciprocalRank: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt3: number;
  recallAt5: number;
}

export interface StrategyEvaluationReport {
  metrics: BenchmarkMetrics;
  queryResults: QueryEvaluationResult[];
}

export interface SuiteEvaluationResult {
  documentId: string;
  documentLengthChars: number;
  provider: string;
  strategies: StrategyEvaluationReport[];
  queries: GoldenQuery[];
}
