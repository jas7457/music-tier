import { describe, expect, it } from 'vitest';
import type { PopulatedUser } from '../types';
import { getPlaces, getPlaceString } from './getPlaces';

const user = (index: number) => ({ index }) as PopulatedUser;
const entry = (index: number, points: number, wins = 0) => ({
  user: user(index),
  points,
  wins,
});

describe('getPlaces', () => {
  it('sorts by points descending', () => {
    const result = getPlaces([entry(0, 5), entry(1, 10), entry(2, 7)]);
    expect(result.map((r) => r.points)).toEqual([10, 7, 5]);
    expect(result.map((r) => r.place)).toEqual([1, 2, 3]);
  });

  it('gives tied points the same place and skips the next', () => {
    const result = getPlaces([entry(0, 10), entry(1, 10), entry(2, 5)]);
    expect(result.map((r) => r.place)).toEqual([1, 1, 3]);
  });

  it('handles ties further down', () => {
    const result = getPlaces([entry(0, 10), entry(1, 5), entry(2, 5)]);
    expect(result.map((r) => r.place)).toEqual([1, 2, 2]);
  });

  it('breaks point ties by wins, then user index, for ordering', () => {
    const result = getPlaces([
      entry(2, 10, 1),
      entry(1, 10, 3),
      entry(0, 10, 1),
    ]);
    expect(result.map((r) => r.user.index)).toEqual([1, 0, 2]);
  });

  it('returns an empty array for no entries', () => {
    expect(getPlaces([])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = [entry(0, 1), entry(1, 2)];
    getPlaces(input);
    expect(input.map((e) => e.points)).toEqual([1, 2]);
  });
});

describe('getPlaceString', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [101, '101st'],
    [111, '111th'],
  ])('%i -> %s', (place, expected) => {
    expect(getPlaceString(place)).toBe(expected);
  });
});
