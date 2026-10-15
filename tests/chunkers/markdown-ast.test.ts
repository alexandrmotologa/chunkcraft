import { describe, it, expect } from 'vitest';
import { MarkdownAstChunker } from '../../src/core/chunkers/markdown-ast.js';

describe('MarkdownAstChunker', () => {
  const chunker = new MarkdownAstChunker();

  const markdownDoc = `
# Platform Documentation

## Cloud Storage
Object storage is powered by MinIO and AWS S3 compatible interfaces.
Data is encrypted at rest using AES-256-GCM.

### Code Sample
\`\`\`typescript
interface StorageConfig {
  bucket: string;
  region: string;
  kmsKeyId: string;
}
\`\`\`

## Database Layer
Postgres clusters are deployed with streaming replication across 3 availability zones.
`.trim();

  it('preserves header hierarchy in metadata', async () => {
    const chunks = await chunker.chunk(markdownDoc, {
      chunkSize: 50,
      chunkOverlap: 10
    }, 'cloud-doc');

    expect(chunks.length).toBeGreaterThan(0);

    const chunkWithHierarchy = chunks.find(c => c.metadata.headerHierarchy && c.metadata.headerHierarchy.length > 1);
    expect(chunkWithHierarchy).toBeDefined();
    expect(chunkWithHierarchy?.metadata.headerHierarchy).toContain('Platform Documentation');
  });

  it('flags code blocks in metadata', async () => {
    const chunks = await chunker.chunk(markdownDoc, {
      chunkSize: 60,
      chunkOverlap: 10,
      preserveCodeBlocks: true
    }, 'cloud-doc');

    const codeChunk = chunks.find(c => c.metadata.isCodeBlock === true);
    expect(codeChunk).toBeDefined();
    expect(codeChunk?.content).toContain('StorageConfig');
  });
});
