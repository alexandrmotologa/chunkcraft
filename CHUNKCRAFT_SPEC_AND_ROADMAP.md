# ChunkCraft: Technical Specification and Implementation Roadmap

> Production RAG Chunking, Embedding Evaluation, and Retrieval Benchmark Studio

---

## 1. Problem Space and Core Objectives

Retrieval-Augmented Generation (RAG) pipelines fail predominantly at the ingestion stage rather than during generation:

1. **Destructive Chunk Boundaries:** Naive token or character slicing splits code blocks, tables, sentences, and Markdown sections, causing context fragmentation and hallucinated agent answers.
2. **Untested Embedding Trade-offs:** Development teams select embedding models without benchmarking domain retrieval precision, latency, or memory footprints.
3. **Absence of Quantitative Benchmarks:** Chunk sizes and overlaps are frequently chosen by guesswork instead of empirical metrics such as Precision@K, Recall@K, Mean Reciprocal Rank (MRR), and Context Fragmentation.
4. **Opaque Vector Retrieval:** Debugging why a document section scored poorly requires inspecting raw floating-point arrays and executing manual cosine similarity calculations.

ChunkCraft provides a TypeScript command-line interface and an embedded React 19 Web Studio that makes document chunking and vector retrieval measurable and visual.

---

## 2. System Architecture

```
+-------------------------------------------------------------------------+
|                         ChunkCraft Architecture                         |
+-------------------------------------------------------------------------+

  [ CLI Interface: npx chunkcraft ]      [ Embedded React 19 Web Studio ]
                   |                                     |
                   +------------------+------------------+
                                      |
                                      v
+-------------------------------------------------------------------------+
|                      ChunkCraft Core Runtime Engine                     |
+-------------------------------------------------------------------------+
| Document Ingestion & Parsers                                            |
|   - Plaintext and Markdown Parser (remark-parse / unist AST)            |
|   - Structural Metadata and Breadcrumb Extraction                       |
+-------------------------------------------------------------------------+
| Chunking Strategy Pipeline                                              |
|   - Recursive Character Chunker (separator hierarchy)                   |
|   - Markdown AST Chunker (preserves H1 > H2 > H3 context)              |
|   - Semantic Boundary Chunker (sentence boundary heuristics)            |
|   - Token Sliding Window Chunker (exact token budget allocation)        |
|   - Hierarchical Parent-Child Chunker (macro context / micro search)    |
|   - Code Block Aware Chunker (syntax and indentation preservation)      |
+-------------------------------------------------------------------------+
| Embedding Adapters & Vector Engine                                      |
|   - Deterministic Pseudo-Vector Provider (zero-cost offline testing)    |
|   - Okapi BM25 Sparse Vector Provider (lexical ranking baseline)        |
|   - OpenAI Provider (text-embedding-3-small, text-embedding-3-large)   |
|   - Voyage AI Provider (voyage-3, voyage-code-3)                        |
|   - Ollama / Local Provider (bge-m3, nomic-embed-text)                  |
|   - In-Memory Vector Store with Cosine Similarity and Dot Product       |
+-------------------------------------------------------------------------+
| Evaluation & Benchmark Suite                                            |
|   - Precision@1, Precision@3, Precision@5, Recall@3, Recall@5           |
|   - Mean Reciprocal Rank (MRR) and Hit Rate                             |
|   - Context Fragmentation Score and Boundary Loss Index                 |
|   - Synthetic Golden Query Generator                                    |
|   - Exporters: Terminal Table, Markdown, JSON, Standalone HTML Report   |
+-------------------------------------------------------------------------+
| Local Web Studio Server                                                 |
|   - REST API Endpoints (/api/chunk, /api/benchmark, /api/query)         |
|   - Static Bundle Host for React 19 Studio                              |
+-------------------------------------------------------------------------+
```

---

## 3. Directory Layout

