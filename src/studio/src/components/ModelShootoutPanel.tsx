import React, { useState } from 'react';
import { Layers, Sparkles, Trophy, Zap, Clock, HardDrive, Target } from 'lucide-react';
import { BenchmarkMetrics } from '../types';

interface ShootoutCandidate {
  rank: number;
  provider: string;
  model: string;
  dimensions: number;
  indexingLatencyMs: number;
  avgQueryLatencyMs: number;
  storageMb: number;
  ingestionCostUsd: number;
  metrics: BenchmarkMetrics;
}

interface ShootoutResult {
  documentId: string;
  totalChunks: number;
  testedProvidersCount: number;
  candidates: ShootoutCandidate[];
  winner: ShootoutCandidate;
  durationMs: number;
}

interface ModelShootoutPanelProps {
  documentText: string;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
}

export const ModelShootoutPanel: React.FC<ModelShootoutPanelProps> = ({
  documentText,
  strategy,
  chunkSize,
  chunkOverlap
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShootoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [includeBM25, setIncludeBM25] = useState(true);
  const [includeMock384, setIncludeMock384] = useState(true);
  const [includeMock768, setIncludeMock768] = useState(true);
  const [includeOpenAI, setIncludeOpenAI] = useState(false);

  const handleRunShootout = async () => {
    setLoading(true);
    setError(null);

    const targets: any[] = [];
    if (includeBM25) targets.push({ provider: 'bm25', dimensions: 0 });
    if (includeMock384) targets.push({ provider: 'mock', dimensions: 384 });
    if (includeMock768) targets.push({ provider: 'mock', dimensions: 768 });
    if (includeOpenAI) targets.push({ provider: 'openai', model: 'text-embedding-3-small', dimensions: 1536 });

    if (targets.length === 0) {
      setError('Please select at least one embedding model to benchmark');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/shootout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          strategy,
          chunkSize,
          chunkOverlap,
          targets
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Shootout execution failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Shootout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Top Banner */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Embedding Model Shootout</h3>
            <p className="text-[11px] text-slate-400">
              Run head-to-head comparison across sparse BM25 and dense embedding models on identical chunks
            </p>
          </div>
        </div>

        <button
          onClick={handleRunShootout}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 transition-all disabled:opacity-50 shadow-md shadow-indigo-500/20"
        >
          {loading ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          <span>Run Model Shootout</span>
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-5 text-xs">
        {/* Model Selection Checkboxes */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Models to Compare:</span>

          <label className="flex items-center gap-2 text-slate-300 font-mono text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeBM25}
              onChange={e => setIncludeBM25(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            <span>BM25 Okapi (Lexical)</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 font-mono text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeMock384}
              onChange={e => setIncludeMock384(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            <span>Mock Deterministic (384-d)</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 font-mono text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeMock768}
              onChange={e => setIncludeMock768(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            <span>Mock High-Dim (768-d)</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 font-mono text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeOpenAI}
              onChange={e => setIncludeOpenAI(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            <span>OpenAI text-embedding-3-small (1536-d)</span>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Winner Banner */}
        {result && (
          <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-800/60 rounded-xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-slate-100 text-sm">
                  Shootout Winner: <span className="text-indigo-400 font-mono">{result.winner.provider}</span> ({result.winner.model})
                </span>
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  MRR: {result.winner.metrics.meanReciprocalRank.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-[11px] bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">DIMENSIONS</span>
                <span className="font-bold text-slate-200">{result.winner.dimensions === 0 ? 'Sparse' : `${result.winner.dimensions} dims`}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">RECALL@3</span>
                <span className="font-bold text-cyan-400">{result.winner.metrics.recallAt3.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">P@1</span>
                <span className="font-bold text-emerald-400">{result.winner.metrics.precisionAt1.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">INDEX LATENCY</span>
                <span className="font-bold text-slate-300">{result.winner.indexingLatencyMs} ms</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">QUERY LATENCY</span>
                <span className="font-bold text-slate-300">{result.winner.avgQueryLatencyMs} ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {result && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">RANK</th>
                  <th className="p-3">PROVIDER / MODEL</th>
                  <th className="p-3">DIMENSIONS</th>
                  <th className="p-3">MRR</th>
                  <th className="p-3">RECALL@3</th>
                  <th className="p-3">P@1</th>
                  <th className="p-3">INDEX LATENCY</th>
                  <th className="p-3">QUERY LATENCY</th>
                  <th className="p-3">EST. STORAGE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {result.candidates.map(c => (
                  <tr key={`${c.provider}-${c.dimensions}`} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      {c.rank === 1 ? (
                        <span className="text-yellow-400 font-bold flex items-center gap-1">★ #1</span>
                      ) : (
                        <span className="text-slate-400">#{c.rank}</span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-200">
                      {c.provider} <span className="text-slate-500 font-normal">({c.model})</span>
                    </td>
                    <td className="p-3 text-slate-300">{c.dimensions === 0 ? 'Sparse' : `${c.dimensions} dims`}</td>
                    <td className="p-3 text-emerald-400 font-bold">{c.metrics.meanReciprocalRank.toFixed(3)}</td>
                    <td className="p-3 text-slate-300">{c.metrics.recallAt3.toFixed(3)}</td>
                    <td className="p-3 text-slate-300">{c.metrics.precisionAt1.toFixed(3)}</td>
                    <td className="p-3 text-slate-400">{c.indexingLatencyMs} ms</td>
                    <td className="p-3 text-cyan-400">{c.avgQueryLatencyMs} ms</td>
                    <td className="p-3 text-slate-300">{c.storageMb} MB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-16 text-slate-500">
            Select the embedding models above and click "Run Model Shootout" to evaluate accuracy and speed tradeoffs side-by-side.
          </div>
        )}
      </div>
    </div>
  );
};
