import { EmbeddingProvider, ProviderConfig } from './base.js';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly providerName: string;
  readonly dimensions: number;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || (this.model.includes('large') ? 3072 : 1536);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.providerName = `openai::${this.model}`;
  }

  async embedText(text: string): Promise<Float64Array> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<Float64Array[]> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API key missing. Set OPENAI_API_KEY in your environment or provide apiKey in configuration.'
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
        model: this.model,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Embedding API error [${response.status}]: ${errText}`);
    }

    const data = (await response.json()) as any;
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Unexpected response format from OpenAI Embedding API.');
    }

    // Sort by index just in case
    const sorted = [...data.data].sort((a: any, b: any) => a.index - b.index);
    return sorted.map((item: any) => new Float64Array(item.embedding));
  }
}
