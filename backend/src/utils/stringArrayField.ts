import { ValueTransformer } from 'typeorm';

const normalizeArrayValues = (items: unknown[]): string[] =>
  items
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

export const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return normalizeArrayValues(value);
  }

  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value !== 'string') {
    return normalizeArrayValues([value]);
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '[object Object]') {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return normalizeArrayValues(parsed);
    }
  } catch {
    // Fall back to delimiter-based parsing for legacy plain-text values.
  }

  return trimmed
    .replace(/^\[|\]$/g, '')
    .split(/[,\uFF0C|;\r\n]+/)
    .map((item) => item.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
};

export const serializeStringArray = (value: unknown): string => JSON.stringify(normalizeStringArray(value));

export const stringArrayJsonTransformer: ValueTransformer = {
  to: (value: unknown) => serializeStringArray(value),
  from: (value: unknown) => normalizeStringArray(value),
};
