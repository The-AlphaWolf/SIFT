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
  'syllabus',
  'semester',
  'assignment',
  'assignments',
  'homework',
  'exam',
  'midterm',
  'quiz',
  'thesis',
  'dissertation',
  'textbook',
  'curriculum',
  'microwave',
  'waveguide',
  'semiconductor',
  'cmos',
  'vlsi',
  'transistor',
  'physics',
  'calculus',
  'linear_algebra',
  'signals',
  'dft',
  'dsp',
  'ieee',
  'ece',
  'cse',
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
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
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
  if (containsKeyword(combined, ACADEMIC_KEYWORDS)) {
    return 'Academics';
  }
  if (containsKeyword(combined, WORK_KEYWORDS)) {
    return 'Work';
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
