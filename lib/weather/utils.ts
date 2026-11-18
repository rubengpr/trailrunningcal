export const maxQuestionLength = 2000;

export function parseLocation(argumentsText: string): string | null {
  let value: unknown;
  try {
    value = JSON.parse(argumentsText);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const location = 'location' in value ? value.location : undefined;
  if (typeof location !== 'string') return null;
  const trimmed = location.trim();
  return trimmed.length >= 2 && trimmed.length <= 200 ? trimmed : null;
}
