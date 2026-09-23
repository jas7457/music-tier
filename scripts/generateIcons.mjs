// Generates the Game Boy–style app icons from a 32×32 pixel-art sprite.
//
//   node scripts/generateIcons.mjs
//
// The sprite is scaled with nearest-neighbour so every art pixel stays a crisp
// square. Colours are the four shades the in-app LCD produces (Classic palette).
// Artwork is kept inside the centre ~80% so Android's maskable crop is safe.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PALETTE = {
  '.': [205, 228, 165], // lit pixel (screen background)
  a: [142, 171, 115], // light
  b: [78, 113, 65], // dark
  '#': [15, 56, 15], // darkest
};

// Left half of the headphones; mirrored to make the full, symmetric sprite.
// prettier-ignore
const LEFT_HALF = [
  '...........#####',
  '.........##aaaaa',
  '........#aa#####',
  '.......#a##.....',
  '......#a#.......',
  '.....#a#........',
  '.....#a#........',
  '.....#a#........',
  '.....#a#........',
  '....##a##.......',
  '...#######......',
  '..#aaaaaa##.....',
  '..#.aaaab##.....',
  '..#.aaaab##.....',
  '..#.aaaab##.....',
  '..#.aaaab##.....',
  '..#.aaaab##.....',
  '..#.aaaab##.....',
  '..#aaaaab##.....',
  '...#######......',
];

// One bold "P" glyph (5×6); stamped twice, 2 cells apart, centred on the grid.
// prettier-ignore
const P = [
  '####.',
  '##.##',
  '##.##',
  '####.',
  '##...',
  '##...',
];
const LETTERS = P.map((row) => `${row}..${row}`);

const TOP = 6; // first sprite row on the 32×32 grid
const LETTERS_AT = { x: 10, y: TOP + 4 }; // 12 wide → cols 10–21, dead centre

const SPRITE = Array.from({ length: 32 }, (_, y) => {
  const half = LEFT_HALF[y - TOP];
  const row = half
    ? (half + [...half].reverse().join('')).split('')
    : Array(32).fill('.');
  const letterRow = LETTERS[y - LETTERS_AT.y];
  if (letterRow) {
    [...letterRow].forEach((c, i) => {
      if (c !== '.') row[LETTERS_AT.x + i] = c;
    });
  }
  return row.join('');
});

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixelAt) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * `pad` adds background cells around the 32×32 sprite. Maskable icons need it:
 * Android may crop to a circle, and only the centre 80% is guaranteed visible.
 */
function render(size, pad = 0) {
  const grid = SPRITE.length + pad * 2;
  // Whole-number scale so every art pixel is an identical square; the leftover
  // is split evenly as background margin (the background is flat, so it's
  // invisible).
  const scale = Math.floor(size / grid);
  const offset = Math.floor((size - scale * grid) / 2);
  return encodePng(size, (x, y) => {
    const gx = Math.floor((x - offset) / scale) - pad;
    const gy = Math.floor((y - offset) / scale) - pad;
    return PALETTE[SPRITE[gy]?.[gx]] ?? PALETTE['.'];
  });
}

for (const row of SPRITE) {
  if (row.length !== 32) throw new Error(`Sprite row is ${row.length} wide`);
}

const outDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'public',
);
for (const [file, size, pad] of [
  ['icon-512.png', 512, 0],
  ['icon-192.png', 192, 0],
  ['icon-maskable-512.png', 512, 4],
  ['icon-maskable-192.png', 192, 4],
  ['apple-touch-icon.png', 180, 0],
  ['favicon-32.png', 32, 0],
]) {
  fs.writeFileSync(path.join(outDir, file), render(size, pad));
  console.log('wrote', file);
}
