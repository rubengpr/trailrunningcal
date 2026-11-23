export type LengthUnit = 'characters' | 'words';
export type LengthRange = { unit: LengthUnit; min: number; max: number };

// Single source for the editorial length targets shared by prompts, validators and the admin view.
export const lengthTargets = {
  title: [{ unit: 'characters', min: 40, max: 90 }],
  content: [{ unit: 'words', min: 1500, max: 2000 }],
  primaryKeyword: [{ unit: 'words', min: 2, max: 6 }],
  slug: [{ unit: 'words', min: 3, max: 8 }, { unit: 'characters', min: 1, max: 74 }],
  seoTitle: [{ unit: 'characters', min: 45, max: 60 }],
  metaDescription: [{ unit: 'characters', min: 140, max: 160 }],
} as const satisfies Record<string, readonly LengthRange[]>;

export type LengthField = keyof typeof lengthTargets;

export function lengthRange(field: LengthField, unit: LengthUnit): LengthRange {
  const range = lengthTargets[field].find(item => item.unit === unit);
  if (!range) throw new Error(`No ${unit} target for ${field}`);
  return range;
}

export function countLength(text: string, unit: LengthUnit): number {
  const value = text.trim();
  return unit === 'characters' ? Array.from(value).length : value.split(/[\s-]+/).filter(Boolean).length;
}

export function measureLength(field: LengthField, text: string) {
  return lengthTargets[field].map(range => {
    const count = countLength(text, range.unit);
    const inRange = count >= range.min && count <= range.max;
    const status = inRange ? 'within' : count * 10 >= range.min * 9 && count * 10 <= range.max * 11 ? 'near' : 'outside';
    return { ...range, count, inRange, status };
  });
}

const unitNames = { characters: 'caracteres', words: 'palabras' } as const;

// Spanish wording for prompts, e.g. "45–60 caracteres".
export function describeRange(field: LengthField, unit: LengthUnit): string {
  const { min, max } = lengthRange(field, unit);
  return `${min}–${max} ${unitNames[unit]}`;
}
