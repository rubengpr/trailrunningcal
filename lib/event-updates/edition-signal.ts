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

function stripLeadingFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

export function evaluateEditionSignal(
  input: EditionSignalInput,
): EditionSignalResult {
  const websiteContent = stripLeadingFrontmatter(input.markdown);
  const previousYear = input.targetYear - 1;
  const targetYearCount = countStandaloneYearReferences(
    websiteContent,
    input.targetYear,
  );
  const previousYearCount = countStandaloneYearReferences(
    websiteContent,
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
