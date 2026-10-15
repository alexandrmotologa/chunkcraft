<p align="center">
  <img src="docs/images/chunkcraft_logo.png" width="140" alt="ChunkCraft Logo" />
</p>

<h1 align="center">ChunkCraft</h1>

<p align="center">
  <strong>Production RAG chunking benchmark, embedding evaluation suite, and React 19 visual retrieval studio</strong>
</p>

<p align="center">
  <a href="https://github.com/alexandrmotologa/chunkcraft/actions"><img src="https://img.shields.io/badge/CI-passing-2ea44f?style=flat-square" alt="CI Status" /></a>
  <a href="https://github.com/alexandrmotologa/chunkcraft/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square" alt="TypeScript" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square" alt="React 19" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22%20LTS-green?style=flat-square" alt="Node.js" /></a>
</p>

<p align="center">
  <img src="docs/images/chunkcraft_demo.gif" width="100%" alt="ChunkCraft Studio Live Interactive Demo" />
</p>

---

## Overview

ChunkCraft is a developer toolkit and local Web Studio for testing document chunking strategies, benchmarking embedding models, and measuring vector retrieval accuracy before deploying Retrieval-Augmented Generation (RAG) pipelines to production.

Most RAG regressions originate during document ingestion:
* Arbitrary character splitting fractures code blocks, Markdown tables, and sentences.
* Embedding model choices are made without evaluating domain retrieval precision or query latency.
* Chunk size and overlap parameters are adjusted by intuition instead of measurable metrics like Precision@K, Recall@K, and Mean Reciprocal Rank (MRR).

ChunkCraft provides a command-line interface and an embedded React 19 Web Studio that visualizes chunks over raw documents and computes retrieval metrics against golden test queries.

---

## Visual Studio & UI Walkthrough

### 1. Document Stream & Chunk Inspector
Inspect chunks directly over the original document layout with distinct color-coded segment boundaries, token meters, character ranges, and overlap indicators.

<p align="center">
  <img src="docs/images/chunkcraft_inspector.png" width="100%" alt="ChunkCraft Document Stream and Chunk Inspector" />
</p>

### 2. Interactive Retrieval Sandbox
Test live natural language queries against indexed chunks, view ranked results with cosine similarity scores, and jump directly to matching segments.

<p align="center">
  <img src="docs/images/chunkcraft_sandbox.png" width="100%" alt="ChunkCraft Interactive Retrieval Sandbox" />
</p>

### 3. Multi-Strategy Comparison Matrix
Compare multiple chunking strategies side by side on Precision@1, Precision@3, Precision@5, Recall@3, Recall@5, MRR, Hit Rate, and Context Fragmentation.

<p align="center">
  <img src="docs/images/chunkcraft_matrix.png" width="100%" alt="ChunkCraft Strategy Comparison Matrix" />
</p>

---

## Key Capabilities

* **Multi-Strategy Chunking Pipeline:** Run documents concurrently through Recursive Character, Markdown AST Section-Aware, Semantic Sentence Boundary, Token Sliding Window, and Hierarchical Parent-Child chunkers.
* **Retrieval Accuracy Benchmarks:** Measure Precision@1, Precision@3, Precision@5, Recall@3, Recall@5, MRR, and Boundary Fragmentation ratios.
* **Deterministic Offline Embeddings:** Built-in pseudo-random vector hashing and BM25 sparse retrieval allow full CI testing without external API keys or cloud spend.
* **Provider Adapters:** Native REST clients for OpenAI (`text-embedding-3-small`, `text-embedding-3-large`), Voyage AI (`voyage-3`, `voyage-code-3`), and local Ollama instances (`bge-m3`, `nomic-embed-text`).
* **React 19 Visual Studio:** Local interactive web application with real-time chunk highlighting, token meters, overlap visualization, live search sandbox, and side-by-side strategy diff matrix.
* **Automated Query Generation:** Synthesizes test queries directly from document structure for quick automated evaluations.

---

## Architecture

```
+-----------------------------------------------------------------------+
|                       ChunkCraft Architecture                         |
+-----------------------------------------------------------------------+

  [ CLI: npx chunkcraft ]                   [ Embedded React 19 Studio ]
            |                                           |
            +-------------------+   +-------------------+
                                |   |
                                v   v
+-----------------------------------------------------------------------+
|                     ChunkCraft Core Runtime Engine                    |
+-----------------------------------------------------------------------+
| Document Ingestion & Parsers                                          |
|   * Markdown & Code AST via remark/unist                              |
|   * Structural metadata extraction & header preservation              |
+-----------------------------------------------------------------------+
| Chunking Engines                                                      |
|   * Recursive Character (hierarchical delimiters)                     |
|   * Markdown AST (H1 > H2 > H3 contextual nesting)                    |
|   * Semantic Boundary (sentence boundary & punctuation heuristics)    |
|   * Token Sliding Window (exact token budget allocation)              |
|   * Hierarchical Parent-Child (linked macro/micro retrieval units)    |
+-----------------------------------------------------------------------+
| Vector Store & Embeddings                                             |
|   * In-Memory Vector Store with Cosine Similarity                     |
|   * Mock Hash-Based Provider (zero-cost offline CI)                   |
|   * BM25 Sparse Vector Provider (lexical ranking baseline)            |
|   * OpenAI / Voyage AI / Ollama Adapters                              |
+-----------------------------------------------------------------------+
| Benchmark & Evaluation Suite                                          |
|   * Retrieval Metrics: Precision@K, Recall@K, MRR, Hit Rate           |
|   * Structural Metrics: Context Fragmentation, Token Variance         |
|   * Exporters: Terminal Table, Markdown, JSON, Standalone HTML       |
+-----------------------------------------------------------------------+
```

