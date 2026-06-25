export interface EditionSignalInput {
  markdown: string;
  targetYear: number;
}

export interface EditionSignalResult {
  eligible: boolean;
  targetYear: number;
  previousYear: number;
  targetYearCount: number;
  previousYearCount: number;
  reason: string;
}

function countStandaloneYearReferences(text: string, year: number): number {
  const matches = text.match(new RegExp(`(?<!\\d)${year}(?!\\d)`, 'g'));
  return matches?.length ?? 0;
}

export function evaluateEditionSignal(
  input: EditionSignalInput,
): EditionSignalResult {
  const previousYear = input.targetYear - 1;
  const targetYearCount = countStandaloneYearReferences(
    input.markdown,
    input.targetYear,
  );
  const previousYearCount = countStandaloneYearReferences(
    input.markdown,
    previousYear,
  );
  const eligible = targetYearCount > previousYearCount;

  return {
    eligible,
    targetYear: input.targetYear,
    previousYear,
    targetYearCount,
    previousYearCount,
    reason: eligible
      ? `Year signal accepted: ${input.targetYear}=${targetYearCount}, ${previousYear}=${previousYearCount}`
      : `Skipped: weak year signal: ${input.targetYear}=${targetYearCount}, ${previousYear}=${previousYearCount}`,
  };
}
