import React, { useState } from 'react';
import { Play, CheckCircle2, Trophy, Clock, ShieldCheck, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { SuiteEvaluationResult, GoldenQuery } from '../types';

interface MetricsComparisonTableProps {
  documentText: string;
  chunkSize: number;
  chunkOverlap: number;
}

export const MetricsComparisonTable: React.FC<MetricsComparisonTableProps> = ({
  documentText,
  chunkSize,
  chunkOverlap
}) => {
  const [loading, setLoading] = useState(false);
  const [suite, setSuite] = useState<SuiteEvaluationResult | null>(null);
  const [provider, setProvider] = useState<'mock' | 'bm25' | 'openai' | 'ollama'>('mock');
  const [expandedQueryStrategy, setExpandedQueryStrategy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          chunkSize,
          chunkOverlap,
          provider
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to run benchmark');
      }

      const data = await response.json();
      setSuite(data);
    } catch (err: any) {
      setError(err.message || 'Benchmark error');
    } finally {
      setLoading(false);
    }
  };

  // Find best metrics
  const bestMrr = suite ? Math.max(...suite.strategies.map(s => s.metrics.meanReciprocalRank)) : 0;
  const lowestFrag = suite ? Math.min(...suite.strategies.map(s => s.metrics.contextFragmentationScore)) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Header bar */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-100 text-sm">Side-by-Side Strategy Comparison Matrix</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Benchmarks multi-strategy chunking engines against golden test queries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={provider}
            onChange={e => setProvider(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
          >
            <option value="mock">Mock Deterministic (Zero Cost)</option>
            <option value="bm25">Okapi BM25 Lexical</option>
            <option value="openai">OpenAI Embeddings</option>
            <option value="ollama">Ollama Local</option>
          </select>

          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? <Zap className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Run Benchmark</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Main Body */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {!suite && !loading && (
          <div className="text-center py-16 space-y-3">
            <Trophy className="w-8 h-8 text-cyan-400/60 mx-auto" />
            <div className="text-xs text-slate-400 max-w-sm mx-auto">
              Click <strong>Run Benchmark</strong> above to evaluate all 5 chunking strategies against synthesized golden queries.
            </div>
          </div>
        )}

        {suite && (
          <>
            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TOP MEAN RECIPROCAL RANK (MRR)</span>
                <span className="text-cyan-400 font-bold text-lg">{bestMrr.toFixed(3)}</span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">LOWEST FRAGMENTATION</span>
                <span className="text-emerald-400 font-bold text-lg">{(lowestFrag * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TESTED QUERIES</span>
                <span className="text-slate-200 font-bold text-lg">{suite.queries.length}</span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                    <th className="p-3">STRATEGY</th>
                    <th className="p-3">CHUNKS</th>
                    <th className="p-3">AVG TOKENS</th>
                    <th className="p-3">P@1</th>
                    <th className="p-3">P@3</th>
                    <th className="p-3">P@5</th>
                    <th className="p-3">R@3</th>
                    <th className="p-3">MRR</th>
                    <th className="p-3">HIT RATE</th>
                    <th className="p-3">FRAG.</th>
                    <th className="p-3">LATENCY</th>
                    <th className="p-3">DRILLDOWN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {suite.strategies.map(s => {
                    const m = s.metrics;
                    const isBestMrr = m.meanReciprocalRank === bestMrr && bestMrr > 0;
                    const isLowestFrag = m.contextFragmentationScore === lowestFrag;
                    const totalLatency = (m.chunkingLatencyMs + m.indexingLatencyMs + m.retrievalLatencyMs).toFixed(1) + 'ms';
                    const isExpanded = expandedQueryStrategy === m.strategyName;

                    return (
                      <React.Fragment key={m.strategyName}>
                        <tr className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-cyan-400 font-sans">
                            {m.strategyName}
                          </td>
                          <td className="p-3 text-slate-300">{m.totalChunks}</td>
                          <td className="p-3 text-slate-300">{m.averageChunkSize.toFixed(0)}</td>
                          <td className="p-3 text-slate-300">{m.precisionAt1.toFixed(2)}</td>
                          <td className="p-3 text-slate-300">{m.precisionAt3.toFixed(2)}</td>
                          <td className="p-3 text-slate-300">{m.precisionAt5.toFixed(2)}</td>
                          <td className="p-3 text-slate-300">{m.recallAt3.toFixed(2)}</td>
                          <td className={`p-3 font-bold ${isBestMrr ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {m.meanReciprocalRank.toFixed(3)}
                          </td>
                          <td className="p-3 text-slate-300">{(m.hitRate * 100).toFixed(0)}%</td>
                          <td className={`p-3 ${isLowestFrag ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {(m.contextFragmentationScore * 100).toFixed(1)}%
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">{totalLatency}</td>
                          <td className="p-3">
                            <button
                              onClick={() => setExpandedQueryStrategy(isExpanded ? null : m.strategyName)}
                              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-sans"
                            >
                              <span>Queries</span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Query Breakdown Accordion */}
                        {isExpanded && (
                          <tr className="bg-slate-950/90">
                            <td colSpan={12} className="p-4 border-y border-slate-800">
                              <div className="space-y-2 text-xs">
                                <h4 className="font-semibold text-slate-200 font-sans">
                                  Query Level Evaluation: {m.strategyName}
                                </h4>
                                <div className="space-y-2">
                                  {s.queryResults.map(q => (
                                    <div key={q.queryId} className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                                      <div className="flex items-center justify-between text-[11px] mb-1">
                                        <span className="font-bold text-cyan-300 font-sans">
                                          "{q.query}"
                                        </span>
                                        <span className="text-slate-400 font-mono">
                                          First Relevant Rank: <strong className="text-slate-100">{q.firstRelevantRank ?? 'None'}</strong> &bull; MRR: {q.reciprocalRank.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-mono">
                                        Precision@1: {q.precisionAt1.toFixed(2)} | Precision@3: {q.precisionAt3.toFixed(2)} | Recall@3: {q.recallAt3.toFixed(2)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
