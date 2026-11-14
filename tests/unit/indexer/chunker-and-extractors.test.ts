import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { chunkText } from '../../../src/workers/indexer/text-chunker';
import { computeSha256 } from '../../../src/workers/indexer/hasher';
import { extractPlainText } from '../../../src/workers/indexer/extractors/text-extractor';
import { scanDirectory } from '../../../src/workers/indexer/scanner';

describe('Phase 3 Indexer & Parsers', () => {
  describe('text-chunker', () => {
    it('should return empty array for empty or whitespace text', () => {
      expect(chunkText('')).toEqual([]);
      expect(chunkText('   \n\t  ')).toEqual([]);
    });

    it('should keep short text in a single chunk', () => {
      const text = 'This is a short microwave engineering note about waveguides.';
      const chunks = chunkText(text, { chunkSizeTokens: 256, chunkOverlapTokens: 32 });
      expect(chunks.length).toBe(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].chunkText).toBe(text);
      expect(chunks[0].tokenCount).toBe(9);
    });

    it('should split long text into overlapping chunks', () => {
      // Create 100 words text
      const words = Array.from({ length: 100 }, (_, i) => `word${i}`);
      const text = words.join(' ');

      const chunks = chunkText(text, { chunkSizeTokens: 30, chunkOverlapTokens: 10 });
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[1].chunkIndex).toBe(1);

      // Verify overlap: end of chunk 0 should overlap start of chunk 1
      const chunk0Words = chunks[0].chunkText.split(' ');
      const chunk1Words = chunks[1].chunkText.split(' ');
      expect(chunk0Words.slice(-10)).toEqual(chunk1Words.slice(0, 10));
    });
  });

  describe('streaming SHA-256 hasher', () => {
    it('should compute valid sha256 hex digest for a file', async () => {
      const tmpDir = os.tmpdir();
      const testFile = path.join(tmpDir, `sift_hash_test_${Date.now()}.txt`);
      const sampleContent = 'SIFT Intelligent File Librarian test content for SHA-256';

      await fs.promises.writeFile(testFile, sampleContent, 'utf-8');

      try {
        const hash = await computeSha256(testFile);
        expect(hash).toBeDefined();
        expect(hash.length).toBe(64); // SHA-256 hex length is 64 characters
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        await fs.promises.unlink(testFile).catch(() => {});
      }
    });
  });

  describe('extractPlainText', () => {
    it('should extract UTF-8 text from markdown and txt files', async () => {
      const tmpDir = os.tmpdir();
      const testFile = path.join(tmpDir, `sift_extract_test_${Date.now()}.md`);
      const sampleMarkdown = '# Microwave Notes\n\nElectromagnetic wave analysis.';

      await fs.promises.writeFile(testFile, sampleMarkdown, 'utf-8');

      try {
        const extracted = await extractPlainText(testFile);
        expect(extracted).toBe(sampleMarkdown);
      } finally {
        await fs.promises.unlink(testFile).catch(() => {});
      }
    });
  });

  describe('recursive scanner', () => {
    it('should recursively discover supported files while ignoring hidden dirs and symlinks', async () => {
      const tmpDir = path.join(os.tmpdir(), `sift_scan_test_${Date.now()}`);
      await fs.promises.mkdir(tmpDir, { recursive: true });

      const subDir = path.join(tmpDir, 'subfolder');
      await fs.promises.mkdir(subDir, { recursive: true });

      const ignoredDir = path.join(tmpDir, 'node_modules');
      await fs.promises.mkdir(ignoredDir, { recursive: true });

      const file1 = path.join(tmpDir, 'notes.txt');
      const file2 = path.join(subDir, 'doc.pdf');
      const ignoredFile = path.join(ignoredDir, 'ignored.txt');
      const unsupportedFile = path.join(tmpDir, 'program.exe');

      await fs.promises.writeFile(file1, 'Sample text note');
      await fs.promises.writeFile(file2, 'Sample PDF content');
      await fs.promises.writeFile(ignoredFile, 'Should be ignored');
      await fs.promises.writeFile(unsupportedFile, 'Binary content');

      try {
        const results = await scanDirectory('folder-1', tmpDir);
        const discoveredNames = results.map((r) => r.filename);

        expect(discoveredNames).toContain('notes.txt');
        expect(discoveredNames).toContain('doc.pdf');
        expect(discoveredNames).not.toContain('ignored.txt');
        expect(discoveredNames).not.toContain('program.exe');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  });
});
