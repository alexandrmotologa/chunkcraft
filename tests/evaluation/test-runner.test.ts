import { describe, it, expect } from 'vitest';
import { BenchmarkRunner } from '../../src/core/evaluation/test-runner.js';
import { GoldenQuery } from '../../src/core/evaluation/metrics.js';
import { generateGoldenQueries } from '../../src/core/evaluation/golden-query-gen.js';

describe('BenchmarkRunner', () => {
  const runner = new BenchmarkRunner();

  const doc = `
# Data Platform Architecture

## Ingestion Layer
Data is ingested from external webhooks and queued into Apache Kafka topics.
Consumers process events asynchronously with dead-letter queue fallbacks.

## Storage Layer
Raw events are persisted in Amazon S3 parquet tables.
Aggregated analytics reside in ClickHouse for real-time dashboards.

## Security Controls
All data at rest is encrypted via AWS KMS customer-managed keys.
RBAC policies restrict access per team identity.
`.trim();

  it('generates synthetic golden queries from document headings', () => {
    const queries = generateGoldenQueries(doc, 3);
    expect(queries.length).toBe(3);
    expect(queries[0].query).toContain('Ingestion Layer');
    expect(queries[0].relevantKeywords.length).toBeGreaterThan(0);
  });

  it('runs benchmark suite across multiple chunking strategies', async () => {
    const queries: GoldenQuery[] = [
      {
        id: 'q_ingest',
        query: 'How does Kafka handle event ingestion?',
        relevantKeywords: ['kafka', 'ingestion', 'queued', 'webhooks']
      },
      {
        id: 'q_storage',
        query: 'Where are analytics stored?',
        relevantKeywords: ['storage', 'clickhouse', 'parquet', 'analytics']
      }
    ];

    const suite = await runner.runSuite(doc, queries, {
      chunkSize: 40,
      chunkOverlap: 8,
      strategies: ['recursive-char', 'markdown-ast', 'semantic-boundary'],
      provider: 'mock'
    }, 'sample-doc');

    expect(suite.strategies.length).toBe(3);
    for (const report of suite.strategies) {
      expect(report.metrics.totalChunks).toBeGreaterThan(0);
      expect(report.metrics.meanReciprocalRank).toBeGreaterThanOrEqual(0);
      expect(report.queryResults.length).toBe(2);
    }
  });
});
