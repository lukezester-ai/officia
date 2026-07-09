export const EMBEDDING_DIM = 256;

function hashToBucket(term: string, bucketIndex: number): number {
  let hash = 0;
  for (let i = 0; i < term.length; i++) {
    const char = term.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return ((hash ^ (bucketIndex * 2654435761)) >>> 0) % 2 === 0 ? 1 : -1;
}

function tokenize(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  const tokens = text
    .toLocaleLowerCase('bg-BG')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3);
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

export function generateEmbedding(text: string): number[] {
  const freq = tokenize(text);
  if (freq.size === 0) return new Array(EMBEDDING_DIM).fill(0);

  const maxFreq = Math.max(...freq.values());
  const vector = new Array(EMBEDDING_DIM).fill(0);

  for (const [term, count] of freq) {
    const tf = count / maxFreq;
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] += hashToBucket(term, i) * tf;
    }
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] /= magnitude;
    }
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
