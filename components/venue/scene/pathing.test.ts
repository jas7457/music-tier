import { describe, expect, it } from 'vitest';
import { findPath, freeSpot, isWalkable, stepTowards } from './pathing';
import { SPAWN, STATIONS, STATION_ORDER } from '../stations';

const at = (v: readonly number[]) => ({ x: v[0], z: v[2] });

describe('findPath', () => {
  it('walks straight when nothing is in the way', () => {
    expect(findPath({ x: 0, z: 0 }, { x: 1, z: 1 })).toEqual([{ x: 1, z: 1 }]);
  });

  it('detours round the DJ booth instead of walking through it', () => {
    // straight up the wall side, which the booth (x -10.2..-9, z -3.3..0) blocks
    const path = findPath({ x: -9.6, z: -5 }, { x: -9.6, z: 2 });
    expect(path.length).toBeGreaterThan(1);
    // every corner it turns at is clear of the booth's footprint (+ margin)
    for (const point of path.slice(0, -1)) {
      expect(
        point.x < -10.55 || point.x > -8.65 || point.z < -3.65 || point.z > 0.4,
      ).toBe(true);
    }
  });

  it('reaches every station from the entrance', () => {
    for (const id of STATION_ORDER) {
      const goal = at(STATIONS[id].approach);
      const path = findPath(at(SPAWN), goal);
      expect(path.at(-1)).toEqual(goal);
    }
  });
});

describe('freeSpot', () => {
  it('leaves free floor alone', () => {
    expect(freeSpot({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
  });

  it('pushes a tap on the stage to its edge', () => {
    const spot = freeSpot({ x: 0, z: -9 });
    expect(spot.z).toBeGreaterThan(-8.3);
  });

  it('keeps every station approach point clear of furniture', () => {
    for (const id of STATION_ORDER) {
      expect(freeSpot(at(STATIONS[id].approach))).toEqual(at(STATIONS[id].approach));
    }
  });
});

describe('stepTowards', () => {
  it('moves freely on open floor', () => {
    expect(stepTowards({ x: 0, z: 0 }, 0.1, 0.1)).toEqual({ x: 0.1, z: 0.1 });
  });

  it('stops at the walls', () => {
    expect(stepTowards({ x: 10.55, z: 0 }, 0.2, 0)).toEqual({ x: 10.55, z: 0 });
  });

  it('slides along furniture instead of stopping', () => {
    // just in front of the stage's edge (z -7.95 with margin), pushing
    // diagonally into it
    const next = stepTowards({ x: 0, z: -7.9 }, 0.1, -0.1);
    expect(next).toEqual({ x: 0.1, z: -7.9 });
  });

  it('agrees with isWalkable', () => {
    expect(isWalkable({ x: 0, z: 0 })).toBe(true);
    expect(isWalkable({ x: 0, z: -9.5 })).toBe(false); // on the stage
    expect(isWalkable({ x: 13, z: 0 })).toBe(false); // outside the room
  });
});
