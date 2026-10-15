import { BenchmarkRunner } from './test-runner.js';
import { GoldenQuery, BenchmarkMetrics } from './metrics.js';

export interface GridConfig {
  chunkSizes?: number[];
  chunkOverlaps?: number[];
  strategies?: string[];
  provider?: string;
}

export interface TuningCandidate {
  rank: number;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
  fitnessScore: number;
  metrics: BenchmarkMetrics;
}

export interface TuningResult {
  documentId: string;
  evaluatedConfigurationsCount: number;
  bestCandidate: TuningCandidate;
  candidates: TuningCandidate[];
  durationMs: number;
}

/**
 * Automated parameter tuner executing grid search across chunk sizes, overlaps, and strategies
 * to discover the Pareto-optimal configuration maximizing MRR and minimizing fragmentation.
 */
export class AutoTuner {
  private runner: BenchmarkRunner = new BenchmarkRunner();

  async tune(
    documentText: string,
    queries: GoldenQuery[],
    grid: GridConfig = {},
    documentId: string = 'doc'
  ): Promise<TuningResult> {
    const chunkSizes = grid.chunkSizes || [250, 500, 800];
    const chunkOverlaps = grid.chunkOverlaps || [0, 50];
    const strategies = grid.strategies || ['recursive-char', 'markdown-ast', 'semantic-boundary'];
    const provider = grid.provider || 'mock';

    const candidates: TuningCandidate[] = [];
    const startTime = performance.now();

    for (const strat of strategies) {
      for (const size of chunkSizes) {
        for (const overlap of chunkOverlaps) {
          if (overlap >= size) continue;

          const report = await this.runner.runSingleStrategy(
            documentText,
            strat,
            { chunkSize: size, chunkOverlap: overlap },
            provider as any,
            queries,
            documentId
          );

          const m = report.metrics;

          // Composite fitness score:
          // 45% MRR + 35% Recall@3 + 20% Non-Fragmentation
          const fitness = (m.meanReciprocalRank * 0.45) +
            (m.recallAt3 * 0.35) +
            ((1.0 - m.contextFragmentationScore) * 0.20);

          candidates.push({
            rank: 0,
            strategy: strat,
            chunkSize: size,
            chunkOverlap: overlap,
            fitnessScore: Number(fitness.toFixed(4)),
            metrics: m
          });
        }
      }
    }

    // Sort descending by fitness score, then by lowest latency
    candidates.sort((a, b) => {
      if (b.fitnessScore !== a.fitnessScore) {
        return b.fitnessScore - a.fitnessScore;
      }
      return a.metrics.chunkingLatencyMs - b.metrics.chunkingLatencyMs;
    });

    // Assign 1-indexed ranks
    for (let i = 0; i < candidates.length; i++) {
      candidates[i].rank = i + 1;
    }

    const durationMs = performance.now() - startTime;

    return {
      documentId,
      evaluatedConfigurationsCount: candidates.length,
      bestCandidate: candidates[0],
      candidates,
      durationMs: Number(durationMs.toFixed(1))
    };
  }
}
