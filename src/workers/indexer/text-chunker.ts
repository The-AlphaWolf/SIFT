export interface TextChunk {
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
}

export interface ChunkerOptions {
  chunkSizeTokens?: number;
  chunkOverlapTokens?: number;
}

const DEFAULT_CHUNK_SIZE = 256;
const DEFAULT_CHUNK_OVERLAP = 32;

/**
 * Splits document text into overlapping chunks for FTS5 snippets and embedding generation.
 * Default: 256 tokens per chunk with 32-token overlap.
 */
export function chunkText(
  fullText: string,
  options: ChunkerOptions = {}
): TextChunk[] {
  const chunkSize = options.chunkSizeTokens || DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlapTokens || DEFAULT_CHUNK_OVERLAP;

  const normalized = fullText.trim().replace(/\r\n/g, '\n');

  if (!normalized) {
    return [];
  }

  // Tokenize roughly by whitespace sequences
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);

  if (words.length <= chunkSize) {
    return [
      {
        chunkIndex: 0,
        chunkText: normalized,
        tokenCount: words.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  const step = Math.max(1, chunkSize - chunkOverlap);
  let chunkIdx = 0;

  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(words.length, start + chunkSize);
    const chunkWords = words.slice(start, end);
    const chunkString = chunkWords.join(' ');

    chunks.push({
      chunkIndex: chunkIdx++,
      chunkText: chunkString,
      tokenCount: chunkWords.length,
    });

    if (end >= words.length) {
      break;
    }
  }

  return chunks;
}
