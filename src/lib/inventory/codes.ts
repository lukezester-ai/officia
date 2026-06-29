export type ProductCodeType = 'ean' | 'sku' | 'supplier' | 'internal' | 'other';

export function normalizeProductCode(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

export function detectCodeType(code: string): ProductCodeType {
  const digits = code.replace(/\D/g, '');

  if (/^\d{8}$/.test(digits) || /^\d{12,14}$/.test(digits)) {
    return 'ean';
  }

  if (/^[A-Z0-9][A-Z0-9\-_.]{0,31}$/i.test(code)) {
    return 'sku';
  }

  return 'internal';
}

export function codeLookupVariants(raw: string): string[] {
  const normalized = normalizeProductCode(raw);
  if (!normalized) return [];

  const variants = new Set<string>([normalized, normalized.toUpperCase(), normalized.toLowerCase()]);

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly && digitsOnly !== normalized) {
    variants.add(digitsOnly);
  }

  return [...variants];
}
