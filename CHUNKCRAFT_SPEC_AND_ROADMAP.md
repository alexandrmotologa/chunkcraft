# Engineering Specification & Implementation Blueprint: ChunkCraft
> Production RAG Chunking, Embedding Evaluation & Retrieval Benchmark Studio

---

## 1. Executive Summary & Problem Space

### 1.1 The RAG Failure Mode in Production
Most enterprise Retrieval-Augmented Generation (RAG) deployments fail quietly at the ingestion layer. While engineering teams invest heavily in LLM prompt engineering, guardrails, and model selection, the actual quality of RAG answers depends primarily on chunk quality and retrieval precision:

1. **Blind Chunking Remnants:** Naive character or token slicing cuts code blocks, tables, sentences, and markdown sections in half, destroying semantics and generating orphaned context fragments.
2. **Untested Embedding Trade-offs:** Teams pick embedding models (OpenAI `text-embedding-3`, Voyage AI, Cohere, local HuggingFace models) without measuring domain-specific retrieval precision or latency impact.
3. **Absence of Quantitative Benchmarks:** Engineers tweak chunk sizes (`512` vs `1024`, overlap `50` vs `150`) based on intuition rather than empirical metrics like Precision@K, Recall@K, Mean Reciprocal Rank (MRR), and context preservation ratios.
4. **Opaque Vector Black Boxes:** When an agent hallucinates or retrieves irrelevant context, debugging why a specific document chunk was ranked #1 or #12 requires manual cosine similarity math and inspecting raw vectors.

### 1.2 The Solution: ChunkCraft
**ChunkCraft** is a developer CLI and embedded Web Studio built in **TypeScript and React 19** that turns RAG chunking and retrieval into a measurable, visual science.

* **Multi-Strategy Chunking Engine:** Concurrently processes raw documents (Markdown, TXT, Code, PDF extract) across 4 standard strategies: Recursive Character, Markdown AST Section-Aware, Semantic Boundary, and Token Sliding Window.
* **Vector Retrieval Benchmarker:** Computes Precision@K, Recall@K, and MRR against user-defined or synthetically generated golden question-answer pairs.
* **Visual Document Chunk Explorer:** An embedded React Web Studio that visualizes chunks directly over the original document text with distinct color coding, boundary markers, token counts, and overlap indicators.
* **Side-by-Side Comparison Matrix:** Compare two or three chunking and embedding configurations simultaneously to inspect latency deltas, vector distance distributions, and retrieval rankings.
* **Zero Cloud Lock-in:** Runs entirely locally using an in-memory or SQLite-backed vector store, with adapters for external providers (OpenAI, Voyage AI) and offline synthetic vectors for local CI/CD pipelines.

---

## 2. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ChunkCraft Architecture                         │
└────────────────────────────────────────────────────────────────────────┘

