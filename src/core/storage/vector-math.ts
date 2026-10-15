/**
 * High-performance vector mathematics routines for RAG similarity search.
 */

export type Vector = Float64Array | number[];

/**
 * Computes the dot product of two vectors.
 */
export function dotProduct(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: vector a has length ${a.length}, vector b has length ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Computes the Euclidean norm (L2 norm) of a vector.
 */
export function l2Norm(vec: Vector): number {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  return Math.sqrt(sumSq);
}

/**
 * Normalizes a vector in-place to unit length (L2 norm = 1.0).
 */
export function l2Normalize(vec: Float64Array): Float64Array {
  const norm = l2Norm(vec);
  if (norm === 0) {
    return vec;
  }
  const invNorm = 1 / norm;
  for (let i = 0; i < vec.length; i++) {
    vec[i] *= invNorm;
  }
  return vec;
}

/**
 * Computes cosine similarity between two vectors: (a · b) / (||a|| * ||b||).
 * Clamps output within [-1.0, 1.0] to prevent floating point inaccuracies.
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch in cosineSimilarity: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  const similarity = dot / denominator;
  // Clamp between -1 and 1
  return Math.max(-1.0, Math.min(1.0, similarity));
}

/**
 * Computes the Euclidean distance between two vectors: sqrt(sum((a[i] - b[i])^2)).
 */
export function euclideanDistance(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch in euclideanDistance: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
