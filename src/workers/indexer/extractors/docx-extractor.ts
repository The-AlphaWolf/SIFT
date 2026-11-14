import * as mammoth from 'mammoth';

export async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (error: any) {
    throw new Error(`Failed to extract DOCX text: ${error?.message || error}`);
  }
}
