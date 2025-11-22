// Small seeded PRNG utilities
const seed = "music-tier-seed-2025";

// Hash a string into a 32-bit integer seed
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0; // force unsigned
  };
}

// Simple fast PRNG from a 32-bit seed
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffles an array using a seed.
 *
 * Same `items` + same `seed` => exact same order every time.
 * Different seeds => different (but still deterministic) orders.
 */
export function seededShuffle<T>(items: T[]): T[] {
  const seedFn = xmur3(seed);
  const prng = mulberry32(seedFn());

  // Copy so we don't mutate the original array
  const arr = [...items];

  // Fisher–Yates shuffle using our seeded PRNG
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  if (arr.length !== items.length) {
    console.error("Seeded shuffle produced array of different length");
    return items;
  }
  for (const item of items) {
    if (!arr.includes(item)) {
      console.error(
        "Seeded shuffle is missing an item from the original array"
      );
      return items;
    }
  }
  for (let i = 0; i < items.length; i++) {
    if (typeof arr[i] === "undefined") {
      console.error("Seeded shuffle produced undefined item in array");
      return items;
    }
  }

  return arr;
}
