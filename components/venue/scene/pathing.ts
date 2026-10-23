import { ROOM_HALF } from '../stations';

/**
 * Tiny floor-plan pathfinding: the room is open apart from a few pieces of
 * furniture (axis-aligned boxes on the floor). Walk straight when the way is
 * clear, otherwise detour round the corners of whatever is in the way.
 */

type Point = { x: number; z: number };
type Box = { x1: number; z1: number; x2: number; z2: number };

const MARGIN = 0.35;

// Footprints of the furniture, in room coordinates (see scene/Stations.tsx,
// whose set pieces are moved by STATIONS[id].shift, and scene/Decor.tsx).
const OBSTACLES: Box[] = [
  { x1: -2.7, z1: -11, x2: 2.7, z2: -8.3 }, // stage
  { x1: -10.2, z1: -3.3, x2: -9, z2: 0.05 }, // DJ booth + crate
  { x1: 5.3, z1: 5.8, x2: 6.8, z2: 7.2 }, // ballot box
  { x1: 0.6, z1: 9.1, x2: 3.8, z2: 10.1 }, // couch
  { x1: -11, z1: 2.8, x2: -9, z2: 6.1 }, // record shelf + crates
  { x1: -8.8, z1: -10.6, x2: -6.2, z2: -9.7 }, // lineup podium
  { x1: 7.8, z1: -10.7, x2: 9.2, z2: -9.7 }, // jukebox
  { x1: 7.8, z1: -1.7, x2: 9.2, z2: -0.3 }, // corkboard
  { x1: -5.5, z1: -5.5, x2: -4.5, z2: -4.5 }, // speaker stacks
  { x1: 4.5, z1: -5.5, x2: 5.5, z2: -4.5 },
  { x1: -5.5, z1: 4.5, x2: -4.5, z2: 5.5 },
  { x1: 8.3, z1: 1.4, x2: 10.4, z2: 6.2 }, // bar
  { x1: 3.4, z1: -10.9, x2: 5.9, z2: -9.9 }, // arcade
  { x1: -6.5, z1: 7.2, x2: -4.7, z2: 8 }, // lounge tables
  { x1: 5.5, z1: -5.6, x2: 7.3, z2: -4.8 },
  { x1: -10, z1: 8.1, x2: -7.6, z2: 8.5 }, // velvet rope
  { x1: -3.5, z1: -8.1, x2: -2.9, z2: -7.5 }, // balloons
  { x1: 2.9, z1: -8.1, x2: 3.5, z2: -7.5 },
].map((box) => ({
  x1: box.x1 - MARGIN,
  z1: box.z1 - MARGIN,
  x2: box.x2 + MARGIN,
  z2: box.z2 + MARGIN,
}));

function inside(p: Point, box: Box) {
  return p.x > box.x1 && p.x < box.x2 && p.z > box.z1 && p.z < box.z2;
}

/** Liang–Barsky: does the segment a→b pass through the box's interior? */
function crosses(a: Point, b: Point, box: Box) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let t0 = 0;
  let t1 = 1;
  const edges: Array<[number, number]> = [
    [-dx, a.x - box.x1],
    [dx, box.x2 - a.x],
    [-dz, a.z - box.z1],
    [dz, box.z2 - a.z],
  ];
  for (const [p, q] of edges) {
    if (Math.abs(p) < 1e-9) {
      if (q <= 0) {
        return false;
      }
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  // touching an edge or corner doesn't count
  return t1 - t0 > 1e-4;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Moves a point that landed inside furniture to the nearest free edge. */
export function freeSpot(p: Point): Point {
  for (const box of OBSTACLES) {
    if (!inside(p, box)) {
      continue;
    }
    const options: Point[] = [
      { x: box.x1 - 0.01, z: p.z },
      { x: box.x2 + 0.01, z: p.z },
      { x: p.x, z: box.z1 - 0.01 },
      { x: p.x, z: box.z2 + 0.01 },
    ];
    return options.sort((a, b) => distance(a, p) - distance(b, p))[0];
  }
  return p;
}

function firstBlocker(a: Point, b: Point) {
  return OBSTACLES.find((box) => !inside(a, box) && crosses(a, b, box));
}

/** Waypoints from start to goal (excluding start, including goal). */
export function findPath(start: Point, goal: Point, depth = 0): Point[] {
  const blocker = firstBlocker(start, goal);
  if (!blocker || depth > 3) {
    return [goal];
  }
  const corners: Point[] = [
    { x: blocker.x1 - 0.02, z: blocker.z1 - 0.02 },
    { x: blocker.x2 + 0.02, z: blocker.z1 - 0.02 },
    { x: blocker.x1 - 0.02, z: blocker.z2 + 0.02 },
    { x: blocker.x2 + 0.02, z: blocker.z2 + 0.02 },
  ];
  let best: Point[] | null = null;
  let bestLength = Infinity;
  for (const corner of corners) {
    if (Math.abs(corner.x) > ROOM_HALF - 0.2 || Math.abs(corner.z) > ROOM_HALF - 0.2) {
      continue;
    }
    if (crosses(start, corner, blocker)) {
      continue;
    }
    const rest = findPath(corner, goal, depth + 1);
    const path = [...findPath(start, corner, depth + 1), ...rest];
    let length = 0;
    let previous = start;
    for (const point of path) {
      length += distance(previous, point);
      previous = point;
    }
    if (length < bestLength) {
      bestLength = length;
      best = path;
    }
  }
  return best ?? [goal];
}

const ROOM_LIMIT = ROOM_HALF - 0.4;

/** Whether a spot on the floor is walkable (inside the room, not furniture). */
export function isWalkable(p: Point): boolean {
  if (Math.abs(p.x) > ROOM_LIMIT || Math.abs(p.z) > ROOM_LIMIT) {
    return false;
  }
  return !OBSTACLES.some((box) => inside(p, box));
}

/**
 * One step of free movement (keyboard): goes as far as it can and slides
 * along walls and furniture instead of stopping dead.
 */
export function stepTowards(from: Point, dx: number, dz: number): Point {
  const full = { x: from.x + dx, z: from.z + dz };
  if (isWalkable(full)) {
    return full;
  }
  const alongX = { x: from.x + dx, z: from.z };
  if (dx !== 0 && isWalkable(alongX)) {
    return alongX;
  }
  const alongZ = { x: from.x, z: from.z + dz };
  if (dz !== 0 && isWalkable(alongZ)) {
    return alongZ;
  }
  return from;
}
