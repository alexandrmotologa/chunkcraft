import { describe, it, expect } from 'vitest';
import { AutoTuner } from '../../src/core/evaluation/auto-tuner.js';
import { GoldenQuery } from '../../src/core/evaluation/metrics.js';

describe('AutoTuner', () => {
  const tuner = new AutoTuner();

  const doc = `
# Data Platform Architecture

## Ingestion Layer
Data is ingested from external webhooks and queued into Apache Kafka topics.
Consumers process events asynchronously with dead-letter queue fallbacks.

## Storage Layer
Raw events are persisted in Amazon S3 parquet tables.
Aggregated analytics reside in ClickHouse for real-time dashboards.
`.trim();

  const queries: GoldenQuery[] = [
    {
      id: 'q1',
      query: 'Kafka event ingestion',
      relevantKeywords: ['kafka', 'ingestion']
    },
    {
      id: 'q2',
      query: 'ClickHouse storage',
      relevantKeywords: ['clickhouse', 'storage']
    }
  ];

  it('evaluates configuration grid and ranks Pareto-optimal parameters', async () => {
    const result = await tuner.tune(doc, queries, {
      chunkSizes: [40, 80],
      chunkOverlaps: [0, 10],
      strategies: ['recursive-char', 'markdown-ast'],
      provider: 'mock'
    });

    expect(result.evaluatedConfigurationsCount).toBe(8); // 2 strategies * 2 sizes * 2 overlaps = 8
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.bestCandidate).toBeDefined();
    expect(result.bestCandidate.rank).toBe(1);
    expect(result.bestCandidate.fitnessScore).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
