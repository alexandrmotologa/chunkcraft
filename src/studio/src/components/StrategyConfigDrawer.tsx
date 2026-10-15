import React from 'react';
import { Sliders, RefreshCw, X, FileCode, Heading } from 'lucide-react';

interface StrategyConfigDrawerProps {
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
  preserveCodeBlocks: boolean;
  preserveHeaders: boolean;
  isOpen: boolean;
  onClose: () => void;
  onStrategyChange: (strategy: string) => void;
  onChunkSizeChange: (size: number) => void;
  onChunkOverlapChange: (overlap: number) => void;
  onToggleCodeBlocks: (val: boolean) => void;
  onToggleHeaders: (val: boolean) => void;
  onApply: () => void;
}

export const StrategyConfigDrawer: React.FC<StrategyConfigDrawerProps> = ({
  strategy,
  chunkSize,
  chunkOverlap,
  preserveCodeBlocks,
  preserveHeaders,
  isOpen,
  onClose,
  onStrategyChange,
  onChunkSizeChange,
  onChunkOverlapChange,
  onToggleCodeBlocks,
  onToggleHeaders,
  onApply
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm">Chunking Parameters</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 overflow-y-auto flex-1 space-y-5 text-xs">
        {/* Strategy selector */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-mono text-[11px] block">CHUNKING STRATEGY</label>
          <select
            value={strategy}
            onChange={e => onStrategyChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
          >
            <option value="recursive-char">Recursive Character (Delimiter Tree)</option>
            <option value="markdown-ast">Markdown AST (Section-Aware)</option>
            <option value="semantic-boundary">Semantic Boundary (Sentence-Aware)</option>
            <option value="token-window">Token Sliding Window (Exact Budget)</option>
            <option value="hierarchical">Hierarchical (Parent-Child Retrieval)</option>
            <option value="code-aware">Code-Aware (Symbol & AST Boundaries)</option>
            <option value="json-keypath">JSON Key-Path (Structural RFC8259)</option>
          </select>
        </div>

        {/* Chunk Size Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono">
            <label className="text-slate-400 text-[11px]">CHUNK SIZE (TOKENS)</label>
            <span className="text-cyan-400 font-bold">{chunkSize}</span>
          </div>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={chunkSize}
            onChange={e => onChunkSizeChange(Number(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>100</span>
            <span>500</span>
            <span>1000</span>
            <span>2000</span>
          </div>
        </div>

        {/* Chunk Overlap Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono">
            <label className="text-slate-400 text-[11px]">CHUNK OVERLAP (TOKENS)</label>
            <span className="text-cyan-400 font-bold">{chunkOverlap}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.floor(chunkSize * 0.5)}
            step={10}
            value={chunkOverlap}
            onChange={e => onChunkOverlapChange(Number(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0</span>
            <span>{Math.floor(chunkSize * 0.25)}</span>
            <span>{Math.floor(chunkSize * 0.5)}</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={preserveCodeBlocks}
              onChange={e => onToggleCodeBlocks(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            <FileCode className="w-3.5 h-3.5 text-cyan-500" />
            <span>Preserve Code Blocks Intact</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={preserveHeaders}
              onChange={e => onToggleHeaders(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            <Heading className="w-3.5 h-3.5 text-cyan-500" />
            <span>Preserve Header Hierarchies</span>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800">
        <button
          onClick={() => {
            onApply();
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 transition-all shadow-md shadow-cyan-500/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Apply and Re-Chunk</span>
        </button>
      </div>
    </div>
  );
};
