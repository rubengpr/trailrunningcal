import { describe, expect, it, vi } from 'vitest';
import { today, validDate, validateDetails, validateFile, maxImageBytes } from './publication';
const input = { author: ' Ruben Godoy ', date: '2026-10-28', imageAlt: ' Montserrat ', version: 0 };
describe('publication validation', () => {
  it('normalizes fields and accepts future editorial dates', () => {
    expect(validateDetails({ ...input, date: '2030-01-01' }, true)).toEqual({ ...input, author: 'Ruben Godoy', imageAlt: 'Montserrat', date: '2030-01-01' });
  });
  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-1-01', '', '0000-01-01'])('rejects impossible date %s', value => expect(validDate(value)).toBe(false));
  it('requires alt text only after an image exists', () => {
    expect(() => validateDetails({ ...input, imageAlt: '' }, false)).not.toThrow();
    expect(() => validateDetails({ ...input, imageAlt: ' ' }, true)).toThrow('invalid_alt');
  });
  it('validates field limits and nonempty authors', () => {
    expect(() => validateDetails({ ...input, author: ' ' }, false)).toThrow('invalid_author');
    expect(() => validateDetails({ ...input, author: 'a'.repeat(121) }, false)).toThrow('invalid_author');
    expect(() => validateDetails({ ...input, imageAlt: 'a'.repeat(301) }, false)).toThrow('invalid_alt');
  });
  it('uses Madrid date around UTC midnight', () => {
    vi.useFakeTimers();
    try { vi.setSystemTime(new Date('2026-10-27T23:30:00Z')); expect(today()).toBe('2026-10-28'); }
    finally { vi.useRealTimers(); }
  });
  it('rejects unsupported, empty and oversized files', () => {
    expect(() => validateFile(new File(['svg'], 'x.svg', { type: 'image/svg+xml' }))).toThrow('invalid_image');
    expect(() => validateFile(new File([], 'x.jpg', { type: 'image/jpeg' }))).toThrow('invalid_image');
    expect(() => validateFile(new File([new Uint8Array(maxImageBytes + 1)], 'x.png', { type: 'image/png' }))).toThrow('image_too_large');
  });
});
