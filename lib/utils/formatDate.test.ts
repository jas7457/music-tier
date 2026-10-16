import { describe, expect, it } from 'vitest';
import { formatDate, formatDateWithTime } from './formatDate';

// 2025-01-01T03:00:00Z is still Dec 31 in New York.
const NEW_YEAR_3AM_UTC = Date.UTC(2025, 0, 1, 3, 0);

describe('formatDate', () => {
  it('always formats in America/New_York', () => {
    expect(formatDate(NEW_YEAR_3AM_UTC)).toBe('Dec 31');
  });

  it('accepts extra options', () => {
    expect(formatDate(NEW_YEAR_3AM_UTC, { year: 'numeric' })).toBe(
      'Dec 31, 2024',
    );
  });
});

describe('formatDateWithTime', () => {
  it('includes the full date and New York time', () => {
    expect(formatDateWithTime(NEW_YEAR_3AM_UTC)).toBe(
      'December 31, 2024 at 10:00 PM',
    );
  });
});
