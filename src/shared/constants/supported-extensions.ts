export const TEXT_EXTRACTABLE_EXTENSIONS = [
  'pdf',
  'docx',
  'txt',
  'md',
  'markdown',
  'rtf',
  'csv',
  'json',
  'log',
] as const;

export const IMAGE_METADATA_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'svg',
] as const;

export const SUPPORTED_EXTENSIONS = [
  ...TEXT_EXTRACTABLE_EXTENSIONS,
  ...IMAGE_METADATA_EXTENSIONS,
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function isTextExtractable(ext: string): boolean {
  return TEXT_EXTRACTABLE_EXTENSIONS.includes(
    ext.toLowerCase().replace(/^\./, '') as any
  );
}

export function isSupportedExtension(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(
    ext.toLowerCase().replace(/^\./, '') as any
  );
}
