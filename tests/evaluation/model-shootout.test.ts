import { describe, it, expect } from 'vitest';
import { ModelShootout } from '../../src/core/evaluation/model-shootout.js';
import { RecursiveCharacterChunker } from '../../src/core/chunkers/recursive-char.js';
import { GoldenQuery } from '../../src/core/evaluation/metrics.js';

describe('ModelShootout', () => {
  const shootout = new ModelShootout();
  const chunker = new RecursiveCharacterChunker();

  const doc = `
# Cloud Native Observability

## Prometheus Metrics
Prometheus scrapes numerical time-series metrics from instrumented HTTP targets via pull endpoints.
Alertmanager routes fired notifications to PagerDuty or Slack channels.

## OpenTelemetry Tracing
Distributed spans capture request propagation across microservices using W3C trace context headers.
`.trim();

  const queries: GoldenQuery[] = [
    {
      id: 'q1',
      query: 'Prometheus metrics and Alertmanager notifications',
      relevantKeywords: ['prometheus', 'metrics', 'alertmanager']
    },
    {
      id: 'q2',
      query: 'OpenTelemetry distributed tracing spans',
      relevantKeywords: ['opentelemetry', 'tracing', 'spans']
    }
  ];

  it('runs side-by-side shootout across BM25 and multiple embedding dimensions', async () => {
    const chunks = await chunker.chunk(doc, { chunkSize: 60, chunkOverlap: 10 });

    const result = await shootout.runShootout(chunks, queries, [
      { provider: 'bm25' },
      { provider: 'mock', dimensions: 384 },
      { provider: 'mock', dimensions: 768 }
    ], 'observability-spec');

    expect(result.testedProvidersCount).toBe(3);
    expect(result.candidates.length).toBe(3);
    expect(result.winner).toBeDefined();
    expect(result.winner.rank).toBe(1);

    const bm25Candidate = result.candidates.find(c => c.provider === 'bm25');
    expect(bm25Candidate).toBeDefined();
    expect(bm25Candidate?.dimensions).toBe(0);

    const mock384 = result.candidates.find(c => c.provider === 'mock' && c.dimensions === 384);
    expect(mock384).toBeDefined();
    expect(mock384?.indexingLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
