import React, { useState } from 'react';
import { X, Upload, FileText, Check } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDocument: (docId: string, text: string) => void;
}

const SAMPLE_DOCS = [
  {
    id: 'enterprise-policy.md',
    title: 'Enterprise Security & Governance Policy',
    desc: 'MFA, password complexity, encryption at rest, WORM locks, and incident SLAs.',
    snippet: '# Global Enterprise Security and Data Governance Policy\n\n## 1. Authentication and Identity Management\nAll corporate services and cloud environments mandate Multi-Factor Authentication (MFA)...'
  },
  {
    id: 'cloud-architecture.md',
    title: 'Scalable Cloud Architecture',
    desc: 'Kafka message streaming, PostgreSQL pgvector HNSW indexing, and Valkey caching.',
    snippet: '# Scalable Event-Driven Cloud Platform Architecture\n\n## 1. Event Ingestion and Message Streaming\nThe platform ingests high-throughput telemetry using Apache Kafka...'
  }
];

export const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, onLoadDocument }) => {
  const [customText, setCustomText] = useState('');
  const [customTitle, setCustomTitle] = useState('custom-document.md');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onLoadDocument(file.name, content);
        onClose();
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = async (sampleId: string) => {
    try {
      const res = await fetch('/api/samples');
      if (res.ok) {
        const data = await res.json();
        const found = data.samples?.find((s: any) => s.id === sampleId);
        if (found) {
          onLoadDocument(found.id, found.text);
          onClose();
          return;
        }
      }
    } catch {
      // fallback
    }
    const sample = SAMPLE_DOCS.find(s => s.id === sampleId);
    if (sample) {
      onLoadDocument(sample.id, sample.snippet);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Select Document Source</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Sample Documents */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              PRE-CONFIGURED BENCHMARK DOCUMENTS
            </label>
            <div className="space-y-2">
              {SAMPLE_DOCS.map(sample => (
                <div
                  key={sample.id}
                  onClick={() => handleLoadSample(sample.id)}
                  className="p-3 bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-3 group"
                >
                  <div>
                    <h4 className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {sample.title}
                    </h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">{sample.desc}</p>
                    <span className="font-mono text-[10px] text-slate-500 mt-1 block">{sample.id}</span>
                  </div>
                  <button className="px-2.5 py-1 bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-300 rounded text-[11px] font-semibold transition-all shrink-0">
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-500">OR UPLOAD FILE</span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Upload input */}
          <label className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
            <Upload className="w-5 h-5 text-cyan-400 mb-1.5" />
            <span className="text-slate-200 font-medium">Click to select Markdown or Text file</span>
            <span className="text-slate-500 text-[11px] mt-0.5">.md, .txt, .json, .py, .ts</span>
            <input
              type="file"
              accept=".md,.txt,.json,.py,.ts,.js,.yaml"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Paste Raw Text */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              OR PASTE RAW MARKDOWN
            </label>
            <input
              type="text"
              placeholder="document-name.md"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
            />
            <textarea
              placeholder="Paste document markdown content here..."
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none leading-relaxed"
            />
            <button
              onClick={() => {
                if (customText.trim()) {
                  onLoadDocument(customTitle, customText);
                  onClose();
                }
              }}
              disabled={!customText.trim()}
              className="w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50"
            >
              Load Custom Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
