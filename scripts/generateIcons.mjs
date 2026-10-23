// Generates the app icons for the 3D venue: a cartoon disco ball (ink
// outline, neon facets) hanging in front of light beams on the club's dark
// purple, matching the venue's look.
//
//   node scripts/generateIcons.mjs
//
// Draws one SVG and rasterises it with sharp. Maskable icons shrink the art
// into the centre 80%, the part Android guarantees to show.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const INK = '#140c24';

// Small deterministic random, so the facets come out the same every run.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** The disco ball's mirror tiles: rows that narrow towards the poles. */
function facets(cx, cy, r) {
  const rand = seeded(11);
  const rows = 9;
  const tiles = [];
  for (let i = 0; i < rows; i++) {
    const lat0 = -Math.PI / 2 + (i / rows) * Math.PI;
    const lat1 = -Math.PI / 2 + ((i + 1) / rows) * Math.PI;
    const y0 = cy + Math.sin(lat0) * r;
    const y1 = cy + Math.sin(lat1) * r;
    const mid = (lat0 + lat1) / 2;
    const half = Math.cos(mid) * r;
    const count = Math.max(3, Math.round((Math.cos(mid) * 12) | 0));
    const w = (half * 2) / count;
    for (let j = 0; j < count; j++) {
      const x = cx - half + j * w;
      // light comes from the top left
      const nx = (x + w / 2 - cx) / r;
      const ny = ((y0 + y1) / 2 - cy) / r;
      const light = Math.max(0, 1 - Math.hypot(nx + 0.45, ny + 0.5) * 0.85);
      const roll = rand();
      let fill;
      if (roll > 0.9) fill = '#ff4fd8';
      else if (roll > 0.82) fill = '#38e1ff';
      else if (roll > 0.77) fill = '#ffe066';
      else {
        const l = Math.round(38 + light * 52);
        fill = `hsl(262 70% ${l}%)`;
      }
      tiles.push(
        `<rect x="${x + 1.5}" y="${y0 + 1.5}" width="${w - 3}" height="${y1 - y0 - 3}" rx="2.5" fill="${fill}"/>`,
      );
    }
  }
  return tiles.join('');
}

/** A four-pointed sparkle. */
function sparkle(x, y, size, color) {
  const s = size;
  const k = s * 0.22;
  return `<path d="M ${x} ${y - s} Q ${x + k} ${y - k} ${x + s} ${y} Q ${x + k} ${y + k} ${x} ${y + s} Q ${x - k} ${y + k} ${x - s} ${y} Q ${x - k} ${y - k} ${x} ${y - s} Z" fill="${color}" stroke="${INK}" stroke-width="${s * 0.12}" stroke-linejoin="round"/>`;
}

/** The whole icon as SVG; `scale` < 1 shrinks the art for maskable icons. */
function svg(scale = 1) {
  const size = 512;
  const cx = 256;
  const cy = 278;
  const r = 148;
  const art = `
    <g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">
      <!-- light beams behind the ball -->
      <path d="M 256 60 L 40 512 L 170 512 Z" fill="url(#beamPink)"/>
      <path d="M 256 60 L 472 512 L 342 512 Z" fill="url(#beamCyan)"/>
      <!-- string -->
      <rect x="250" y="0" width="12" height="${cy - r - 4}" rx="6" fill="${INK}"/>
      <rect x="236" y="${cy - r - 24}" width="40" height="28" rx="8" fill="#c9c4d6" stroke="${INK}" stroke-width="8"/>
      <!-- glow -->
      <circle cx="${cx}" cy="${cy}" r="${r + 34}" fill="url(#glow)"/>
      <!-- the ball -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#2a1650"/>
      <g clip-path="url(#ball)">${facets(cx, cy, r)}</g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#shade)"/>
      <ellipse cx="${cx - 58}" cy="${cy - 68}" rx="34" ry="20" fill="#fff" opacity="0.85" transform="rotate(-30 ${cx - 58} ${cy - 68})"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="14"/>
      ${sparkle(400, 150, 34, '#ffe066')}
      ${sparkle(118, 420, 24, '#38e1ff')}
      ${sparkle(420, 400, 18, '#ff4fd8')}
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="75%">
      <stop offset="0" stop-color="#3b1f73"/>
      <stop offset="0.55" stop-color="#1a1033"/>
      <stop offset="1" stop-color="#07050d"/>
    </radialGradient>
    <linearGradient id="beamPink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff4fd8" stop-opacity="0"/>
      <stop offset="1" stop-color="#ff4fd8" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="beamCyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#38e1ff" stop-opacity="0"/>
      <stop offset="1" stop-color="#38e1ff" stop-opacity="0.35"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0.75" stop-color="#ff4fd8" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff4fd8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shade" cx="35%" cy="30%" r="80%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#140c24" stop-opacity="0.6"/>
    </radialGradient>
    <clipPath id="ball"><circle cx="${cx}" cy="${cy}" r="${r - 2}"/></clipPath>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  ${art}
</svg>`;
}

const outDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'public',
);

const jobs = [
  ['icon-512.png', 512, 1],
  ['icon-192.png', 192, 1],
  ['icon-maskable-512.png', 512, 0.78],
  ['icon-maskable-192.png', 192, 0.78],
  ['apple-touch-icon.png', 180, 1],
  ['favicon-32.png', 32, 1],
];

for (const [file, size, scale] of jobs) {
  await sharp(Buffer.from(svg(scale)))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, file));
  console.log('wrote', file);
}
fs.writeFileSync(path.join(outDir, 'icon.svg'), svg(1));
console.log('wrote icon.svg');
