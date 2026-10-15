import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, RefreshCw, Download, Sparkles, Tag, HelpCircle } from 'lucide-react';
import { GoldenQuery } from '../types';

interface GoldenQueryLabProps {
  documentText: string;
  goldenQueries: GoldenQuery[];
  onUpdateQueries: (queries: GoldenQuery[]) => void;
}

export const GoldenQueryLab: React.FC<GoldenQueryLabProps> = ({
  documentText,
  goldenQueries,
  onUpdateQueries
}) => {
  const [newQueryText, setNewQueryText] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddQuery = () => {
    if (!newQueryText.trim()) return;

    const keywords = newKeywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const newQuery: GoldenQuery = {
      id: `custom_${Date.now()}`,
      query: newQueryText.trim(),
      relevantKeywords: keywords
    };

    onUpdateQueries([...goldenQueries, newQuery]);
    setNewQueryText('');
    setNewKeywords('');
  };

  const handleRemoveQuery = (id: string) => {
    onUpdateQueries(goldenQueries.filter(q => q.id !== id));
  };

  const handleSynthesizeQueries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText, count: 5 })
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateQueries(data.queries || []);
      }
    } catch (err) {
      console.error('Failed to synthesize queries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(goldenQueries, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chunkcraft-golden-queries.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Top Banner */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Golden Query Lab & Ground Truth</h3>
            <p className="text-[11px] text-slate-400">
              Manage evaluation query pairs and keyword ground-truth vectors used for MRR, Precision, and Recall scoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSynthesizeQueries}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-synthesize from Document</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={goldenQueries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
        {/* Add custom query form */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <span className="font-mono text-[11px] text-slate-400 uppercase block">Add Ground Truth Query</span>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-7">
              <input
                type="text"
                placeholder="Enter evaluation query (e.g. What is the MFA policy?)..."
                value={newQueryText}
                onChange={e => setNewQueryText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddQuery()}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="md:col-span-3">
              <input
                type="text"
                placeholder="Keywords (e.g. mfa, fido2, key)..."
                value={newKeywords}
                onChange={e => setNewKeywords(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddQuery()}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <button
                onClick={handleAddQuery}
                disabled={!newQueryText.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Query List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] px-1">
            <span>ACTIVE GOLDEN QUERIES ({goldenQueries.length})</span>
            <span>Ground Truth Matches</span>
          </div>

          {goldenQueries.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              No golden queries found. Click "Re-synthesize from Document" or add queries manually above.
            </div>
          ) : (
            goldenQueries.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200 text-xs">{q.query}</span>
                  </div>

                  {q.relevantKeywords && q.relevantKeywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pl-7">
                      <Tag className="w-3 h-3 text-cyan-500" />
                      {q.relevantKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleRemoveQuery(q.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition-colors"
                  title="Remove query"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
