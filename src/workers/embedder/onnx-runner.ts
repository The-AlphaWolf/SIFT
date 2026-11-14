import { pipeline, env } from '@huggingface/transformers';

// Crucial: enforce single-threaded execution to prevent Electron worker deadlocks
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

let featureExtractorPromise: Promise<any> | null = null;

export async function getEmbeddingPipeline(): Promise<any> {
  if (!featureExtractorPromise) {
    featureExtractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return featureExtractorPromise;
}

/**
 * Generates a 384-dimensional normalized float32 embedding for a given text string.
 */
export async function generateEmbedding(text: string): Promise<Float32Array> {
  const extractor = await getEmbeddingPipeline();
  const clean = text.trim();
  if (!clean) {
    return new Float32Array(384);
  }

  const output = await extractor(clean, { pooling: 'mean', normalize: true });
  return new Float32Array(output.data);
}

/**
 * Generates embeddings in batches for indexing throughput.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
  const extractor = await getEmbeddingPipeline();
  const validTexts = texts.map((t) => t.trim() || 'empty');

  const output = await extractor(validTexts, { pooling: 'mean', normalize: true });
  const results: Float32Array[] = [];

  // Tensor shape: [batchSize, 384]
  const batchSize = validTexts.length;
  const dim = 384;

  for (let i = 0; i < batchSize; i++) {
    const slice = output.data.subarray(i * dim, (i + 1) * dim);
    results.push(new Float32Array(slice));
  }

  return results;
}
