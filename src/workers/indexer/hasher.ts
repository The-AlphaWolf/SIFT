import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Calculates SHA-256 hash for a file using a streaming pipeline.
 * Memory footprint is bounded to the 64KB read buffer.
 */
export function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { highWaterMark: 65536 });

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}