```
chunkcraft/
├── bin/
│   └── chunkcraft.js               # CLI executable entry point
├── src/
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── benchmark.ts        # chunkcraft benchmark <file> --eval <queries.json>
│   │   │   ├── chunk.ts            # chunkcraft chunk <file> --strategy <name>
│   │   │   ├── generate-queries.ts # chunkcraft generate-queries <file>
│   │   │   └── studio.ts           # chunkcraft studio <file> (Launches embedded UI)
│   │   └── index.ts                # Commander program setup
│   ├── core/
│   │   ├── chunkers/
│   │   │   ├── base.ts             # BaseChunker interface and options
│   │   │   ├── code-aware.ts       # Code syntax and indentation chunker
│   │   │   ├── hierarchical.ts     # Parent-child macro/micro chunker
│   │   │   ├── markdown-ast.ts     # Markdown header hierarchy chunker
│   │   │   ├── recursive-char.ts   # Recursive delimiter chunker
│   │   │   ├── semantic-boundary.ts# Sentence boundary chunker
│   │   │   └── token-window.ts     # Token sliding window chunker
│   │   ├── embeddings/
│   │   │   ├── base.ts             # EmbeddingProvider interface
│   │   │   ├── bm25-provider.ts    # Okapi BM25 lexical sparse vector provider
│   │   │   ├── mock-provider.ts    # Deterministic pseudo-vector generator
│   │   │   ├── ollama-provider.ts  # Local Ollama REST client
│   │   │   ├── openai-provider.ts  # OpenAI REST client
│   │   │   └── voyage-provider.ts  # Voyage AI REST client
│   │   ├── evaluation/
│   │   │   ├── golden-query-gen.ts # Synthetic test query generator
│   │   │   ├── metrics.ts          # Precision, Recall, MRR, Fragmentation
│   │   │   ├── report-exporter.ts  # Markdown, JSON, HTML exporters
│   │   │   └── test-runner.ts      # Multi-strategy benchmark runner
│   │   ├── storage/
│   │   │   ├── vector-math.ts      # Cosine similarity and dot product
│   │   │   └── vector-store.ts     # In-memory top-K vector search
│   │   └── tokenizer/
│   │       └── token-counter.ts    # Fast BPE estimation and tiktoken support
│   ├── server/
│   │   ├── api-router.ts           # REST endpoints for embedded Studio
│   │   └── local-server.ts         # Lightweight Node HTTP server
│   └── studio/                     # React 19 Frontend Web Studio
│       ├── index.html
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── ChunkDetailDrawer.tsx
│       │   │   ├── ChunkVisualizer.tsx
│       │   │   ├── DocumentViewer.tsx
│       │   │   ├── MetricsComparisonTable.tsx
│       │   │   ├── QuerySandbox.tsx
│       │   │   └── StrategyConfigDrawer.tsx
│       │   ├── styles/
│       │   │   └── index.css
│       │   └── main.tsx
│       ├── vite.config.ts
│       └── package.json
├── tests/
│   ├── chunkers/
│   │   ├── hierarchical.test.ts
│   │   ├── markdown-ast.test.ts
│   │   ├── recursive-char.test.ts
│   │   └── semantic-boundary.test.ts
│   ├── embeddings/
│   │   ├── bm25-provider.test.ts
│   │   └── mock-provider.test.ts
│   ├── evaluation/
│   │   └── metrics.test.ts
│   └── storage/
│       └── vector-math.test.ts
├── examples/
│   ├── sample-docs/
│   │   ├── cloud-architecture.md
│   │   └── enterprise-policy.md
│   └── golden-queries.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Core Interfaces and Data Contracts

```typescript
export interface DocumentChunk {
  id: string;
  documentId: string;
  index: number;
  content: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
  parentId?: string;
  metadata: {
    sectionHeader?: string;
    headerHierarchy?: string[];
    isCodeBlock?: boolean;
    strategy: string;
    custom?: Record<string, unknown>;
  };
}

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  preserveCodeBlocks?: boolean;
  preserveHeaders?: boolean;
  parentChunkSize?: number;
  parentOverlap?: number;
}

export interface BaseChunker {
  readonly strategyName: string;
  chunk(documentText: string, options: ChunkingOptions, documentId?: string): Promise<DocumentChunk[]>;
}

export interface EmbeddingProvider {
  readonly providerName: string;
  readonly dimensions: number;
  embedText(text: string): Promise<Float64Array>;
  embedBatch(texts: string[]): Promise<Float64Array[]>;
}

export interface GoldenQuery {
  id: string;
  query: string;
  relevantKeywords: string[];
  expectedMatchingSubstrings?: string[];
  minimumRelevanceScore?: number;
}

export interface BenchmarkMetrics {
  strategyName: string;
  providerName: string;
  totalChunks: number;
  averageChunkSize: number;
  chunkSizeVariance: number;
  chunkingLatencyMs: number;
  indexingLatencyMs: number;
  retrievalLatencyMs: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt3: number;
  recallAt5: number;
  meanReciprocalRank: number;
  hitRate: number;
  contextFragmentationScore: number;
}
```

---

## 5. Execution Roadmap

### Phase 1: Core Engine, Tokenizer, and Parsers
* Token counter with fast BPE estimation and exact token counting options.
* `RecursiveCharacterChunker` with customizable hierarchy: `["\n\n", "\n", ". ", " ", ""]`.
* `MarkdownAstChunker` utilizing `remark-parse` to preserve Markdown header hierarchies and code fences intact.
* `SemanticBoundaryChunker` with sentence boundary detection and proposition preservation.
* `TokenSlidingWindowChunker` for exact token budget windows.
* `HierarchicalChunker` for parent-child retrieval pairings.
* Full test coverage for chunk boundaries, offset indexes, and token counts.

### Phase 2: Vector Mathematics and Embedding Adapters
* Typed array cosine similarity and dot product routines.
* `MockEmbeddingProvider`: deterministic vector generator derived from token hash distributions for reproducible, offline tests.
* `BM25SparseProvider`: in-memory Okapi BM25 implementation for lexical relevance baselines.
* REST adapters for OpenAI, Voyage AI, and local Ollama instances.
* In-memory vector store supporting fast Top-K retrieval and similarity filtering.

### Phase 3: Benchmark and Evaluation Suite
* Query runner matching retrieved chunks against golden test cases.
* Precision@K, Recall@K, MRR, Hit Rate, and Context Fragmentation calculation.
* Synthetic Golden Query Generator extracting questions directly from document structure.
* Output formats: terminal tables, JSON, Markdown summaries, and standalone HTML reports.

### Phase 4: Embedded React 19 Web Studio and Local Server
* Lightweight Node HTTP REST server with endpoints for chunking, benchmarking, and searching.
* React 19 Web Studio with Tailwind CSS styling.
* Color-coded chunk visualizer over document text with hover cards and offset metrics.
* Chunk overlap indicator showing token sharing.
* Live Query Sandbox: interactive vector search with real-time highlights and cosine scores.
* Multi-strategy side-by-side comparison matrix.

### Phase 5: CLI Executable, Documentation, and Packaging
* CLI bin wrapper (`chunkcraft chunk`, `chunkcraft benchmark`, `chunkcraft studio`, `chunkcraft generate-queries`).
* Example documents and golden queries.
* Comprehensive test suite execution.
* Final documentation polish with demo assets.
