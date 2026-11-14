import { describe, it, expect } from 'vitest';
import { categorizeFile } from '../../../src/main/services/categorization/rule-categorizer';

describe('Rule Categorizer', () => {
  it('categorizes image extensions as Images', () => {
    expect(categorizeFile({ filename: 'photo1.jpg', extension: 'jpg' })).toBe('Images');
    expect(categorizeFile({ filename: 'icon.PNG', extension: '.png' })).toBe('Images');
    expect(categorizeFile({ filename: 'vector.svg', extension: 'svg' })).toBe('Images');
  });

  it('categorizes executables and installers as Applications', () => {
    expect(categorizeFile({ filename: 'installer.exe', extension: 'exe' })).toBe('Applications');
    expect(categorizeFile({ filename: 'setup.msi', extension: 'msi' })).toBe('Applications');
  });

  it('categorizes source code files as Projects', () => {
    expect(categorizeFile({ filename: 'index.ts', extension: 'ts' })).toBe('Projects');
    expect(categorizeFile({ filename: 'app.py', extension: 'py' })).toBe('Projects');
    expect(categorizeFile({ filename: 'server.rs', extension: 'rs' })).toBe('Projects');
  });

  it('identifies Finance documents via filename or path keywords', () => {
    expect(
      categorizeFile({
        filename: 'tax_invoice_2024.pdf',
        extension: 'pdf',
        relativePath: 'documents/bills/tax_invoice_2024.pdf',
      })
    ).toBe('Finance');

    expect(
      categorizeFile({
        filename: 'salary_slip_october.pdf',
        extension: 'pdf',
      })
    ).toBe('Finance');
  });

  it('identifies Academic documents via course & subject keywords', () => {
    expect(
      categorizeFile({
        filename: 'microwave_waveguide_lecture_notes.pdf',
        extension: 'pdf',
        relativePath: 'sem7/ece/microwave_waveguide_lecture_notes.pdf',
      })
    ).toBe('Academics');

    expect(
      categorizeFile({
        filename: 'cmos_vlsi_assignment2.docx',
        extension: 'docx',
      })
    ).toBe('Academics');
  });

  it('identifies Work documents via career keywords', () => {
    expect(
      categorizeFile({
        filename: 'john_doe_resume.docx',
        extension: 'docx',
      })
    ).toBe('Work');

    expect(
      categorizeFile({
        filename: 'placement_prep_questions.pdf',
        extension: 'pdf',
      })
    ).toBe('Work');
  });

  it('identifies Personal documents via personal identity / medical keywords', () => {
    expect(
      categorizeFile({
        filename: 'passport_scan.pdf',
        extension: 'pdf',
      })
    ).toBe('Personal');

    expect(
      categorizeFile({
        filename: 'health_insurance_policy.pdf',
        extension: 'pdf',
      })
    ).toBe('Personal');
  });

  it('falls back to Miscellaneous when no patterns or keywords match', () => {
    expect(
      categorizeFile({
        filename: 'random_notes_unrelated.txt',
        extension: 'txt',
      })
    ).toBe('Miscellaneous');
  });
});
