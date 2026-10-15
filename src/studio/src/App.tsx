import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentViewer } from './components/DocumentViewer';
import { ChunkVisualizer } from './components/ChunkVisualizer';
import { ChunkDetailDrawer } from './components/ChunkDetailDrawer';
import { QuerySandbox } from './components/QuerySandbox';
import { MetricsComparisonTable } from './components/MetricsComparisonTable';
import { StrategyConfigDrawer } from './components/StrategyConfigDrawer';
import { DocumentModal } from './components/DocumentModal';
import { DocumentChunk, ChunkingStats } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inspector' | 'sandbox' | 'comparison' | 'queries'>('inspector');
  const [documentId, setDocumentId] = useState('enterprise-policy.md');
  const [documentText, setDocumentText] = useState('');
  const [strategy, setStrategy] = useState('recursive-char');
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [preserveCodeBlocks, setPreserveCodeBlocks] = useState(true);
  const [preserveHeaders, setPreserveHeaders] = useState(true);

  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [stats, setStats] = useState<ChunkingStats | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null);
  const [highlightedChunkIds, setHighlightedChunkIds] = useState<string[]>([]);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initial load
  useEffect(() => {
    fetchInitialDoc();
  }, []);

  const fetchInitialDoc = async () => {
    try {
      const res = await fetch('/api/document');
      if (res.ok) {
        const data = await res.json();
        setDocumentId(data.documentId || 'enterprise-policy.md');
        setDocumentText(data.documentText || '');
        runChunking(data.documentText, strategy, chunkSize, chunkOverlap);
        return;
      }
    } catch {
      // Fallback local document
    }

    const fallbackDoc = `# Global Enterprise Security and Data Governance Policy\n\n## 1. Authentication and Identity Management\nAll corporate services mandate Multi-Factor Authentication (MFA) via FIDO2 hardware security keys.\n\n## 2. Cryptographic Controls\nAll data at rest is encrypted via AES-256-GCM. CMEK keys are stored in dedicated HSM clusters.`;
    setDocumentId('enterprise-policy.md');
    setDocumentText(fallbackDoc);
    runChunking(fallbackDoc, strategy, chunkSize, chunkOverlap);
  };

  const runChunking = async (
    text: string = documentText,
    strat: string = strategy,
    size: number = chunkSize,
    overlap: number = chunkOverlap
  ) => {
    if (!text) return;
    setLoading(true);

    try {
      const res = await fetch('/api/chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: text,
          strategy: strat,
          chunkSize: size,
          chunkOverlap: overlap,
          preserveCodeBlocks,
          preserveHeaders
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChunks(data.chunks || []);
        setStats(data.stats || null);
        if (data.chunks && data.chunks.length > 0) {
          setSelectedChunk(data.chunks[0]);
        }
      }
    } catch (err) {
      console.error('Failed to chunk document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (docName: string, text: string) => {
    setDocumentId(docName);
    setDocumentText(text);
    runChunking(text, strategy, chunkSize, chunkOverlap);
  };

  const handleLocateChunkFromSandbox = (chunkId: string) => {
    const target = chunks.find(c => c.id === chunkId);
    if (target) {
      setSelectedChunk(target);
      setHighlightedChunkIds([chunkId]);
      setActiveTab('inspector');
    }
  };

  const handleExport = async (format: 'html' | 'markdown' | 'json') => {
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          chunkSize,
          chunkOverlap,
          provider: 'mock'
        })
      });

      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();

      let content = '';
      let filename = `chunkcraft-${documentId}-benchmark.${format}`;
      let mimeType = 'text/plain';

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
      } else if (format === 'markdown') {
        content = `# ChunkCraft Benchmark: ${documentId}\n\nTotal Chunks: ${chunks.length}\nDate: ${new Date().toISOString()}`;
        mimeType = 'text/markdown';
      } else {
        content = `<!DOCTYPE html><html><head><title>Benchmark</title></head><body><h1>Benchmark Report</h1><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
        mimeType = 'text/html';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Check console for details.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        documentId={documentId}
        totalChunks={chunks.length}
        avgTokens={stats?.averageChunkTokens || 0}
        onOpenDocModal={() => setIsDocModalOpen(true)}
        onToggleConfig={() => setIsConfigOpen(true)}
        onExport={handleExport}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col min-h-0">
        {activeTab === 'inspector' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[720px]">
            {/* Left Column: Full Document Stream with Chunk Highlights */}
            <div className="lg:col-span-7 h-full">
              <DocumentViewer
                documentText={documentText}
                chunks={chunks}
                selectedChunkId={selectedChunk?.id || null}
                onSelectChunk={setSelectedChunk}
                highlightedChunkIds={highlightedChunkIds}
              />
            </div>

            {/* Right Column: Chunk Card Explorer */}
            <div className="lg:col-span-5 h-full">
              <ChunkVisualizer
                chunks={chunks}
                targetChunkSize={chunkSize}
                selectedChunkId={selectedChunk?.id || null}
                onSelectChunk={setSelectedChunk}
              />
            </div>
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[720px]">
            <div className="lg:col-span-6 h-full">
              <DocumentViewer
                documentText={documentText}
                chunks={chunks}
                selectedChunkId={selectedChunk?.id || null}
                onSelectChunk={setSelectedChunk}
                highlightedChunkIds={highlightedChunkIds}
              />
            </div>

            <div className="lg:col-span-6 h-full">
              <QuerySandbox
                documentText={documentText}
                strategy={strategy}
                chunkSize={chunkSize}
                chunkOverlap={chunkOverlap}
                onLocateChunk={handleLocateChunkFromSandbox}
              />
            </div>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="flex-1 min-h-[720px]">
            <MetricsComparisonTable
              documentText={documentText}
              chunkSize={chunkSize}
              chunkOverlap={chunkOverlap}
            />
          </div>
        )}
      </main>

      {/* Drawers and Modals */}
      <ChunkDetailDrawer
        chunk={selectedChunk}
        onClose={() => setSelectedChunk(null)}
      />

      <StrategyConfigDrawer
        strategy={strategy}
        chunkSize={chunkSize}
        chunkOverlap={chunkOverlap}
        preserveCodeBlocks={preserveCodeBlocks}
        preserveHeaders={preserveHeaders}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onStrategyChange={setStrategy}
        onChunkSizeChange={setChunkSize}
        onChunkOverlapChange={setChunkOverlap}
        onToggleCodeBlocks={setPreserveCodeBlocks}
        onToggleHeaders={setPreserveHeaders}
        onApply={() => runChunking(documentText, strategy, chunkSize, chunkOverlap)}
      />

      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onLoadDocument={handleDocumentChange}
      />
    </div>
  );
}
