import { EmbeddingProvider, ProviderConfig } from './base.js';

export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly providerName: string;
  readonly dimensions: number;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.VOYAGE_API_KEY || '';
    this.model = config.model || 'voyage-3';
    this.dimensions = config.dimensions || 1024;
    this.baseUrl = config.baseUrl || 'https://api.voyageai.com/v1';
    this.providerName = `voyage::${this.model}`;
  }

  async embedText(text: string): Promise<Float64Array> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<Float64Array[]> {
    if (!this.apiKey) {
      throw new Error(
        'Voyage AI API key missing. Set VOYAGE_API_KEY in your environment or provide apiKey in configuration.'
      );
    }

    if (texts.length === 0) {
      return [];
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Voyage AI Embedding API error [${response.status}]: ${errText}`);
    }

    const data = (await response.json()) as any;
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Unexpected response format from Voyage AI Embedding API.');
    }

    return data.data.map((item: any) => new Float64Array(item.embedding));
  }
}
