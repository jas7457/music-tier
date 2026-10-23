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

// hosts we've seen refuse CORS go straight to the proxy next time
const proxiedHosts = new Set<string>();

function loadImage(url: string) {
  let promise = imageCache.get(url);
  if (!promise) {
    // Straight from the host if it allows CORS, else via the same-origin
    // image optimizer (hosts are allowed in next.config.js).
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return '';
      }
    })();
    const viaProxy = () =>
      loadImageFrom(`/_next/image?url=${encodeURIComponent(url)}&w=256&q=75`);
    promise = proxiedHosts.has(host)
      ? viaProxy()
      : loadImageFrom(url).catch(() => {
          proxiedHosts.add(host);
          return viaProxy();
        });
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
