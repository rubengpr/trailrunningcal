export function sanitizeDescription(description: unknown): { value: string | null; error: string | null } {
  if (description === undefined || description === null) {
    return { value: null, error: null };
  }
  if (typeof description !== 'string') {
    return { value: null, error: 'Invalid input' };
  }
  const trimmed = description.trim();
  if (trimmed.length > 0 && (trimmed.length < 10 || trimmed.length > 2000)) {
    return { value: null, error: 'Invalid input' };
  }
  return { value: trimmed.length > 0 ? trimmed : null, error: null };
}
