export const DEFAULT_CATEGORIES = [
  { name: 'Academics', isSystem: true, colorHex: '#3B82F6' },
  { name: 'Work', isSystem: true, colorHex: '#10B981' },
  { name: 'Projects', isSystem: true, colorHex: '#8B5CF6' },
  { name: 'Personal', isSystem: true, colorHex: '#EC4899' },
  { name: 'Finance', isSystem: true, colorHex: '#F59E0B' },
  { name: 'Applications', isSystem: true, colorHex: '#06B6D4' },
  { name: 'Images', isSystem: true, colorHex: '#6366F1' },
  { name: 'Miscellaneous', isSystem: true, colorHex: '#64748B' },
] as const;

export type DefaultCategoryName = (typeof DEFAULT_CATEGORIES)[number]['name'];
