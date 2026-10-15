import React, { useState } from 'react';
import { DocumentChunk } from '../types';
import { X, Copy, Check, Hash, Tag, Layers, FileCode2 } from 'lucide-react';

interface ChunkDetailDrawerProps {
  chunk: DocumentChunk | null;
  onClose: () => void;
}

export const ChunkDetailDrawer: React.FC<ChunkDetailDrawerProps> = ({ chunk, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!chunk) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col">
      {/* Drawer Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-cyan-400 text-sm">
            #{String(chunk.index).padStart(2, '0')}
          </span>
          <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
            {chunk.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
            title="Copy chunk text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">TOKENS</span>
            <span className="font-mono font-semibold text-slate-200 text-sm">{chunk.tokenCount}</span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">CHAR OFFSETS</span>
            <span className="font-mono font-semibold text-slate-200 text-xs">
              [{chunk.startIndex} - {chunk.endIndex}]
            </span>
          </div>
        </div>

        {/* Section Context & Breadcrumbs */}
        {chunk.metadata.sectionHeader && (
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 font-mono block mb-1">SECTION HEADER</span>
            <div className="text-cyan-300 font-medium">{chunk.metadata.sectionHeader}</div>
            {chunk.metadata.headerHierarchy && chunk.metadata.headerHierarchy.length > 1 && (
              <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap items-center gap-1">
                {chunk.metadata.headerHierarchy.map((h, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-600">&gt;</span>}
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{h}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hierarchical Parent/Child link if present */}
        {chunk.parentId && (
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 font-mono block mb-1">PARENT CHUNK ID</span>
            <span className="font-mono text-cyan-400 text-[11px]">{chunk.parentId}</span>
          </div>
        )}

        {/* Full Chunk Text */}
        <div>
          <span className="text-[10px] text-slate-500 font-mono block mb-1">CHUNK CONTENT</span>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto">
            {chunk.content}
          </div>
        </div>
      </div>
    </div>
  );
};
