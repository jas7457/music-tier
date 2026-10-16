import { describe, expect, it } from 'vitest';
import { getFormattedPhoneNumber } from './phone';

describe('getFormattedPhoneNumber', () => {
  it.each([
    ['5551234567', '5551234567'],
    ['(555) 123-4567', '5551234567'],
    ['555-123-4567', '5551234567'],
    ['+1 555 123 4567', '15551234567'],
  ])('accepts %s', (input, expected) => {
    expect(getFormattedPhoneNumber(input)).toBe(expected);
  });

  it.each([
    ['too short', '555123'],
    ['too long', '123456789012'],
    ['letters', '555-CALL-NOW'],
    ['empty', ''],
  ])('rejects %s', (_label, input) => {
    expect(getFormattedPhoneNumber(input)).toBe('');
  });
});
