import { describe, expect, it } from 'vitest';
import { evaluateEditionSignal } from './edition-signal';

describe('evaluateEditionSignal', () => {
  it('accepts when the target year appears more than the previous year', () => {
    const result = evaluateEditionSignal({
      markdown: 'Inscripcions 2027 obertes. Recorreguts 2027. Edició 2026.',
      targetYear: 2027,
    });

    expect(result).toMatchObject({
      eligible: true,
      targetYearCount: 2,
      previousYearCount: 1,
      reason: 'Year signal accepted: 2027=2, 2026=1',
    });
  });

  it('skips when the target year is missing', () => {
    const result = evaluateEditionSignal({
      markdown: 'Classificacions 2026 i resultats de la cursa.',
      targetYear: 2027,
    });

    expect(result).toMatchObject({
      eligible: false,
      targetYearCount: 0,
      previousYearCount: 1,
      reason: 'Skipped: weak year signal: 2027=0, 2026=1',
    });
  });

  it('skips when target and previous year counts are equal', () => {
    const result = evaluateEditionSignal({
      markdown: 'Edició 2027. Resultats 2026.',
      targetYear: 2027,
    });

    expect(result).toMatchObject({
      eligible: false,
      targetYearCount: 1,
      previousYearCount: 1,
    });
  });

  it('skips when the target year appears fewer times than the previous year', () => {
    const result = evaluateEditionSignal({
      markdown: 'Resultats 2026. Fotos 2026. Nova data 2027.',
      targetYear: 2027,
    });

    expect(result).toMatchObject({
      eligible: false,
      targetYearCount: 1,
      previousYearCount: 2,
    });
  });

  it('ignores year references inside longer numbers', () => {
    const result = evaluateEditionSignal({
      markdown: 'Ref 120271 and 20270 should not count. Valid 2027 counts.',
      targetYear: 2027,
    });

    expect(result).toMatchObject({
      eligible: true,
      targetYearCount: 1,
      previousYearCount: 0,
    });
  });

  it('ignores crawl metadata frontmatter when counting year references', () => {
    const result = evaluateEditionSignal({
      markdown: `---
seedUrl: "https://www.femsui.cat"
generatedAt: "2026-06-25T21:58:35.280Z"
sources:
  - url: "https://www.femsui.cat/"
    generatedAt: "2026-06-25T21:58:35.280Z"
    status: 200
---

# Trail Fem Sui

Resultats 2025 i galeria de fotos.`,
      targetYear: 2026,
    });

    expect(result).toMatchObject({
      eligible: false,
      targetYearCount: 0,
      previousYearCount: 1,
      reason: 'Skipped: weak year signal: 2026=0, 2025=1',
    });
  });
});
