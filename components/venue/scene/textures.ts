import * as THREE from 'three';
import { useEffect, useMemo, useState } from 'react';

/**
 * Canvas-drawn textures, so the scene needs no font or model downloads.
 */

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function finish(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const FONT =
  "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Wraps text into at most maxLines lines that fit maxWidth. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) {
    lines.push(line);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/.{0,2}$/, '…');
    return kept;
  }
  return lines;
}

/** Glowing neon text on a transparent background. */
export function neonTexture({
  text,
  color,
  width = 1024,
  height = 256,
  fontSize = 120,
  maxLines = 1,
  weight = 800,
}: {
  text: string;
  color: string;
  width?: number;
  height?: number;
  fontSize?: number;
  maxLines?: number;
  weight?: number;
}) {
  const { canvas, ctx } = makeCanvas(width, height);
  // shrink until the whole text fits in maxLines, then wrap (and only
  // truncate if even the smallest size doesn't fit)
  let size = fontSize;
  const fits = () => {
    const all = wrap(ctx, text, width * 0.92, 99);
    return (
      all.length <= maxLines &&
      all.length * size * 1.1 <= height * 0.92 &&
      all.every((line) => ctx.measureText(line).width <= width * 0.95)
    );
  };
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (size > 28 && !fits()) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  const lines = wrap(ctx, text, width * 0.92, maxLines);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = size * 1.1;
  const top = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  for (const pass of [28, 14, 4]) {
    ctx.shadowColor = color;
    ctx.shadowBlur = pass;
    ctx.fillStyle = pass === 4 ? '#ffffff' : color;
    lines.forEach((line, i) => ctx.fillText(line, width / 2, top + i * lineHeight));
  }
  return finish(canvas);
}

/** A printed card: dark text on a colored paper background. */
export function cardTexture({
  title,
  lines = [],
  background,
  ink = '#1a1325',
  width = 512,
  height = 640,
}: {
  title: string;
  lines?: string[];
  background: string;
  ink?: string;
  width?: number;
  height?: number;
}) {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 ${Math.round(width * 0.1)}px ${FONT}`;
  const titleLines = wrap(ctx, title.toUpperCase(), width * 0.86, 2);
  let y = height * 0.08;
  for (const line of titleLines) {
    ctx.fillText(line, width / 2, y);
    y += width * 0.115;
  }
  y += width * 0.04;
  lines.forEach((line, i) => {
    const size = Math.max(width * 0.05, width * (0.085 - i * 0.008));
    ctx.font = `${i === 0 ? 800 : 600} ${Math.round(size)}px ${FONT}`;
    const wrapped = wrap(ctx, line, width * 0.86, 1);
    ctx.fillText(wrapped[0] ?? '', width / 2, y);
    y += size * 1.35;
  });
  return finish(canvas);
}

/** Round avatar fallback: initial on a colored disc. */
export function initialTexture(initial: string, color: string) {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 64px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 64, 68);
  return finish(canvas);
}

/** Crops an image into a circle (for faces). */
function circleTexture(image: HTMLImageElement) {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.clip();
  const side = Math.min(image.width, image.height);
  ctx.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    128,
    128,
  );
  return finish(canvas);
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImageFrom(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Whether each host serves CORS-readable images, learned from its first image
// so the rest of that host's images don't each fail once first.
const hostAllowsCors = new Map<string, Promise<boolean>>();

function loadImage(url: string) {
  let promise = imageCache.get(url);
  if (!promise) {
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return '';
      }
    })();
    // Same-origin image optimizer for hosts without CORS (allowed hosts are
    // listed in next.config.js).
    const viaProxy = () =>
      loadImageFrom(`/_next/image?url=${encodeURIComponent(url)}&w=256&q=75`);
    const known = hostAllowsCors.get(host);
    if (known) {
      promise = known.then((allows) => (allows ? loadImageFrom(url) : viaProxy()));
    } else {
      const direct = loadImageFrom(url);
      hostAllowsCors.set(
        host,
        direct.then(
          () => true,
          () => false,
        ),
      );
      promise = direct.catch(viaProxy);
    }
    // forget failures so a later visit can retry
    promise.catch(() => imageCache.delete(url));
    imageCache.set(url, promise);
  }
  return promise;
}

/**
 * Loads a remote image as a texture without suspending. Returns the fallback
 * until it arrives (or forever, if it fails or isn't CORS-readable).
 */
export function useImageTexture(
  url: string | null | undefined,
  options: { circle?: boolean; fallback?: THREE.Texture | null } = {},
) {
  const { circle = false, fallback = null } = options;
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }
    let cancelled = false;
    let created: THREE.Texture | null = null;
    loadImage(url)
      .then((image) => {
        if (cancelled) {
          return;
        }
        if (circle) {
          created = circleTexture(image);
        } else {
          created = new THREE.Texture(image);
          created.colorSpace = THREE.SRGBColorSpace;
          created.anisotropy = 4;
          created.needsUpdate = true;
        }
        setTexture(created);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      created?.dispose();
      setTexture(null);
    };
  }, [url, circle]);

  return texture ?? fallback;
}

/** Memoised canvas texture that's disposed when its inputs change. */
export function useCanvasTexture(
  factory: () => THREE.Texture,
  deps: React.DependencyList,
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(factory, deps);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export const AVATAR_COLORS = [
  '#6d5dfc',
  '#ec4899',
  '#10b981',
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
  '#f59e0b',
  '#14b8a6',
  '#6366f1',
  '#d946ef',
];

/** Three music-note glyphs in a row, one per 128px cell (for sprite atlases). */
export function noteAtlasTexture() {
  const { canvas, ctx } = makeCanvas(384, 128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 96px ${FONT}`;
  ['♪', '♫', '♬'].forEach((glyph, i) => {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(glyph, 64 + i * 128, 68);
  });
  return finish(canvas);
}

