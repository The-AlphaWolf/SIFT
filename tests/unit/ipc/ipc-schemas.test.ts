import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as path from 'path';
import { IPC_CHANNELS } from '../../../src/shared/contracts/ipc-api';
import {
  isSupportedExtension,
  isTextExtractable,
} from '../../../src/shared/constants/supported-extensions';

// Mirrors the schema in folder-ipc.ts
const addFolderSchema = z.object({
  folderPath: z
    .string()
    .min(1, 'Folder path cannot be empty')
    .refine((p) => path.isAbsolute(p), 'Must be an absolute path')
    .refine((p) => !p.includes('..'), 'Path traversal sequences not allowed'),
});

// Mirrors the schema in ai-ipc.ts
const aiConfigSchema = z.object({
  provider: z.enum(['ollama', 'lmstudio']),
  baseUrl: z.string().url('Invalid endpoint URL'),
  model: z.string().min(1, 'Model name cannot be empty'),
  timeoutMs: z.number().int().min(1000).max(60000),
});

describe('IPC Validation Schemas & Contracts', () => {
  it('should ensure all IPC channel names are unique', () => {
    const channelValues = Object.values(IPC_CHANNELS);
    const uniqueValues = new Set(channelValues);
    expect(channelValues.length).toBe(uniqueValues.size);
    expect(channelValues.length).toBeGreaterThan(10);
  });

  describe('addFolderSchema validation', () => {
    it('should accept valid Windows absolute paths', () => {
      const validPath = 'D:\\Library\\TestFolder';
      const result = addFolderSchema.safeParse({ folderPath: validPath });
      expect(result.success).toBe(true);
    });

    it('should reject relative paths', () => {
      const relativePath = './test/relative';
      const result = addFolderSchema.safeParse({ folderPath: relativePath });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Must be an absolute path');
      }
    });

    it('should reject path traversal sequences', () => {
      const traversalPath = 'D:\\Library\\..\\Windows';
      const result = addFolderSchema.safeParse({ folderPath: traversalPath });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Path traversal');
      }
    });

    it('should reject empty strings', () => {
      const result = addFolderSchema.safeParse({ folderPath: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('aiConfigSchema validation', () => {
    it('should accept valid Ollama configuration', () => {
      const validConfig = {
        provider: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'qwen2.5:3b',
        timeoutMs: 10000,
      };
      const result = aiConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should accept valid LM Studio configuration', () => {
      const validConfig = {
        provider: 'lmstudio',
        baseUrl: 'http://127.0.0.1:1234',
        model: 'phi-3.5-mini',
        timeoutMs: 5000,
      };
      const result = aiConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject unsupported provider', () => {
      const invalidConfig = {
        provider: 'cloud-openai',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'gpt-4',
        timeoutMs: 5000,
      };
      const result = aiConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject invalid base URL', () => {
      const invalidConfig = {
        provider: 'ollama',
        baseUrl: 'not-a-valid-url',
        model: 'qwen2.5:3b',
        timeoutMs: 5000,
      };
      const result = aiConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Extension utilities', () => {
    it('should recognize text-extractable extensions', () => {
      expect(isTextExtractable('pdf')).toBe(true);
      expect(isTextExtractable('.PDF')).toBe(true);
      expect(isTextExtractable('docx')).toBe(true);
      expect(isTextExtractable('.txt')).toBe(true);
      expect(isTextExtractable('md')).toBe(true);
      expect(isTextExtractable('exe')).toBe(false);
    });

    it('should recognize all supported extensions including images', () => {
      expect(isSupportedExtension('png')).toBe(true);
      expect(isSupportedExtension('.jpg')).toBe(true);
      expect(isSupportedExtension('pdf')).toBe(true);
      expect(isSupportedExtension('bat')).toBe(false);
    });
  });
});
