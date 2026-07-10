export function normalizeRaceName(name: unknown): string | null {
  if (typeof name !== 'string') {
    return null;
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return /[\p{L}\p{N}]/u.test(trimmed) ? trimmed : null;
}