---

## Quickstart

### 1. Installation

```bash
# Clone and build locally
git clone https://github.com/alexandrmotologa/chunkcraft.git
cd chunkcraft
npm install
npm run build
```

### 2. Chunking a Document via CLI

```bash
# Run Recursive Character chunking
node bin/chunkcraft.js chunk examples/sample-docs/enterprise-policy.md --strategy recursive-char --chunk-size 500 --chunk-overlap 50

# Run Markdown AST chunking with header hierarchies preserved
node bin/chunkcraft.js chunk examples/sample-docs/cloud-architecture.md --strategy markdown-ast --chunk-size 400
```

### 3. Running Benchmark Evaluation

```bash
# Run evaluation across multiple strategies against golden queries
node bin/chunkcraft.js benchmark examples/sample-docs/enterprise-policy.md \
  --eval examples/golden-queries.json \
  --strategies recursive-char,markdown-ast,semantic-boundary,token-window,hierarchical \
  --format table
```

### 4. Synthesizing Test Queries

```bash
# Generate 5 realistic test questions directly from headings and paragraphs
node bin/chunkcraft.js generate-queries examples/sample-docs/cloud-architecture.md --count 5 --output test-queries.json
```

### 5. Launching the Embedded React 19 Studio

```bash
# Start the local server and open the Web Studio in browser
node bin/chunkcraft.js studio examples/sample-docs/enterprise-policy.md --port 50090
```

---

## Evaluation Metrics

| Metric | Formula / Definition | Target in Production RAG |
| :--- | :--- | :--- |
| **Precision@K** | Ratio of relevant chunks among the top-K retrieved results. | > 0.70 |
| **Recall@K** | Proportion of expected key context fragments retrieved within top-K. | > 0.85 |
| **MRR (Mean Reciprocal Rank)** | Average reciprocal rank `1 / rank` of the first relevant chunk found. | > 0.80 |
| **Hit Rate** | Proportion of test queries where at least one relevant chunk appears in top-K. | > 0.90 |
| **Fragmentation Score** | Frequency of split paragraphs, severed code blocks, or orphan tables. | < 0.10 |
| **Token Utilization** | Standard deviation of token counts relative to target budget. | Controlled variance |

---

## Supported Chunking Strategies

1. **`recursive-char` (Recursive Character):**
   Splits text recursively across delimiter hierarchy (`\n\n`, `\n`, `. `, ` `, `""`) and packs segments up to token budget with sliding overlap.

2. **`markdown-ast` (Markdown AST Section-Aware):**
   Constructs a syntax tree using `remark-parse`. Keeps headers, code fences, blockquotes, and tables intact as atomic nodes, tracking full breadcrumb hierarchies (`H1 > H2 > H3`).

3. **`semantic-boundary` (Semantic Boundary):**
   Segments by sentence propositions while protecting abbreviations (`e.g.`, `i.e.`, `Dr.`), URLs, and decimal numbers from splitting.

4. **`token-window` (Token Sliding Window):**
   Applies an exact BPE token window with configurable stride (`chunkSize - chunkOverlap`).

5. **`hierarchical` (Parent-Child):**
   Emits parent macro chunks (e.g. 1000 tokens) linked to child micro chunks (e.g. 250 tokens), allowing parent-document retrieval evaluation.

---

## Supported Embedding Providers

* **`mock` (Deterministic Pseudo-Vectors):**
  Uses random projection across token n-grams. Identical inputs yield identical vectors; shared keywords yield high cosine similarity. Runs offline in sub-millisecond time.
* **`bm25` (Okapi BM25 Sparse):**
  In-memory lexical ranking engine for testing traditional keyword search against dense vector retrieval.
* **`openai` (OpenAI REST Client):**
  Supports `text-embedding-3-small`, `text-embedding-3-large`, and custom models via `OPENAI_API_KEY`.
* **`voyage` (Voyage AI REST Client):**
  Supports `voyage-3` and `voyage-code-3` via `VOYAGE_API_KEY`.
* **`ollama` (Local Ollama Instance):**
  Queries local open-weights embedding models (`bge-m3`, `nomic-embed-text`) via `http://localhost:11434`.

---

## Project Structure

```
chunkcraft/
├── bin/
│   └── chunkcraft.js               # CLI executable entry point
├── src/
│   ├── cli/
│   │   ├── commands/               # CLI commands (chunk, benchmark, studio, queries)
│   │   └── index.ts                # Commander program definition
│   ├── core/
│   │   ├── chunkers/               # Strategy implementations
│   │   │   ├── base.ts
│   │   │   ├── recursive-char.ts
│   │   │   ├── markdown-ast.ts
│   │   │   ├── semantic-boundary.ts
│   │   │   ├── token-window.ts
│   │   │   └── hierarchical.ts
│   │   ├── embeddings/             # Embedding adapters (Mock, BM25, OpenAI, Voyage, Ollama)
│   │   ├── evaluation/             # Metrics, golden queries, test runner, exporters
│   │   ├── storage/                # Vector store, cosine similarity, indexer
│   │   └── tokenizer/              # Token counter and BPE estimator
│   ├── server/                     # Local Node HTTP REST API server
│   └── studio/                     # React 19 + Vite + Tailwind CSS Web Studio
├── tests/                          # Vitest unit and integration test suite
├── examples/                       # Sample documents and golden queries
├── docs/                           # Documentation and visual assets
├── package.json
└── tsconfig.json
```

---

## License

MIT (c) 2026 Alexandr Motologa
