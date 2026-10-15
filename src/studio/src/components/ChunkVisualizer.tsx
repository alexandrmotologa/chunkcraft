import React, { useState } from 'react';
import { DocumentChunk } from '../types';
import { Search, Code2, Tag, Layers, ArrowUpRight } from 'lucide-react';

interface ChunkVisualizerProps {
  chunks: DocumentChunk[];
  targetChunkSize: number;
  selectedChunkId: string | null;
  onSelectChunk: (chunk: DocumentChunk) => void;
}

export const ChunkVisualizer: React.FC<ChunkVisualizerProps> = ({
  chunks,
  targetChunkSize,
  selectedChunkId,
  onSelectChunk
}) => {
  const [filterText, setFilterText] = useState('');
  const [onlyCode, setOnlyCode] = useState(false);

  const filteredChunks = chunks.filter(c => {
    if (onlyCode && !c.metadata.isCodeBlock) return false;
    if (filterText) {
      const matchContent = c.content.toLowerCase().includes(filterText.toLowerCase());
      const matchHeader = c.metadata.sectionHeader?.toLowerCase().includes(filterText.toLowerCase());
      return matchContent || matchHeader;
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Search & Filter Bar */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter chunks..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={() => setOnlyCode(!onlyCode)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
            onlyCode
              ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Filter only code chunks"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code</span>
        </button>
      </div>

      {/* Chunk List Grid */}
      <div className="p-3 overflow-y-auto flex-1 space-y-2.5">
        {filteredChunks.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No chunks match the current filter.
          </div>
        ) : (
          filteredChunks.map(chunk => {
            const isSelected = selectedChunkId === chunk.id;
            const utilization = Math.min(100, Math.round((chunk.tokenCount / targetChunkSize) * 100));

            return (
              <div
                key={chunk.id}
                onClick={() => onSelectChunk(chunk)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-cyan-400">
                      #{String(chunk.index).padStart(2, '0')}
                    </span>
                    {chunk.metadata.isCodeBlock && (
                      <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        <Code2 className="w-2.5 h-2.5 text-amber-400" />
                        Code
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[11px] text-slate-400">
                    <strong className="text-slate-200">{chunk.tokenCount}</strong> tok
                  </span>
                </div>

                {chunk.metadata.sectionHeader && (
                  <div className="text-[11px] text-slate-400 truncate mb-1.5 font-sans flex items-center gap-1">
                    <Tag className="w-3 h-3 text-cyan-500 shrink-0" />
                    <span>{chunk.metadata.sectionHeader}</span>
                  </div>
                )}

                {/* Token utilization bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${
                      utilization > 95
                        ? 'bg-amber-400'
                        : utilization > 60
                        ? 'bg-cyan-400'
                        : 'bg-slate-500'
                    }`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-2 font-mono leading-relaxed">
                  {chunk.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
