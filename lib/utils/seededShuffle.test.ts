import { describe, expect, it } from 'vitest';
import { seededShuffle } from './seededShuffle';

describe('seededShuffle', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('is deterministic', () => {
    expect(seededShuffle(items)).toEqual(seededShuffle(items));
  });

  it('keeps every item exactly once', () => {
    expect([...seededShuffle(items)].sort((a, b) => a - b)).toEqual(items);
  });

  it('actually reorders', () => {
    expect(seededShuffle(items)).not.toEqual(items);
  });

  it('does not mutate the input', () => {
    const copy = [...items];
    seededShuffle(items);
    expect(items).toEqual(copy);
  });

  it('handles empty and single-item arrays', () => {
    expect(seededShuffle([])).toEqual([]);
    expect(seededShuffle(['a'])).toEqual(['a']);
  });
});
