export const MIN_INSTRUCTION_LENGTH = 10;
export const MAX_INSTRUCTION_LENGTH = 5_000;

export function validateInstructions(value: string): 'tooShort' | 'tooLong' | null {
  const length = value.trim().length;
  if (length < MIN_INSTRUCTION_LENGTH) return 'tooShort';
  if (length > MAX_INSTRUCTION_LENGTH) return 'tooLong';
  return null;
}
