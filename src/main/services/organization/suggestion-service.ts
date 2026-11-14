import * as path from 'path';
import type Database from 'better-sqlite3';
import type { OrganizationSuggestion } from '../../../shared/contracts/ipc-api';
import { categorizeFile } from '../categorization/rule-categorizer';

interface FileCandidate {
  id: string;
  absolute_path: string;
  filename: string;
  extension: string;
  category: string;
  chunk_text?: string;
}

const GENERIC_PATTERNS = [
  { regex: /^(?:screenshot|screen_shot|capture)[-_\s\(\d\)]*/i, type: 'screenshot' },
  { regex: /^(?:img|dsc|photo|pic)[-_\s\d]+/i, type: 'camera_photo' },
  { regex: /^(?:untitled|new document|document|doc)[-_\s\d]*/i, type: 'untitled_doc' },
  { regex: /^(?:scan|scanner|scanned)[-_\s\d]*/i, type: 'scan' },
  { regex: /^(?:download|downloads)(?:\s*\(\d+\))?$/i, type: 'download_duplicate' },
  { regex: /[-_]final(?:[-_]final|[-_]v\d+)+/i, type: 'redundant_version' },
];

export function generateOrganizationSuggestions(
  db: Database.Database,
  limit: number = 50,
  offset: number = 0
): { suggestions: OrganizationSuggestion[]; totalCount: number } {
  // Query active files with optional snippet from file_content
  const rows = db.prepare(`
    SELECT 
      f.id,
      f.absolute_path,
      f.filename,
      f.extension,
      f.category,
      (SELECT chunk_text FROM file_content fc WHERE fc.file_id = f.id ORDER BY chunk_index ASC LIMIT 1) as chunk_text
    FROM files f
    WHERE f.is_deleted = 0
    ORDER BY f.indexed_at DESC
    LIMIT 200
  `).all() as FileCandidate[];

  const suggestions: OrganizationSuggestion[] = [];

  for (const row of rows) {
    const ext = row.extension ? `.${row.extension}` : '';
    const baseName = path.basename(row.filename, ext);

    let matchPattern: string | null = null;
    for (const pat of GENERIC_PATTERNS) {
      if (pat.regex.test(baseName)) {
        matchPattern = pat.type;
        break;
      }
    }

    // Also check if file is in Miscellaneous category but could be categorized better
    const targetCategory = categorizeFile({
      filename: row.filename,
      extension: row.extension,
      absolutePath: row.absolute_path,
    });

    const isMisclassified = row.category === 'Miscellaneous' && targetCategory !== 'Miscellaneous';

    if (matchPattern || isMisclassified) {
      let suggestedFilename = row.filename;
      let reason = '';

      if (matchPattern === 'screenshot') {
        suggestedFilename = `screenshot_${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}${ext}`;
        reason = 'Generic screenshot filename; recommend organizing by date/application';
      } else if (matchPattern === 'camera_photo') {
        suggestedFilename = `photo_${baseName.toLowerCase()}${ext}`;
        reason = 'Camera default prefix detected; recommend moving to Images library';
      } else if (matchPattern === 'download_duplicate') {
        suggestedFilename = `${baseName.replace(/\s*\(\d+\)$/, '')}${ext}`;
        reason = 'Browser duplicate download suffix detected (e.g. "(1)")';
      } else if (matchPattern === 'redundant_version') {
        suggestedFilename = `${baseName.replace(/[-_]final(?:[-_]final|[-_]v\d+)+/gi, '_revised')}${ext}`;
        reason = 'Redundant multiple "final" version suffixes detected in filename';
      } else if (matchPattern === 'untitled_doc' || matchPattern === 'scan') {
        // Try extracting meaningful topic from chunk text
        if (row.chunk_text) {
          const firstLine = row.chunk_text
            .split(/[\r\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 5)[0];

          if (firstLine) {
            const sanitized = firstLine
              .substring(0, 35)
              .replace(/[^a-zA-Z0-9\s-_]/g, '')
              .trim()
              .replace(/\s+/g, '_')
              .toLowerCase();
            suggestedFilename = `${sanitized}${ext}`;
            reason = 'Untitled document; title inferred from document heading';
          } else {
            suggestedFilename = `document_${baseName.toLowerCase()}${ext}`;
            reason = 'Generic document title without descriptive heading';
          }
        } else {
          suggestedFilename = `scanned_doc_${baseName.toLowerCase()}${ext}`;
          reason = 'Unlabeled scan file';
        }
      } else if (isMisclassified) {
        reason = `Auto-detected classification matches '${targetCategory}' based on file contents & path`;
      }

      suggestions.push({
        fileId: row.id,
        currentPath: row.absolute_path,
        suggestedFilename,
        suggestedCategory: targetCategory,
        reason,
      });
    }
  }

  const paginated = suggestions.slice(offset, offset + limit);

  return {
    suggestions: paginated,
    totalCount: suggestions.length,
  };
}