[ CLI Interface: npx chunkcraft ]  OR  [ Embedded Web Studio ] (http://localhost:50090)
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ChunkCraft Core Runtime Engine                    │
├────────────────────────────────────────────────────────────────────────┤
│  Document Ingestion & AST Parsers                                      │
│    ├── Plaintext & Markdown Parser (remark / unist AST)                │
│    └── Metadata & Code-Block Preserver                                 │
├────────────────────────────────────────────────────────────────────────┤
│  Chunking Strategy Pipeline                                            │
│    ├── Recursive Character Chunker (Separator Hierarchy: \n\n, \n, " ") │
│    ├── Markdown AST Chunker (Preserves Header Hierarchies H1->H2->H3)  │
│    ├── Semantic Boundary Chunker (Sentence-aware boundary detection)   │
│    └── Token Sliding Window Chunker (Exact token budget allocation)    │
├────────────────────────────────────────────────────────────────────────┤
│  Embedding Adapters & Vector Engine                                    │
│    ├── Mock Deterministic Embedding Provider (Offline CI tests)        │
│    ├── OpenAI Adapter (text-embedding-3-small / large)                 │
│    ├── Voyage AI Adapter (voyage-3, voyage-code-3)                     │
│    └── Local In-Memory Vector Store (Cosine Similarity & Top-K SIMD)   │
├────────────────────────────────────────────────────────────────────────┤
│  Evaluation & Benchmark Suite                                          │
│    ├── Precision@K, Recall@K, and Mean Reciprocal Rank (MRR)           │
│    ├── Context Fragmentation Score & Boundary Loss Index               │
│    └── Markdown / JSON Benchmark Report Generator                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack Choices
* **Runtime:** Node.js 22 LTS / TypeScript 5.6+
* **CLI Engine:** Commander.js + Picocolors + Ora + Table
* **Web Studio:** React 19 + Vite 6 + Tailwind CSS (bundled as static assets inside the package)
* **Storage:** Embedded SQLite (`better-sqlite3` or in-memory vector array with cosine math)
* **AST Parsing:** `unified` + `remark-parse` + `unist-util-visit` for structural document awareness

---

## 3. Directory & File Structure

```
chunkcraft/
├── bin/
│   └── chunkcraft.js               # CLI executable entry point
├── src/
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── benchmark.ts        # chunkcraft benchmark <file> --eval <queries.json>
│   │   │   ├── chunk.ts            # chunkcraft chunk <file> --strategy <name>
│   │   │   └── studio.ts           # chunkcraft studio <file> (Launches embedded UI)
│   │   └── index.ts
│   ├── core/
│   │   ├── chunkers/
│   │   │   ├── base.ts             # BaseChunker interface and options
│   │   │   ├── fixed-token.ts      # Token sliding window chunker
│   │   │   ├── markdown-ast.ts     # Markdown header hierarchy chunker
│   │   │   ├── recursive-char.ts   # Recursive delimiter chunker
│   │   │   └── semantic-boundary.ts# Sentence boundary chunker
│   │   ├── embeddings/
│   │   │   ├── base.ts             # EmbeddingProvider interface
│   │   │   ├── mock-provider.ts    # Deterministic vector generator for tests
│   │   │   ├── openai-provider.ts  # OpenAI REST adapter
│   │   │   └── voyage-provider.ts  # Voyage AI REST adapter
│   │   ├── evaluation/
│   │   │   ├── metrics.ts          # Precision@K, Recall@K, MRR calculations
│   │   │   └── test-runner.ts      # Benchmark execution engine
│   │   ├── storage/
│   │   │   ├── vector-math.ts      # Cosine similarity and dot product algorithms
│   │   │   └── vector-store.ts     # In-memory top-K vector search
│   │   └── tokenizer/
│   │       └── token-counter.ts    # Fast token estimation and tiktoken support
│   ├── server/
│   │   ├── api-router.ts           # REST endpoints for embedded Studio
│   │   └── local-server.ts         # Lightweight Node HTTP server
│   └── studio/                     # React 19 Frontend Web Studio
│       ├── index.html
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── ChunkVisualizer.tsx
│       │   │   ├── DocumentViewer.tsx
│       │   │   ├── MetricsComparisonTable.tsx
│       │   │   ├── QuerySandbox.tsx
│       │   │   └── StrategyConfigDrawer.tsx
│       │   ├── styles/
│       │   │   └── index.css
│       │   └── main.tsx
│       └── vite.config.ts
├── tests/
│   ├── chunkers/
│   │   ├── markdown-ast.test.ts
│   │   └── recursive-char.test.ts
│   ├── evaluation/
│   │   └── metrics.test.ts
│   └── storage/
│       └── vector-math.test.ts
├── examples/
│   ├── sample-docs/
│   │   └── enterprise-policy.md
│   └── golden-queries.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Core Data Contracts & Interfaces

```typescript
// src/core/chunkers/base.ts
export interface DocumentChunk {
  id: string;
  documentId: string;
  index: number;
  content: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
  metadata: {
    sectionHeader?: string;
    headerHierarchy?: string[];
    isCodeBlock?: boolean;
    strategy: string;
  };
}

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  preserveCodeBlocks?: boolean;
  preserveHeaders?: boolean;
}

export interface BaseChunker {
  readonly strategyName: string;
  chunk(documentText: string, options: ChunkingOptions): Promise<DocumentChunk[]>;
}

// src/core/evaluation/metrics.ts
export interface GoldenQuery {
  id: string;
  query: string;
  relevantKeywords: string[];
  expectedMatchingSubstrings?: string[];
}

export interface BenchmarkMetrics {
  strategyName: string;
  totalChunks: number;
  averageChunkSize: number;
  chunkSizeVariance: number;
  latencyMs: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt3: number;
  recallAt5: number;
  meanReciprocalRank: number;
}
```

---

## 5. Implementation Roadmap (Phases 1-5)

### Phase 1: Core Chunking Engine & Tokenizer
* Implement `RecursiveCharacterChunker` with customizable hierarchy: `["\n\n", "\n", ". ", " ", ""]`.
* Implement `MarkdownAstChunker` using `remark-parse` to keep Markdown sections together under their corresponding header context.
* Implement fast BPE token estimation and exact tiktoken mapping.
* Write comprehensive unit tests for chunk boundary guarantees and overlap validation.

### Phase 2: Embedding Adapters & Vector Search
* Implement `vector-math.ts` with typed array cosine similarity.
* Build `MockEmbeddingProvider` (deterministic pseudo-vectors based on token hash) for fast, cost-free testing.
* Build `OpenAIEmbeddingProvider` and `VoyageEmbeddingProvider` with rate limiting and batching.
* Implement an in-memory vector store supporting fast Top-K filtering.

### Phase 3: Benchmark & Evaluation Suite
* Build query execution runner that scores retrieved chunks against golden test cases.
* Calculate Precision@K, Recall@K, and MRR.
* Calculate Context Fragmentation Ratio (how often a logical paragraph was bisected).
* Add CLI command `chunkcraft benchmark <file> --eval <queries.json> --format markdown`.

### Phase 4: Embedded Web Studio (React 19)
* Develop the interactive document viewer with color-coded chunk highlights.
* Add live chunk hover cards displaying chunk index, tokens, start/end byte offsets, and header context.
* Create a side-by-side comparison tab to inspect 2 chunking configurations concurrently.
* Build an interactive Query Sandbox: enter a search query, view top-K retrieved chunks highlighted directly in the document, and inspect cosine similarity scores.

### Phase 5: Polish, CI Integration & Documentation
* Export static HTML benchmark reports for automated pull request comments.
* Package CLI binary with `#!/usr/bin/env node`.
* Create thorough `README.md` with demo GIF, quickstart instructions, and comparison benchmarks.
