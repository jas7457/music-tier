import { describe, expect, it } from 'vitest';
import { findPath, freeSpot } from './pathing';
import { SPAWN, STATIONS, STATION_ORDER } from '../stations';

const at = (v: readonly number[]) => ({ x: v[0], z: v[2] });

describe('findPath', () => {
  it('walks straight when nothing is in the way', () => {
    expect(findPath({ x: 0, z: 0 }, { x: 1, z: 1 })).toEqual([{ x: 1, z: 1 }]);
  });

  it('detours round the DJ booth instead of walking through it', () => {
    const path = findPath({ x: -6.5, z: -3 }, { x: -6.5, z: 1.5 });
    expect(path.length).toBeGreaterThan(1);
    // every leg stays clear of the booth's footprint (x -6.55..-4.65)
    for (const point of path.slice(0, -1)) {
      expect(point.x < -6.5 || point.x > -4.7 || point.z < -2.4 || point.z > 1.6).toBe(true);
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
    const spot = freeSpot({ x: 0.5, z: -4.8 });
    expect(spot.z).toBeGreaterThan(-4.3);
  });

  it('keeps every station approach point clear of furniture', () => {
    for (const id of STATION_ORDER) {
      expect(freeSpot(at(STATIONS[id].approach))).toEqual(at(STATIONS[id].approach));
    }
  });
});
