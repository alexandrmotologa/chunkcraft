import React from 'react';
import { Layers, Search, BarChart3, FileText, Download, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  activeTab: 'inspector' | 'sandbox' | 'comparison' | 'queries';
  onTabChange: (tab: 'inspector' | 'sandbox' | 'comparison' | 'queries') => void;
  documentId: string;
  totalChunks: number;
  avgTokens: number;
  onOpenDocModal: () => void;
  onToggleConfig: () => void;
  onExport: (format: 'html' | 'markdown' | 'json') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  documentId,
  totalChunks,
  avgTokens,
  onOpenDocModal,
  onToggleConfig,
  onExport
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Document Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-mono font-bold text-cyan-400 text-sm">
              CC
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-100 text-base leading-none tracking-tight">ChunkCraft</h1>
              <span className="text-[11px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                Studio
              </span>
            </div>
            <button
              onClick={onOpenDocModal}
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 mt-0.5 text-left"
            >
              <FileText className="w-3 h-3 text-cyan-500" />
              <span className="font-mono text-slate-300 truncate max-w-[200px]">{documentId}</span>
              <span className="text-[10px] text-slate-500 underline">Change</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => onTabChange('inspector')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'inspector'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Chunk Inspector</span>
            <span className="ml-1 text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
              {totalChunks}
            </span>
          </button>

          <button
            onClick={() => onTabChange('sandbox')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'sandbox'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Retrieval Sandbox</span>
          </button>

          <button
            onClick={() => onTabChange('comparison')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'comparison'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Comparison Matrix</span>
          </button>
        </nav>

        {/* Quick Stats & Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg font-mono text-slate-400">
            <div>
              <span className="text-slate-500 text-[10px] block">AVG TOKENS</span>
              <span className="text-slate-200 font-semibold">{avgTokens.toFixed(0)}</span>
            </div>
            <div className="w-px h-5 bg-slate-800" />
            <div>
              <span className="text-slate-500 text-[10px] block">CHUNKS</span>
              <span className="text-cyan-400 font-semibold">{totalChunks}</span>
            </div>
          </div>

          <button
            onClick={onToggleConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parameters</span>
          </button>

          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-40 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 hidden group-hover:block z-50">
              <button
                onClick={() => onExport('html')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-400"
              >
                HTML Benchmark Report
              </button>
              <button
                onClick={() => onExport('markdown')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-400"
              >
                Markdown Summary
              </button>
              <button
                onClick={() => onExport('json')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-400"
              >
                Raw JSON Benchmark
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
