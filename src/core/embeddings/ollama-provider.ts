import { EmbeddingProvider, ProviderConfig } from './base.js';

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly providerName: string;
  readonly dimensions: number;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    this.model = config.model || 'nomic-embed-text';
    this.dimensions = config.dimensions || 768;
    this.baseUrl = config.baseUrl || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.providerName = `ollama::${this.model}`;
  }

  async embedText(text: string): Promise<Float64Array> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<Float64Array[]> {
    if (texts.length === 0) return [];

    // First attempt the modern /api/embed endpoint supporting batch input
    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          input: texts
        })
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.embeddings && Array.isArray(data.embeddings)) {
          return data.embeddings.map((arr: number[]) => new Float64Array(arr));
        }
      }
    } catch {
      // Fallback to sequential /api/embeddings endpoint
    }

    // Sequential fallback for legacy Ollama versions
    const results: Float64Array[] = [];
    for (const text of texts) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: text
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama Embedding API error [${response.status}]: ${errText}`);
      }

      const data = (await response.json()) as any;
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Unexpected response format from Ollama /api/embeddings.');
      }
      results.push(new Float64Array(data.embedding));
    }

    return results;
  }
}
