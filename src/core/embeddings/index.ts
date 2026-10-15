import { EmbeddingProvider, ProviderConfig } from './base.js';
import { MockEmbeddingProvider } from './mock-provider.js';
import { OpenAIEmbeddingProvider } from './openai-provider.js';
import { VoyageEmbeddingProvider } from './voyage-provider.js';
import { OllamaEmbeddingProvider } from './ollama-provider.js';

export * from './base.js';
export * from './mock-provider.js';
export * from './bm25-provider.js';
export * from './openai-provider.js';
export * from './voyage-provider.js';
export * from './ollama-provider.js';

/**
 * Creates an embedding provider by name with optional configuration.
 */
export function getEmbeddingProvider(name: string = 'mock', config: ProviderConfig = {}): EmbeddingProvider {
  const normalized = name.toLowerCase().trim();

  if (normalized === 'mock' || normalized === 'mock-deterministic' || normalized === 'offline') {
    return new MockEmbeddingProvider(config.dimensions || 384);
  }

  if (normalized.startsWith('openai')) {
    return new OpenAIEmbeddingProvider(config);
  }

  if (normalized.startsWith('voyage')) {
    return new VoyageEmbeddingProvider(config);
  }

  if (normalized.startsWith('ollama')) {
    return new OllamaEmbeddingProvider(config);
  }

  throw new Error(`Unknown embedding provider "${name}". Supported: mock, openai, voyage, ollama`);
}

export function listAvailableEmbeddingProviders(): string[] {
  return ['mock', 'openai', 'voyage', 'ollama'];
}
