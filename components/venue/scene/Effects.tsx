'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { STATIONS } from '../stations';
import { CELEBRATE_EVENT, type CelebrateDetail } from '../celebrate';
import { noteAtlasTexture, useCanvasTexture } from './textures';

const CONFETTI = 140;
const HIDDEN = new THREE.Vector3(0, -100, 0);
const COLORS = ['#ff4fd8', '#38e1ff', '#7dff9b', '#ffe066', '#ffb547', '#b78cff'];

/**
 * Confetti bursts fired from anywhere in the app with celebrate(station).
 * One instanced mesh, reused for every burst.
 */
export function Confetti({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: CONFETTI }, () => ({
        position: new THREE.Vector3(0, -100, 0),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        spin: new THREE.Vector3(),
        life: 0,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const instance = mesh.current;
    if (instance) {
      const color = new THREE.Color();
      for (let i = 0; i < CONFETTI; i++) {
        instance.setColorAt(i, color.set(COLORS[i % COLORS.length]));
      }
      if (instance.instanceColor) {
        instance.instanceColor.needsUpdate = true;
      }
    }
    const onCelebrate = (event: Event) => {
      if (reducedMotion) {
        return;
      }
      const { station } = (event as CustomEvent<CelebrateDetail>).detail;
      const origin = STATIONS[station].focus;
      particles.forEach((p) => {
        p.position.set(origin[0], origin[1] + 0.8, origin[2]);
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        p.velocity.set(
          Math.cos(angle) * speed,
          4 + Math.random() * 4,
          Math.sin(angle) * speed,
        );
        p.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
        p.life = 2.2 + Math.random();
      });
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
  }, [particles, reducedMotion]);

  useFrame((_, rawDelta) => {
    const instance = mesh.current;
    if (!instance) {
      return;
    }
    const delta = Math.min(rawDelta, 0.05);
    let alive = false;
    particles.forEach((p, i) => {
      if (p.life > 0) {
        alive = true;
        p.life -= delta;
        p.velocity.y -= 9 * delta;
        p.velocity.multiplyScalar(1 - delta * 0.9);
        p.position.addScaledVector(p.velocity, delta);
        if (p.position.y < 0.05) {
          p.position.y = 0.05;
          p.velocity.set(0, 0, 0);
        }
        p.rotation.x += p.spin.x * delta;
        p.rotation.y += p.spin.y * delta;
        p.rotation.z += p.spin.z * delta;
      }
      dummy.position.copy(p.life > 0 ? p.position : HIDDEN);
      dummy.rotation.copy(p.rotation);
      dummy.updateMatrix();
      instance.setMatrixAt(i, dummy.matrix);
    });
    if (alive || instance.userData.wasAlive) {
      instance.instanceMatrix.needsUpdate = true;
    }
    instance.userData.wasAlive = alive;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, CONFETTI]}
      frustumCulled={false}
    >
      <planeGeometry args={[0.12, 0.07]} />
      <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

/** Little glowing notes drifting up out of the speakers and the jukebox. */
export function MusicNotes({ reducedMotion }: { reducedMotion: boolean }) {
  const textures = useCanvasTexture(noteAtlasTexture, []);
  const sources: Array<[number, number, number]> = [
    [-1.65, 2.4, -5.4],
    [3.6, 1.9, -5.4],
    [5.6, 2.2, -5.8],
  ];
  const notes = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        source: sources[i % sources.length],
        offset: i * 0.37,
        glyph: i % 3,
        color: COLORS[i % COLORS.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  if (reducedMotion) {
    return null;
  }
  return (
    <group>
      {notes.map((note, i) => (
        <Note key={i} {...note} texture={textures} />
      ))}
    </group>
  );
}

function Note({
  source,
  offset,
  glyph,
  color,
  texture,
}: {
  source: [number, number, number];
  offset: number;
  glyph: number;
  color: string;
  texture: THREE.Texture;
}) {
  const sprite = useRef<THREE.Sprite>(null);
  const map = useMemo(() => {
    const t = texture.clone();
    t.repeat.set(1 / 3, 1);
    t.offset.set(glyph / 3, 0);
    t.needsUpdate = true;
    return t;
  }, [texture, glyph]);
  useEffect(() => () => map.dispose(), [map]);
  useFrame(({ clock }) => {
    if (!sprite.current) {
      return;
    }
    const t = (clock.elapsedTime * 0.35 + offset) % 1;
    sprite.current.position.set(
      source[0] + Math.sin((t + offset) * 9) * 0.3,
      source[1] + t * 2.2,
      source[2] + Math.cos((t + offset) * 7) * 0.2,
    );
    (sprite.current.material as THREE.SpriteMaterial).opacity =
      Math.sin(t * Math.PI) * 0.9;
  });
  return (
    <sprite ref={sprite} scale={[0.35, 0.35, 1]}>
      <spriteMaterial
        map={map}
        color={color}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
