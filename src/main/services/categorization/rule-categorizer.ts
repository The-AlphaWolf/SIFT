import type Database from 'better-sqlite3';

export interface FileCategorizationInput {
  filename: string;
  extension: string;
  relativePath?: string;
  absolutePath?: string;
}

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'tiff',
  'ico',
]);

const APP_EXTENSIONS = new Set([
  'exe',
  'msi',
  'bat',
  'cmd',
  'ps1',
  'apk',
  'app',
  'dmg',
  'iso',
  'deb',
  'rpm',
]);

const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'py',
  'rs',
  'go',
  'cpp',
  'c',
  'h',
  'java',
  'kt',
  'cs',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'yml',
  'toml',
  'sql',
]);

const ACADEMIC_KEYWORDS = [
  'academic',
  'academics',
  'lecture',
  'lectures',
  'course',
  'courses',
  'coursework',
  'syllabus',
  'curriculum',
  'semester',
  'sem',
  'sem1',
  'sem2',
  'sem3',
  'sem4',
  'sem5',
  'sem6',
  'sem7',
  'sem8',
  'ug1',
  'ug2',
  'ug3',
  'ug4',
  'assignment',
  'assignments',
  'homework',
  'exam',
  'exams',
  'examination',
  'midterm',
  'quiz',
  'test',
  'tests',
  'thesis',
  'dissertation',
  'textbook',
  'tutorial',
  'tutorials',
  'study',
  'studies',
  'study_material',
  'study_materials',
  'study_notes',
  'lecture_notes',
  'class_notes',
  'revision_notes',
  'exam_notes',
  'material',
  'materials',
  'lab',
  'experiment',
  'experiments',
  'solutions',
  'solution',
  'answers',
  'answer',
  'question',
  'questions',
  'question_paper',
  'question_papers',
  'module',
  'chapter',
  'unit',
  'handout',
  'workbook',
  'admit_card',
  'transcript',
  'transcripts',
  'aptitude',
  'cat',
  'gate',
  'college',
  'university',
  'network',
  'networks',
  'networking',
  'communication',
  'computer_network',
  'computer_networks',
  'antenna',
  'antennas',
  'microprocessor',
  'microcontroller',
  '8051',
  '8085',
  '8086',
  'coa',
  'microwave',
  'waveguide',
  'semiconductor',
  'cmos',
  'vlsi',
  'transistor',
  'physics',
  'calculus',
  'linear_algebra',
  'algebra',
  'signals',
  'dft',
  'dsp',
  'ieee',
  'ece',
  'cse',
  'vswr',
  'klystron',
  'radar',
];

const FINANCE_KEYWORDS = [
  'invoice',
  'invoices',
  'receipt',
  'receipts',
  'bill',
  'bills',
  'tax',
  'taxes',
  'statement',
  'statements',
  'salary',
  'payslip',
  'w2',
  '1099',
  'bank',
  'payment',
  'payments',
  'expense',
  'expenses',
  'financial',
  'ledger',
  'budget',
  'credit_card',
  'debit',
  'crypto',
  'gst',
  'itr',
];

const WORK_KEYWORDS = [
  'resume',
  'cv',
  'curriculum_vitae',
  'cover_letter',
  'job',
  'jobs',
  'offer_letter',
  'contract',
  'nda',
  'meeting',
  'minutes',
  'agenda',
  'standup',
  'client',
  'customer',
  'presentation',
  'pitch',
  'deck',
  'proposal',
  'timesheet',
  'appraisal',
  'portfolio',
  'placement',
];

const PROJECT_KEYWORDS = [
  'project',
  'projects',
  'repo',
  'repository',
  'source',
  'github',
  'gitlab',
  'sift',
  'architecture',
  'specs',
  'requirements',
  'wireframe',
  'mockup',
  'sprint',
  'roadmap',
  'changelog',
];

const PERSONAL_KEYWORDS = [
  'passport',
  'visa',
  'identity',
  'id_card',
  'aadhar',
  'ssn',
  'license',
  'medical',
  'health',
  'doctor',
  'prescription',
  'insurance',
  'vaccine',
  'family',
  'vacation',
  'ticket',
  'boarding_pass',
  'hotel',
  'certificate',
  'hobby',
];

function containsKeyword(text: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    const parts = kw.split(/[-_\s]+/);
    const escapedParts = parts.filter(Boolean).map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const pattern = escapedParts.join('[-_\\s]+');
    const regex = new RegExp(`(?:^|[^a-z0-9])${pattern}(?:$|[^a-z0-9])`, 'i');
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

export function categorizeFile(input: FileCategorizationInput): string {
  const ext = input.extension.toLowerCase().replace(/^\./, '');
  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'Images';
  }
  if (APP_EXTENSIONS.has(ext)) {
    return 'Applications';
  }

  // Combine full path and filename for inspection
  const combined = `${input.relativePath || ''} ${input.filename || ''} ${input.absolutePath || ''}`.toLowerCase();

  // Test keyword lists with word boundary matching
  if (containsKeyword(combined, FINANCE_KEYWORDS)) {
    return 'Finance';
  }
  if (containsKeyword(combined, WORK_KEYWORDS)) {
    return 'Work';
  }
  if (containsKeyword(combined, ACADEMIC_KEYWORDS)) {
    return 'Academics';
  }
  if (containsKeyword(combined, PROJECT_KEYWORDS)) {
    return 'Projects';
  }
  if (containsKeyword(combined, PERSONAL_KEYWORDS)) {
    return 'Personal';
  }

  // Developer code files without specific match -> Projects
  if (CODE_EXTENSIONS.has(ext)) {
    return 'Projects';
  }

  return 'Miscellaneous';
}

/**
 * Re-categorizes all non-deleted files in the database based on the latest rules.
 * Runs atomically inside a transaction.
 */
export function reCategorizeAllFiles(db: Database.Database): number {
  const rows = db
    .prepare(
      'SELECT id, filename, extension, relative_path as relativePath, absolute_path as absolutePath, category FROM files WHERE is_deleted = 0'
    )
    .all() as Array<{
    id: string;
    filename: string;
    extension: string;
    relativePath?: string;
    absolutePath?: string;
    category: string;
  }>;

  const updateStmt = db.prepare('UPDATE files SET category = ? WHERE id = ?');
  let updatedCount = 0;

  const tx = db.transaction(() => {
    for (const r of rows) {
      const newCat = categorizeFile({
        filename: r.filename,
        extension: r.extension,
        relativePath: r.relativePath,
        absolutePath: r.absolutePath,
      });
      if (newCat !== r.category) {
        updateStmt.run(newCat, r.id);
        updatedCount++;
      }
    }
  });

  tx();
  return updatedCount;
}
