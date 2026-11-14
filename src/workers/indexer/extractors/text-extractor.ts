import * as fs from 'fs';

export async function extractPlainText(
  filePath: string,
  maxSizeBytes: number = 52428800 // 50MB
): Promise<string> {
  const stat = await fs.promises.stat(filePath);

  if (stat.size > maxSizeBytes) {
    // Read only the first 1MB for oversized files to prevent memory exhaustion
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(1048576);
    const { bytesRead } = await fd.read(buffer, 0, 1048576, 0);
    await fd.close();
    return buffer.toString('utf-8', 0, bytesRead);
  }

  const content = await fs.promises.readFile(filePath, 'utf-8');
  return content;
}
