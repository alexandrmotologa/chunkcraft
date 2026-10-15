export interface CostAndSizingEstimate {
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
  providerEstimates: Array<{
    provider: string;
    model: string;
    dimensions: number;
    ingestionCostUsd: number;
    rawVectorBytes: number;
    hnswIndexBytes: number;
    totalStorageMb: number;
  }>;
}

const PROVIDER_PRICING: Record<string, { model: string; dimensions: number; usdPerMillionTokens: number }> = {
  'openai-small': { model: 'text-embedding-3-small', dimensions: 1536, usdPerMillionTokens: 0.020 },
  'openai-large': { model: 'text-embedding-3-large', dimensions: 3072, usdPerMillionTokens: 0.130 },
  'voyage-3': { model: 'voyage-3', dimensions: 1024, usdPerMillionTokens: 0.120 },
  'voyage-code-3': { model: 'voyage-code-3', dimensions: 1536, usdPerMillionTokens: 0.120 },
  'ollama-bge-m3': { model: 'bge-m3', dimensions: 1024, usdPerMillionTokens: 0.000 },
  'mock-local': { model: 'mock-deterministic', dimensions: 384, usdPerMillionTokens: 0.000 }
};

/**
 * Calculates financial ingestion costs and Vector Database (HNSW / pgvector) RAM footprints.
 */
export function calculateCostAndSizing(totalTokens: number, totalChunks: number): CostAndSizingEstimate {
  const avgTokensPerChunk = totalChunks > 0 ? totalTokens / totalChunks : 0;

  const providerEstimates = Object.entries(PROVIDER_PRICING).map(([key, info]) => {
    // Ingestion price
    const ingestionCostUsd = (totalTokens / 1_000_000) * info.usdPerMillionTokens;

    // Vector size: Float32 (4 bytes per dimension)
    const rawVectorBytes = totalChunks * info.dimensions * 4;
    // HNSW index graph overhead (~25% overhead for 16-32 neighbors)
    const hnswIndexBytes = Math.round(rawVectorBytes * 0.25);
    // Metadata overhead (~400 bytes per chunk text and metadata)
    const metadataBytes = totalChunks * 400;

    const totalStorageBytes = rawVectorBytes + hnswIndexBytes + metadataBytes;
    const totalStorageMb = Number((totalStorageBytes / (1024 * 1024)).toFixed(3));

    return {
      provider: key,
      model: info.model,
      dimensions: info.dimensions,
      ingestionCostUsd: Number(ingestionCostUsd.toFixed(6)),
      rawVectorBytes,
      hnswIndexBytes,
      totalStorageMb
    };
  });

  return {
    totalChunks,
    totalTokens,
    avgTokensPerChunk: Number(avgTokensPerChunk.toFixed(1)),
    providerEstimates
  };
}
