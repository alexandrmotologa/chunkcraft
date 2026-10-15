import React from 'react';
import {
  Layers,
  Search,
  BarChart3,
  FileText,
  Download,
  SlidersHorizontal,
  Sliders,
  Target,
  Database,
  Calculator
} from 'lucide-react';

export type StudioTab = 'inspector' | 'sandbox' | 'tuning' | 'shootout' | 'queries' | 'comparison';

interface HeaderProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  documentId: string;
  totalChunks: number;
  avgTokens: number;
  onOpenDocModal: () => void;
  onToggleConfig: () => void;
  onOpenCostSizer: () => void;
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
  onOpenCostSizer,
  onExport
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 md:gap-4">
        {/* Brand & Document Name (Mobile Top Row) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-600 p-0.5 shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-mono font-bold text-cyan-400 text-xs">
                CC
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-100 text-sm leading-none tracking-tight">ChunkCraft</h1>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1 py-0.2 rounded">
                  Studio
                </span>
              </div>
              <button
                onClick={onOpenDocModal}
                className="text-[11px] text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 mt-0.5 text-left"
              >
                <FileText className="w-2.5 h-2.5 text-cyan-500 flex-shrink-0" />
                <span className="font-mono text-slate-300 truncate max-w-[120px] sm:max-w-[140px]">{documentId}</span>
                <span className="text-[9px] text-slate-500 underline flex-shrink-0">Change</span>
              </button>
            </div>
          </div>

          {/* Quick Controls on Mobile */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={onOpenCostSizer}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
              title="Calculate API token ingestion cost and vector DB memory footprint"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="text-[11px]">Sizer</span>
            </button>
            <button
              onClick={onToggleConfig}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px]">Params</span>
            </button>
            <div className="relative group">
              <button className="flex items-center p-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors">
                <Download className="w-3.5 h-3.5" />
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

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full scrollbar-none flex-shrink">
          <button
            onClick={() => onTabChange('inspector')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'inspector'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Inspector</span>
            <span className="ml-0.5 text-[9px] font-mono bg-slate-900 px-1 py-0.2 rounded text-slate-400 border border-slate-700">
              {totalChunks}
            </span>
          </button>

          <button
            onClick={() => onTabChange('sandbox')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'sandbox'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Sandbox</span>
          </button>

          <button
            onClick={() => onTabChange('tuning')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'tuning'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Auto-Tuning</span>
          </button>

          <button
            onClick={() => onTabChange('shootout')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'shootout'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Shootout</span>
          </button>

          <button
            onClick={() => onTabChange('queries')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'queries'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Golden Lab</span>
          </button>

          <button
            onClick={() => onTabChange('comparison')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'comparison'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Matrix</span>
          </button>
        </nav>

        {/* Quick Stats & Controls (Desktop) */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenCostSizer}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
            title="Calculate API token ingestion cost and vector DB memory footprint"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Cost Sizer</span>
          </button>

          <button
            onClick={onToggleConfig}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Params</span>
          </button>

          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors">
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
