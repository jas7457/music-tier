'use client';

import * as THREE from 'three';
import { Outlines, RoundedBox } from '@react-three/drei';

/**
 * The cartoon look: cel shading with a few soft bands, plus ink outlines.
 */

// Three light bands; NearestFilter keeps the steps crisp.
const gradientMap = (() => {
  if (typeof document === 'undefined') {
    return null;
  }
  const data = new Uint8Array([90, 170, 255]);
  const texture = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

export const INK = '#140c24';

export function ToonMaterial({
  color,
  emissive,
  emissiveIntensity = 0.35,
  map,
  side,
}: {
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  map?: THREE.Texture | null;
  side?: THREE.Side;
}) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={gradientMap}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? emissiveIntensity : 0}
      map={map ?? null}
      side={side}
    />
  );
}

/**
 * An ink outline around the mesh it's placed in. `thickness` is a relative
 * weight (0.03 = normal); drei's default mode draws it in screen pixels.
 */
export function Ink({ thickness = 0.03 }: { thickness?: number }) {
  return <Outlines thickness={thickness * 80} color={INK} />;
}

/**
 * A chunky rounded box with toon shading, an outline and shadows: the basic
 * building block for furniture.
 */
export function Block({
  size,
  position,
  rotation,
  color,
  radius = 0.08,
  emissive,
  outline = true,
  castShadow = true,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  radius?: number;
  emissive?: string;
  outline?: boolean;
  castShadow?: boolean;
}) {
  const r = Math.min(radius, size[0] / 2 - 0.001, size[1] / 2 - 0.001, size[2] / 2 - 0.001);
  return (
    <RoundedBox
      args={size}
      radius={Math.max(0.005, r)}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow
    >
      <ToonMaterial color={color} emissive={emissive} />
      {outline && <Ink />}
    </RoundedBox>
  );
}
