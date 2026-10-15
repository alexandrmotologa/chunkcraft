import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight, Zap, Target, Sliders, Pin, BookmarkCheck } from 'lucide-react';
import { DocumentChunk } from '../types';

interface QuerySandboxProps {
  documentText: string;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
  onLocateChunk: (chunkId: string) => void;
  onPinGroundTruth?: (query: string, chunk: DocumentChunk) => void;
}

interface SearchResultItem {
  chunk: DocumentChunk;
  score: number;
  rank: number;
  denseRank?: number;
  denseScore?: number;
  bm25Rank?: number;
  bm25Score?: number;
}

export const QuerySandbox: React.FC<QuerySandboxProps> = ({
  documentText,
  strategy,
  chunkSize,
  chunkOverlap,
  onLocateChunk,
  onPinGroundTruth
}) => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'dense' | 'sparse' | 'hybrid'>('hybrid');
  const [provider, setProvider] = useState<'mock' | 'bm25' | 'openai' | 'ollama'>('mock');
  const [fusionMethod, setFusionMethod] = useState<'rrf' | 'linear'>('rrf');
  const [alpha, setAlpha] = useState(0.5);
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinnedChunkIds, setPinnedChunkIds] = useState<string[]>([]);

  const sampleQueries = [
    'What are the Multi-Factor Authentication requirements?',
    'What encryption is enforced for data at rest?',
    'How does Kafka handle dead-letter queues and retries?',
    'How is pgvector HNSW indexing configured?'
  ];

  const handleSearch = async (queryText: string = query) => {
    const q = queryText.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          strategy,
          chunkSize,
          chunkOverlap,
          query: q,
          mode: searchMode,
          provider: searchMode === 'sparse' ? 'bm25' : provider,
          fusionMethod,
          alpha,
          topK
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to execute query');
      }

      const data = await response.json();
      setResults(data.results || []);
      setLatencyMs(data.latencyMs);
    } catch (err: any) {
      setError(err.message || 'Retrieval error');
    } finally {
      setLoading(false);
    }
  };

  const handlePin = (item: SearchResultItem) => {
    setPinnedChunkIds(prev => [...prev, item.chunk.id]);
    if (onPinGroundTruth) {
      onPinGroundTruth(query, item.chunk);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Search Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">Interactive Retrieval Sandbox</span>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
            <button
              onClick={() => setSearchMode('dense')}
              className={`px-2 py-0.5 rounded transition-colors ${
                searchMode === 'dense' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dense
            </button>
            <button
              onClick={() => setSearchMode('sparse')}
              className={`px-2 py-0.5 rounded transition-colors ${
                searchMode === 'sparse' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BM25
            </button>
            <button
              onClick={() => setSearchMode('hybrid')}
              className={`px-2 py-0.5 rounded transition-colors ${
                searchMode === 'hybrid' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hybrid
            </button>
          </div>

          {/* Provider selector */}
          {searchMode !== 'sparse' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Dense Provider:</span>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="mock">Mock Deterministic</option>
                <option value="openai">OpenAI text-embedding-3</option>
                <option value="ollama">Ollama Local (bge-m3)</option>
              </select>
            </div>
          )}
        </div>

        {/* Hybrid controls bar */}
        {searchMode === 'hybrid' && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">FUSION:</span>
              <select
                value={fusionMethod}
                onChange={e => setFusionMethod(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-cyan-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="rrf">RRF (Reciprocal Rank Fusion)</option>
                <option value="linear">Linear Blend (Alpha Normalized)</option>
              </select>
            </div>

            {fusionMethod === 'linear' && (
              <div className="flex items-center gap-2 flex-1 max-w-[280px]">
                <span className="text-slate-400 text-[11px]">WEIGHT (α={alpha}):</span>
                <span className="text-[10px] text-slate-500">BM25</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={alpha}
                  onChange={e => setAlpha(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 bg-slate-800 h-1 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Dense</span>
              </div>
            )}
          </div>
        )}

        {/* Input bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter a natural language search query..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 transition-all disabled:opacity-50 shadow-md shadow-cyan-500/20"
          >
            {loading ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Retrieve</span>
          </button>
        </div>

        {/* Sample query pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 font-mono">TRY:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="text-[11px] bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 px-2.5 py-1 rounded-md transition-colors truncate max-w-[280px]"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="p-4 overflow-y-auto flex-1 space-y-3">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        {latencyMs !== null && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
            <span>Retrieved top {results.length} chunks via {searchMode.toUpperCase()} mode</span>
            <span className="text-cyan-400">{latencyMs} ms retrieval latency</span>
          </div>
        )}

        {results.length === 0 && !loading && !error && (
          <div className="text-center py-16 text-slate-500 text-xs">
            Enter a query above to inspect top-K retrieved chunks and hybrid ranking breakdown.
          </div>
        )}

        {results.map(item => {
          const isPinned = pinnedChunkIds.includes(item.chunk.id);

          return (
            <div
              key={item.chunk.id}
              className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg hover:border-slate-700 transition-all space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-bold flex items-center justify-center text-[10px]">
                    #{item.rank}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">{item.chunk.id}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-slate-500">SCORE:</span>
                    <span className="font-bold text-cyan-400">{item.score.toFixed(4)}</span>
                  </div>

                  {item.denseRank !== undefined && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                      Dense #{item.denseRank}
                    </span>
                  )}
                  {item.bm25Rank !== undefined && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                      BM25 #{item.bm25Rank}
                    </span>
                  )}

                  <button
                    onClick={() => handlePin(item)}
                    disabled={isPinned}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      isPinned
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700'
                    }`}
                    title="Pin this chunk as Ground Truth for this query in Golden Lab"
                  >
                    {isPinned ? <BookmarkCheck className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    <span>{isPinned ? 'Pinned' : 'Pin Ground Truth'}</span>
                  </button>

                  <button
                    onClick={() => onLocateChunk(item.chunk.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {item.chunk.metadata.sectionHeader && (
                <div className="text-[11px] font-medium text-slate-300">
                  {item.chunk.metadata.sectionHeader}
                </div>
              )}

              <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-3">
                {item.chunk.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
