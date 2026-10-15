import React, { useState } from 'react';
import { Sliders, Sparkles, CheckCircle, ArrowRight, Zap, Trophy, BarChart2 } from 'lucide-react';
import { BenchmarkMetrics } from '../types';

interface TuningCandidate {
  rank: number;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
  fitnessScore: number;
  metrics: BenchmarkMetrics;
}

interface TuningResult {
  documentId: string;
  evaluatedConfigurationsCount: number;
  bestCandidate: TuningCandidate;
  candidates: TuningCandidate[];
  durationMs: number;
}

interface AutoTunerPanelProps {
  documentText: string;
  onApplyConfig: (strategy: string, size: number, overlap: number) => void;
}

export const AutoTunerPanel: React.FC<AutoTunerPanelProps> = ({
  documentText,
  onApplyConfig
}) => {
  const [selectedSizes, setSelectedSizes] = useState<number[]>([200, 400, 800]);
  const [selectedOverlaps, setSelectedOverlaps] = useState<number[]>([0, 50, 100]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([
    'recursive-char',
    'markdown-ast',
    'semantic-boundary'
  ]);
  const [provider, setProvider] = useState('mock');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TuningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableSizes = [150, 250, 400, 600, 800, 1200];
  const availableOverlaps = [0, 25, 50, 100];
  const availableStrategies = [
    'recursive-char',
    'markdown-ast',
    'semantic-boundary',
    'token-window',
    'hierarchical',
    'code-aware',
    'json-keypath'
  ];

  const toggleSize = (size: number) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleOverlap = (overlap: number) => {
    setSelectedOverlaps(prev =>
      prev.includes(overlap) ? prev.filter(o => o !== overlap) : [...prev, overlap]
    );
  };

  const toggleStrategy = (strat: string) => {
    setSelectedStrategies(prev =>
      prev.includes(strat) ? prev.filter(s => s !== strat) : [...prev, strat]
    );
  };

  const handleRunTuning = async () => {
    if (selectedSizes.length === 0 || selectedStrategies.length === 0) {
      setError('Please select at least one chunk size and one chunking strategy');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          chunkSizes: selectedSizes,
          chunkOverlaps: selectedOverlaps,
          strategies: selectedStrategies,
          provider
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to run auto-tuner');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Auto-tuning failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Top Banner */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Pareto Auto-Tuner & Grid Search</h3>
            <p className="text-[11px] text-slate-400">
              Automated hyper-parameter optimization maximizing MRR, Recall@3, and context non-fragmentation
            </p>
          </div>
        </div>

        <button
          onClick={handleRunTuning}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 transition-all disabled:opacity-50 shadow-md shadow-cyan-500/20"
        >
          {loading ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          <span>Run Parameter Tuning</span>
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-5 text-xs">
        {/* Controls grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
          {/* Target Sizes */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-slate-400 block uppercase">Candidate Sizes (Tokens)</span>
            <div className="flex flex-wrap gap-1.5">
              {availableSizes.map(size => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] border transition-colors ${
                    selectedSizes.includes(size)
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Overlaps */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-slate-400 block uppercase">Candidate Overlaps</span>
            <div className="flex flex-wrap gap-1.5">
              {availableOverlaps.map(overlap => (
                <button
                  key={overlap}
                  onClick={() => toggleOverlap(overlap)}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] border transition-colors ${
                    selectedOverlaps.includes(overlap)
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {overlap}
                </button>
              ))}
            </div>
          </div>

          {/* Strategies */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-slate-400 block uppercase">Strategies</span>
            <div className="flex flex-wrap gap-1.5">
              {availableStrategies.map(strat => (
                <button
                  key={strat}
                  onClick={() => toggleStrategy(strat)}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] border transition-colors ${
                    selectedStrategies.includes(strat)
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {strat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Recommended Pareto Card */}
        {result && (
          <div className="p-4 bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-800/60 rounded-xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-slate-100 text-sm">
                  Optimal Pareto Configuration: <span className="text-cyan-400 font-mono">{result.bestCandidate.strategy}</span>
                </span>
                <span className="bg-yellow-950 text-yellow-300 border border-yellow-800/80 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  FITNESS: {result.bestCandidate.fitnessScore}
                </span>
              </div>

              <button
                onClick={() =>
                  onApplyConfig(
                    result.bestCandidate.strategy,
                    result.bestCandidate.chunkSize,
                    result.bestCandidate.chunkOverlap
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold text-xs transition-colors"
              >
                <span>Apply to Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-[11px] bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">CHUNK SIZE</span>
                <span className="font-bold text-slate-200">{result.bestCandidate.chunkSize} tokens</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">OVERLAP</span>
                <span className="font-bold text-slate-200">{result.bestCandidate.chunkOverlap} tokens</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">MRR</span>
                <span className="font-bold text-emerald-400">{result.bestCandidate.metrics.meanReciprocalRank.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">RECALL@3</span>
                <span className="font-bold text-cyan-400">{result.bestCandidate.metrics.recallAt3.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TOTAL CHUNKS</span>
                <span className="font-bold text-slate-300">{result.bestCandidate.metrics.totalChunks}</span>
              </div>
            </div>
          </div>
        )}

        {/* Candidates Table */}
        {result && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">RANK</th>
                  <th className="p-3">STRATEGY</th>
                  <th className="p-3">CHUNK SIZE</th>
                  <th className="p-3">OVERLAP</th>
                  <th className="p-3">FITNESS</th>
                  <th className="p-3">MRR</th>
                  <th className="p-3">RECALL@3</th>
                  <th className="p-3">P@1</th>
                  <th className="p-3">CHUNKS</th>
                  <th className="p-3">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {result.candidates.map(c => (
                  <tr key={`${c.strategy}-${c.chunkSize}-${c.chunkOverlap}`} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      {c.rank === 1 ? (
                        <span className="text-yellow-400 font-bold flex items-center gap-1">★ #1</span>
                      ) : (
                        <span className="text-slate-400">#{c.rank}</span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-200">{c.strategy}</td>
                    <td className="p-3 text-slate-300">{c.chunkSize}</td>
                    <td className="p-3 text-slate-300">{c.chunkOverlap}</td>
                    <td className="p-3 font-bold text-cyan-300">{c.fitnessScore.toFixed(4)}</td>
                    <td className="p-3 text-emerald-400">{c.metrics.meanReciprocalRank.toFixed(3)}</td>
                    <td className="p-3 text-slate-300">{c.metrics.recallAt3.toFixed(3)}</td>
                    <td className="p-3 text-slate-300">{c.metrics.precisionAt1.toFixed(3)}</td>
                    <td className="p-3 text-slate-400">{c.metrics.totalChunks}</td>
                    <td className="p-3">
                      <button
                        onClick={() => onApplyConfig(c.strategy, c.chunkSize, c.chunkOverlap)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-sans"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-16 text-slate-500">
            Select candidate parameter intervals above and click "Run Parameter Tuning" to find the optimal chunking configuration for your document.
          </div>
        )}
      </div>
    </div>
  );
};
