import React, { useEffect, useRef } from 'react';
import { DocumentChunk } from '../types';
import { Eye, Hash, CornerDownRight } from 'lucide-react';

interface DocumentViewerProps {
  documentText: string;
  chunks: DocumentChunk[];
  selectedChunkId: string | null;
  onSelectChunk: (chunk: DocumentChunk) => void;
  highlightedChunkIds?: string[];
}

const CHUNK_THEMES = [
  { border: 'border-cyan-500/50', bg: 'bg-cyan-950/25', badge: 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50' },
  { border: 'border-emerald-500/50', bg: 'bg-emerald-950/25', badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50' },
  { border: 'border-purple-500/50', bg: 'bg-purple-950/25', badge: 'bg-purple-900/60 text-purple-300 border-purple-700/50' },
  { border: 'border-amber-500/50', bg: 'bg-amber-950/25', badge: 'bg-amber-900/60 text-amber-300 border-amber-700/50' },
  { border: 'border-rose-500/50', bg: 'bg-rose-950/25', badge: 'bg-rose-900/60 text-rose-300 border-rose-700/50' },
  { border: 'border-blue-500/50', bg: 'bg-blue-950/25', badge: 'bg-blue-900/60 text-blue-300 border-blue-700/50' }
];

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentText,
  chunks,
  selectedChunkId,
  onSelectChunk,
  highlightedChunkIds = []
}) => {
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedChunkId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">Segmented Document Stream</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>{documentText.length.toLocaleString()} chars</span>
          <span>&bull;</span>
          <span>{chunks.length} chunks generated</span>
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-3 font-mono text-xs leading-relaxed">
        {chunks.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No chunks generated yet. Check strategy configuration.
          </div>
        ) : (
          chunks.map((chunk, idx) => {
            const theme = CHUNK_THEMES[idx % CHUNK_THEMES.length];
            const isSelected = selectedChunkId === chunk.id;
            const isSearchResult = highlightedChunkIds.includes(chunk.id);

            return (
              <div
                key={chunk.id}
                ref={isSelected ? activeRef : null}
                onClick={() => onSelectChunk(chunk)}
                className={`relative group rounded-lg border transition-all cursor-pointer p-3.5 ${
                  theme.border
                } ${theme.bg} ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 bg-cyan-950/40 shadow-lg'
                    : isSearchResult
                    ? 'ring-1 ring-amber-400/80 bg-amber-950/30'
                    : 'hover:border-slate-600'
                }`}
              >
                {/* Chunk Header Bar */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/60 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded font-bold border ${theme.badge}`}>
                      #{String(chunk.index).padStart(2, '0')}
                    </span>
                    {chunk.metadata.level && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {chunk.metadata.level}
                      </span>
                    )}
                    {chunk.metadata.sectionHeader && (
                      <span className="text-slate-400 font-sans truncate max-w-[220px]" title={chunk.metadata.sectionHeader}>
                        {chunk.metadata.sectionHeader}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                    <span className="text-slate-300 font-semibold">{chunk.tokenCount} tokens</span>
                    <span>&bull;</span>
                    <span>chars [{chunk.startIndex}-{chunk.endIndex}]</span>
                  </div>
                </div>

                {/* Chunk Content */}
                <div className="text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-5">
                  {chunk.content}
                </div>

                {/* Overlap Marker if contiguous chunk overlaps */}
                {idx < chunks.length - 1 && chunks[idx + 1].startIndex < chunk.endIndex && (
                  <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-800/80 flex items-center gap-1.5 text-[10px] text-cyan-400/80">
                    <CornerDownRight className="w-3 h-3" />
                    <span>
                      Shares {chunk.endIndex - chunks[idx + 1].startIndex} characters with chunk #{idx + 1}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
