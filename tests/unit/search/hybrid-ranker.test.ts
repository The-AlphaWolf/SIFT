import { describe, it, expect } from 'vitest';
import {
  calculateRecencyScore,
  calculateFilenameMatchScore,
  fuseAndRankResults,
  DEFAULT_WEIGHTS,
} from '../../../src/main/services/search/hybrid-ranker';
import type { SearchResultItem } from '../../../src/shared/contracts/ipc-api';
import type { VectorMatch } from '../../../src/main/services/search/vector-engine';

describe('Phase 4 Hybrid Ranker', () => {
  describe('calculateRecencyScore', () => {
    it('should return ~1.0 for files modified today', () => {
      const nowIso = new Date().toISOString();
      const score = calculateRecencyScore(nowIso);
      expect(score).toBeGreaterThan(0.98);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should decay to ~0.368 after 90 days', () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const score = calculateRecencyScore(ninetyDaysAgo);
      expect(score).toBeCloseTo(0.368, 1);
    });
  });

  describe('calculateFilenameMatchScore', () => {
    it('should return 1.0 when a keyword matches filename substring', () => {
      expect(calculateFilenameMatchScore('waveguide_notes.pdf', ['waveguide'])).toBe(1.0);
      expect(calculateFilenameMatchScore('Lecture_Microwave_04.docx', ['microwave'])).toBe(1.0);
    });

    it('should return 0.0 when no keywords match filename', () => {
      expect(calculateFilenameMatchScore('unrelated_file.pdf', ['waveguide', 'antenna'])).toBe(0.0);
    });
  });

  describe('fuseAndRankResults', () => {
    const ftsItem: SearchResultItem = {
      fileId: 'file-1',
      filePath: 'D:/Notes/waveguide.pdf',
      filename: 'waveguide.pdf',
      extension: 'pdf',
      sizeBytes: 1024,
      modifiedAt: new Date().toISOString(),
      category: 'Academics',
      score: 0.8,
      matchType: 'fts',
      snippets: [{ chunkId: 1, text: 'waveguide notes', highlightRanges: [] }],
    };

    const vectorMatch: VectorMatch = {
      fileId: 'file-2',
      filePath: 'D:/Notes/electromagnetic_theory.docx',
      filename: 'electromagnetic_theory.docx',
      extension: 'docx',
      sizeBytes: 2048,
      modifiedAt: new Date().toISOString(),
      category: 'Academics',
      distance: 0.2, // similarity = 0.8
      similarity: 0.8,
      chunkId: 2,
      chunkText: 'Maxwell equations and wave propagation',
    };

    it('should fuse FTS and vector items and assign correct matchType', () => {
      const results = fuseAndRankResults([ftsItem], [vectorMatch], ['waveguide']);

      expect(results.length).toBe(2);

      const hit1 = results.find((r) => r.fileId === 'file-1');
      const hit2 = results.find((r) => r.fileId === 'file-2');

      expect(hit1?.matchType).toBe('fts');
      expect(hit2?.matchType).toBe('vector');
      expect(hit1?.score).toBeGreaterThan(0);
      expect(hit2?.score).toBeGreaterThan(0);
    });

    it('should identify hybrid matches that match both FTS and Vector', () => {
      const overlappingVectorMatch: VectorMatch = {
        fileId: 'file-1', // same file
        filePath: 'D:/Notes/waveguide.pdf',
        filename: 'waveguide.pdf',
        extension: 'pdf',
        sizeBytes: 1024,
        modifiedAt: new Date().toISOString(),
        category: 'Academics',
        distance: 0.1,
        similarity: 0.9,
        chunkId: 1,
        chunkText: 'waveguide notes',
      };

      const results = fuseAndRankResults([ftsItem], [overlappingVectorMatch], ['waveguide']);

      expect(results.length).toBe(1);
      expect(results[0].fileId).toBe('file-1');
      expect(results[0].matchType).toBe('hybrid');
      expect(results[0].score).toBeGreaterThan(0.7);
    });

    it('should boost category matches and demote unrelated files when category intent is active', () => {
      // Academic file matching category
      const academicFile: SearchResultItem = {
        fileId: 'file-academic',
        filePath: 'D:/Notes/COMPUTER NETWORKS 1.docx',
        filename: 'COMPUTER NETWORKS 1.docx',
        extension: 'docx',
        sizeBytes: 15000,
        modifiedAt: new Date().toISOString(),
        category: 'Academics',
        score: 0.1,
        matchType: 'filename',
        snippets: [],
      };

      // Unrelated novel matching an incidental word in FTS
      const novelFile: SearchResultItem = {
        fileId: 'file-novel',
        filePath: 'D:/Downloads/Apocalypse_Novel.txt',
        filename: 'Apocalypse_Novel.txt',
        extension: 'txt',
        sizeBytes: 500000,
        modifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Miscellaneous',
        score: 0.7, // incidental FTS match
        matchType: 'fts',
        snippets: [{ chunkId: 10, text: 'I started studying the whole building...', highlightRanges: [] }],
      };

      const results = fuseAndRankResults(
        [novelFile],
        [],
        ['study', 'materials'],
        {
          targetCategory: 'Academics',
          isCategoryIntent: true,
        },
        [academicFile]
      );

      expect(results.length).toBe(2);
      // The academic file should rank first despite the novel having an incidental FTS match
      expect(results[0].fileId).toBe('file-academic');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });
});
