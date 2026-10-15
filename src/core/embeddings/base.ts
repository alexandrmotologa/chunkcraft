export interface EmbeddingProvider {
  readonly providerName: string;
  readonly dimensions: number;
  embedText(text: string): Promise<Float64Array>;
  embedBatch(texts: string[]): Promise<Float64Array[]>;
}

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  dimensions?: number;
  baseUrl?: string;
  batchSize?: number;
}
