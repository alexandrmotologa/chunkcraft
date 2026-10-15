import React, { useState, useEffect } from 'react';
import { X, DollarSign, Database, HardDrive, Calculator, CheckCircle2 } from 'lucide-react';

interface CostSizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
}

interface CostEstimateData {
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
  providerEstimates: Array<{
    provider: string;
    model: string;
    dimensions: number;
    ingestionCostUsd: number;
    rawVectorBytes: number;
    hnswIndexBytes: number;
    totalStorageMb: number;
  }>;
}

export const CostSizerModal: React.FC<CostSizerModalProps> = ({
  isOpen,
  onClose,
  documentText,
  strategy,
  chunkSize,
  chunkOverlap
}) => {
  const [data, setData] = useState<CostEstimateData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEstimate();
    }
  }, [isOpen, documentText, strategy, chunkSize, chunkOverlap]);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          strategy,
          chunkSize,
          chunkOverlap
        })
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to calculate cost and sizing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Cost & Vector DB Storage Sizer</h3>
              <p className="text-[11px] text-slate-400">Predict financial ingestion costs and HNSW RAM footprints before deployment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {loading || !data ? (
            <div className="py-16 text-center text-slate-500">
              Calculating vector DB footprint and token ingestion costs...
            </div>
          ) : (
            <>
              {/* Summary stats banner */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Total Document Chunks</span>
                  <span className="text-base font-bold text-slate-100">{data.totalChunks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Total Estimated Tokens</span>
                  <span className="text-base font-bold text-cyan-400">{data.totalTokens.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Avg Tokens Per Chunk</span>
                  <span className="text-base font-bold text-emerald-400">{data.avgTokensPerChunk}</span>
                </div>
              </div>

              {/* Providers Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">PROVIDER & MODEL</th>
                      <th className="p-3">DIMENSIONS</th>
                      <th className="p-3">INGESTION COST</th>
                      <th className="p-3">RAW VECTORS</th>
                      <th className="p-3">HNSW RAM OVERHEAD</th>
                      <th className="p-3">TOTAL STORAGE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {data.providerEstimates.map(p => (
                      <tr key={p.provider} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <span className="font-semibold text-slate-200 block">{p.provider}</span>
                          <span className="text-[10px] text-slate-500">{p.model}</span>
                        </td>
                        <td className="p-3 text-slate-300">{p.dimensions} dims</td>
                        <td className="p-3">
                          {p.ingestionCostUsd === 0 ? (
                            <span className="text-emerald-400 font-bold">$0.00 (Self-hosted)</span>
                          ) : (
                            <span className="text-cyan-300 font-bold">${p.ingestionCostUsd.toFixed(5)}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">{(p.rawVectorBytes / 1024).toFixed(1)} KB</td>
                        <td className="p-3 text-slate-400">{(p.hnswIndexBytes / 1024).toFixed(1)} KB</td>
                        <td className="p-3 font-bold text-slate-100">{p.totalStorageMb} MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-400 text-[11px] leading-relaxed">
                <span className="text-cyan-400 font-bold mr-1">Engineering Note:</span>
                Raw vectors are computed as <code className="text-slate-300">Float32 (4 bytes / dim)</code>. HNSW index graph overhead assumes standard M=16, efConstruction=64 (~25% index overhead). Metadata overhead allocates 400 bytes per chunk record.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
