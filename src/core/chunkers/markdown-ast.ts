import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { BaseChunker, ChunkingOptions, DocumentChunk, createChunkId } from './base.js';
import { countTokens } from '../tokenizer/token-counter.js';

interface HeadingContext {
  depth: number;
  text: string;
}

export class MarkdownAstChunker implements BaseChunker {
  readonly strategyName = 'markdown-ast';

  async chunk(
    documentText: string,
    options: ChunkingOptions,
    documentId: string = 'doc'
  ): Promise<DocumentChunk[]> {
    const targetSize = options.chunkSize;
    const isTokens = !options.useCharBudget;
    const measure = (s: string) => (isTokens ? countTokens(s) : s.length);

    // Parse Markdown into AST
    const processor = unified().use(remarkParse);
    const ast = processor.parse(documentText) as any;

    const sections: Array<{
      content: string;
      startIndex: number;
      endIndex: number;
      isCodeBlock: boolean;
      headingHierarchy: string[];
      activeHeader?: string;
    }> = [];

    let currentHeadingStack: HeadingContext[] = [];

    // Helper to extract plain text from an AST node
    const extractText = (node: any): string => {
      if (!node) return '';
      if (node.value) return node.value;
      if (node.children && Array.isArray(node.children)) {
        return node.children.map(extractText).join('');
      }
      return '';
    };

    if (ast && Array.isArray(ast.children)) {
      for (const node of ast.children) {
        const start = node.position?.start?.offset ?? 0;
        const end = node.position?.end?.offset ?? documentText.length;
        const rawNodeText = documentText.slice(start, end).trim();

        if (!rawNodeText) continue;

        if (node.type === 'heading') {
          const depth = node.depth ?? 1;
          const headingText = extractText(node).trim();

          // Maintain hierarchy stack: pop any headers at or deeper than current depth
          currentHeadingStack = currentHeadingStack.filter(h => h.depth < depth);
          currentHeadingStack.push({ depth, text: headingText });

          // Also add heading as a structural node
          sections.push({
            content: rawNodeText,
            startIndex: start,
            endIndex: end,
            isCodeBlock: false,
            headingHierarchy: currentHeadingStack.map(h => h.text),
            activeHeader: headingText
          });
        } else {
          const isCode = node.type === 'code';
          const activeHeader = currentHeadingStack.length > 0
            ? currentHeadingStack[currentHeadingStack.length - 1].text
            : undefined;

          sections.push({
            content: rawNodeText,
            startIndex: start,
            endIndex: end,
            isCodeBlock: isCode,
            headingHierarchy: currentHeadingStack.map(h => h.text),
            activeHeader
          });
        }
      }
    }

    // Merge sections into chunks respecting targetSize
    const result: DocumentChunk[] = [];
    let currentBatch: typeof sections = [];
    let currentTokens = 0;

    const flushBatch = () => {
      if (currentBatch.length === 0) return;

      const firstNode = currentBatch[0];
      const lastNode = currentBatch[currentBatch.length - 1];
      const mergedContent = currentBatch.map(s => s.content).join('\n\n');
      const startIdx = firstNode.startIndex;
      const endIdx = lastNode.endIndex;

      // Extract unified hierarchy from nodes in batch
      const combinedHierarchy = Array.from(
        new Set(currentBatch.flatMap(s => s.headingHierarchy))
      );
      const primaryHeader = currentBatch.find(s => s.activeHeader)?.activeHeader;
      const hasCode = currentBatch.some(s => s.isCodeBlock);

      result.push({
        id: createChunkId(documentId, this.strategyName, result.length),
        documentId,
        index: result.length,
        content: mergedContent,
        startIndex: startIdx,
        endIndex: endIdx,
        tokenCount: countTokens(mergedContent),
        metadata: {
          strategy: this.strategyName,
          sectionHeader: primaryHeader,
          headerHierarchy: combinedHierarchy.length > 0 ? combinedHierarchy : undefined,
          isCodeBlock: hasCode
        }
      });

      currentBatch = [];
      currentTokens = 0;
    };

    for (const section of sections) {
      const sectionTokens = measure(section.content);

      // If a single node is already larger than targetSize (e.g. large code block or long section)
      if (sectionTokens > targetSize) {
        flushBatch();

        // If code block or requested to preserve whole, keep intact or slice gracefully
        if (section.isCodeBlock && options.preserveCodeBlocks) {
          result.push({
            id: createChunkId(documentId, this.strategyName, result.length),
            documentId,
            index: result.length,
            content: section.content,
            startIndex: section.startIndex,
            endIndex: section.endIndex,
            tokenCount: countTokens(section.content),
            metadata: {
              strategy: this.strategyName,
              sectionHeader: section.activeHeader,
              headerHierarchy: section.headingHierarchy,
              isCodeBlock: true
            }
          });
        } else {
          // Line-by-line slice for large node
          const lines = section.content.split('\n');
          let subLines: string[] = [];
          let subTokens = 0;
          let subStartOffset = section.startIndex;

          for (const line of lines) {
            const lineTokens = measure(line + '\n');
            if (subTokens + lineTokens > targetSize && subLines.length > 0) {
              const subContent = subLines.join('\n');
              const subEndOffset = subStartOffset + subContent.length;
              result.push({
                id: createChunkId(documentId, this.strategyName, result.length),
                documentId,
                index: result.length,
                content: subContent,
                startIndex: subStartOffset,
                endIndex: subEndOffset,
                tokenCount: countTokens(subContent),
                metadata: {
                  strategy: this.strategyName,
                  sectionHeader: section.activeHeader,
                  headerHierarchy: section.headingHierarchy,
                  isCodeBlock: section.isCodeBlock
                }
              });
              subStartOffset = subEndOffset;
              subLines = [];
              subTokens = 0;
            }
            subLines.push(line);
            subTokens += lineTokens;
          }

          if (subLines.length > 0) {
            const subContent = subLines.join('\n');
            result.push({
              id: createChunkId(documentId, this.strategyName, result.length),
              documentId,
              index: result.length,
              content: subContent,
              startIndex: subStartOffset,
              endIndex: section.endIndex,
              tokenCount: countTokens(subContent),
              metadata: {
                strategy: this.strategyName,
                sectionHeader: section.activeHeader,
                headerHierarchy: section.headingHierarchy,
                isCodeBlock: section.isCodeBlock
              }
            });
          }
        }
        continue;
      }

      if (currentTokens + sectionTokens > targetSize && currentBatch.length > 0) {
        flushBatch();
      }

      currentBatch.push(section);
      currentTokens += sectionTokens;
    }

    flushBatch();

    return result;
  }
}