/**
 * A festival gig poster of the standings: the leader headlines in huge red
 * type, the next two co-headline, everyone else is a "special guest".
 */
export function lineupPosterTexture({
  leagueTitle,
  acts,
}: {
  leagueTitle: string;
  acts: Array<{ name: string; points: number; place: number }>;
}) {
  const width = 768;
  const height = 960;
  const { canvas, ctx } = makeCanvas(width, height);

  // paper with a warm gradient and halftone dots
  const paper = ctx.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, '#fff3d6');
  paper.addColorStop(1, '#f7c9b4');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  for (let y = 12; y < height; y += 22) {
    for (let x = 12 + ((y / 22) % 2) * 11; x < width; x += 22) {
      const fade = y / height;
      ctx.fillStyle = `rgba(214, 64, 92, ${0.05 + fade * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + fade * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // double border
  ctx.strokeStyle = '#1d1430';
  ctx.lineWidth = 10;
  ctx.strokeRect(22, 22, width - 44, height - 44);
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // "<league> presents"
  ctx.fillStyle = '#1d1430';
  ctx.font = `800 26px ${FONT}`;
  const presents = `${leagueTitle.toUpperCase()} PRESENTS`;
  ctx.fillText(
    wrap(ctx, presents, width - 140, 1)[0] ?? '',
    width / 2,
    100,
  );

  // banner
  ctx.save();
  ctx.translate(width / 2, 150);
  ctx.rotate(-0.025);
  ctx.fillStyle = '#1d1430';
  ctx.fillRect(-250, -34, 500, 56);
  ctx.fillStyle = '#ffd34d';
  ctx.font = `900 30px ${FONT}`;
  ctx.fillText('★  THE LINEUP  ★', 0, 6);
  ctx.restore();

  const fitText = (text: string, maxWidth: number, size: number, weight = 900) => {
    let s = size;
    ctx.font = `${weight} ${s}px ${FONT}`;
    while (ctx.measureText(text).width > maxWidth && s > 18) {
      s -= 2;
      ctx.font = `${weight} ${s}px ${FONT}`;
    }
    return s;
  };

  if (acts.length === 0) {
    ctx.fillStyle = '#d6405c';
    fitText('LINEUP TBA', width - 140, 110);
    ctx.fillText('LINEUP TBA', width / 2, 470);
    ctx.fillStyle = '#1d1430';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText('Results after round one', width / 2, 530);
    return finish(canvas);
  }

  let y = 250;
  const [headliner, ...rest] = acts;

  // headliner
  ctx.fillStyle = '#d6405c';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText('H E A D L I N I N G', width / 2, y - 22);
  const headSize = fitText(headliner.name.toUpperCase(), width - 130, 150);
  y += headSize * 0.82;
  // drop shadow for the poster-print look
  ctx.fillStyle = '#1d1430';
  ctx.fillText(headliner.name.toUpperCase(), width / 2 + 5, y + 5);
  ctx.fillStyle = '#d6405c';
  ctx.fillText(headliner.name.toUpperCase(), width / 2, y);
  ctx.fillStyle = '#1d1430';
  ctx.font = `800 28px ${FONT}`;
  y += 46;
  ctx.fillText(`${headliner.points} PTS`, width / 2, y);

  // co-headliners
  const coHeads = rest.slice(0, 2);
  if (coHeads.length > 0) {
    y += 70;
    const line = coHeads.map((a) => a.name.toUpperCase()).join('  ·  ');
    ctx.fillStyle = '#1d1430';
    const size = fitText(line, width - 130, 76);
    ctx.fillText(line, width / 2, y);
    y += size * 0.2 + 34;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillStyle = '#6b3a52';
    ctx.fillText(
      coHeads.map((a) => `${a.points} PTS`).join('      ·      '),
      width / 2,
      y,
    );
  }

  // special guests
  const guests = rest.slice(2);
  if (guests.length > 0) {
    y += 70;
    ctx.fillStyle = '#d6405c';
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText('W I T H   S P E C I A L   G U E S T S', width / 2, y);
    y += 50;
    ctx.fillStyle = '#1d1430';
    const lines: string[] = [];
    for (let i = 0; i < guests.length; i += 2) {
      lines.push(
        guests
          .slice(i, i + 2)
          .map((a) => a.name.toUpperCase())
          .join('  ★  '),
      );
    }
    lines.slice(0, 3).forEach((text) => {
      fitText(text, width - 140, 44, 800);
      ctx.fillText(text, width / 2, y);
      y += 54;
    });
  }

  // footer
  ctx.fillStyle = '#1d1430';
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText('ALL AGES  ·  NO REFUNDS  ·  ONE NIGHT ONLY', width / 2, height - 66);
  return finish(canvas);
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Painted wooden floorboards, tiling. */
export function floorTexture() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = seeded(7);
  const boards = 8;
  const boardW = size / boards;
  for (let i = 0; i < boards; i++) {
    let y = -rand() * 200;
    while (y < size) {
      const length = 140 + rand() * 220;
      const shade = 0.85 + rand() * 0.3;
      ctx.fillStyle = `rgb(${Math.round(54 * shade)}, ${Math.round(38 * shade)}, ${Math.round(78 * shade)})`;
      ctx.fillRect(i * boardW, y, boardW, length);
      // grain
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 4; g++) {
        const gx = i * boardW + 6 + rand() * (boardW - 12);
        ctx.beginPath();
        ctx.moveTo(gx, y + 4);
        ctx.bezierCurveTo(gx + 6, y + length * 0.3, gx - 6, y + length * 0.7, gx, y + length - 4);
        ctx.stroke();
      }
      // board ends
      ctx.fillStyle = 'rgba(10,6,20,0.55)';
      ctx.fillRect(i * boardW, y, boardW, 3);
      y += length;
    }
    // gaps between boards
    ctx.fillStyle = 'rgba(10,6,20,0.6)';
    ctx.fillRect(i * boardW, 0, 3, size);
  }
  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

/** Striped club wallpaper with a little star motif, tiling. */
export function wallpaperTexture() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = '#2a1e47';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 64) {
    ctx.fillStyle = '#31244f';
    ctx.fillRect(x, 0, 32, size);
  }
  ctx.fillStyle = 'rgba(255, 210, 120, 0.22)';
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 32; y < size; y += 64) {
    for (let x = 48; x < size; x += 64) {
      ctx.fillText('★', x + ((y / 64) % 2) * 0, y);
    }
  }
  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A night skyline for the windows; offset at runtime for parallax. */
export function skylineTexture() {
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = makeCanvas(width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0b0820');
  sky.addColorStop(0.6, '#3a1a5c');
  sky.addColorStop(1, '#ff5fa2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const rand = seeded(42);
  // stars
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`;
    ctx.fillRect(rand() * width, rand() * height * 0.5, 2, 2);
  }
  // moon
  ctx.fillStyle = '#fff4d6';
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.22, 34, 0, Math.PI * 2);
  ctx.fill();
  // two rows of buildings
  [
    { color: '#24123f', base: 0.55, max: 0.35 },
    { color: '#12092a', base: 0.7, max: 0.4 },
  ].forEach(({ color, base, max }) => {
    let x = 0;
    while (x < width) {
      const w = 40 + rand() * 80;
      const h = height * (1 - base) + rand() * height * max;
      const top = height - h;
      ctx.fillStyle = color;
      ctx.fillRect(x, top, w, h);
      // lit windows
      for (let wy = top + 10; wy < height - 10; wy += 16) {
        for (let wx = x + 8; wx < x + w - 8; wx += 14) {
          if (rand() > 0.6) {
            ctx.fillStyle = rand() > 0.5 ? '#ffd88a' : '#7ce7ff';
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      x += w + 4;
    }
  });
  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Vertical fade for light beams: bright at the lamp, gone at the floor. */
export function beamTexture() {
  const { canvas, ctx } = makeCanvas(4, 256);
  const fade = ctx.createLinearGradient(0, 0, 0, 256);
  fade.addColorStop(0, 'rgba(255,255,255,0.0)');
  fade.addColorStop(0.15, 'rgba(255,255,255,0.25)');
  fade.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 4, 256);
  return finish(canvas);
}

/** A soft round spot (sparkles, glows). */
export function glowTexture() {
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return finish(canvas);
}
