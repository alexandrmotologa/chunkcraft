import { BaseChunker } from './base.js';
import { RecursiveCharacterChunker } from './recursive-char.js';
import { MarkdownAstChunker } from './markdown-ast.js';
import { SemanticBoundaryChunker } from './semantic-boundary.js';
import { TokenSlidingWindowChunker } from './token-window.js';
import { HierarchicalChunker } from './hierarchical.js';

export * from './base.js';
export * from './recursive-char.js';
export * from './markdown-ast.js';
export * from './semantic-boundary.js';
export * from './token-window.js';
export * from './hierarchical.js';

const registry: Record<string, () => BaseChunker> = {
  'recursive-char': () => new RecursiveCharacterChunker(),
  'markdown-ast': () => new MarkdownAstChunker(),
  'semantic-boundary': () => new SemanticBoundaryChunker(),
  'token-window': () => new TokenSlidingWindowChunker(),
  'hierarchical': () => new HierarchicalChunker()
};

/**
 * Retrieves a chunker instance by its registered strategy identifier.
 */
export function getChunker(strategyName: string): BaseChunker {
  const normalized = strategyName.toLowerCase().trim();
  const factory = registry[normalized];
  if (!factory) {
    const available = Object.keys(registry).join(', ');
    throw new Error(`Unknown chunking strategy "${strategyName}". Available strategies: ${available}`);
  }
  return factory();
}

/**
 * Returns all registered chunking strategy names.
 */
export function listAvailableStrategies(): string[] {
  return Object.keys(registry);
}
