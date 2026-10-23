'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ROOM_HALF } from '../stations';
import { Block, Ink, ToonMaterial } from './toon';
import { neonTexture, useCanvasTexture } from './textures';

/**
 * Set dressing between the stations: speaker stacks round the dance floor,
 * a cocktail bar, an arcade corner, lounge tables, a rug, the velvet rope by
 * the door, balloons and a neon sign. Footprints are mirrored in pathing.ts.
 */
export function Decor({
  moodColor,
  reducedMotion,
}: {
  moodColor: string;
  reducedMotion: boolean;
}) {
  return (
    <group>
      <SpeakerStack position={[-5, 0, -5]} rotation={Math.PI / 4} reducedMotion={reducedMotion} />
      <SpeakerStack position={[5, 0, -5]} rotation={-Math.PI / 4} reducedMotion={reducedMotion} />
      <SpeakerStack position={[-5, 0, 5]} rotation={(Math.PI * 3) / 4} reducedMotion={reducedMotion} />
      <Bar moodColor={moodColor} />
      <Arcade position={[4, 0, -10.35]} color="#ff4fd8" screen="#38e1ff" />
      <Arcade position={[5.3, 0, -10.35]} color="#38e1ff" screen="#ffe066" />
      <LoungeTable position={[-5.6, 0, 7.6]} lamp="#ffb547" />
      <LoungeTable position={[6.4, 0, -5.2]} lamp="#ff4fd8" />
      <Rug />
      <VelvetRope />
      <Balloons position={[-3.2, 0, -7.8]} colors={['#ff4fd8', '#ffe066', '#38e1ff']} reducedMotion={reducedMotion} />
      <Balloons position={[3.2, 0, -7.8]} colors={['#7dff9b', '#ff4fd8', '#b78cff']} reducedMotion={reducedMotion} />
      <NeonSign />
      <Palm position={[-ROOM_HALF + 0.8, 0, -4.6]} />
      <Palm position={[ROOM_HALF - 0.8, 0, 8.2]} />
      <Palm position={[-1.6, 0, ROOM_HALF - 0.9]} />
    </group>
  );
}

/** A stack of two speaker cabinets whose woofers thump to the beat. */
function SpeakerStack({
  position,
  rotation,
  reducedMotion,
}: {
  position: [number, number, number];
  rotation: number;
  reducedMotion: boolean;
}) {
  const woofers = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!woofers.current || reducedMotion) {
      return;
    }
    const beat = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * Math.PI * 2)), 6);
    woofers.current.children.forEach((child) => {
      child.scale.setScalar(1 + beat * 0.12);
    });
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Block size={[0.95, 0.9, 0.85]} position={[0, 0.45, 0]} color="#1b1530" radius={0.08} />
      <Block size={[0.8, 0.75, 0.75]} position={[0, 1.28, 0]} color="#241c3d" radius={0.08} />
      <group ref={woofers}>
        {[
          { y: 0.32, r: 0.2 },
          { y: 0.62, r: 0.12 },
          { y: 1.28, r: 0.26 },
        ].map(({ y, r }, i) => (
            <mesh key={i} position={[0, y, y > 1 ? 0.39 : 0.44]}>
              <circleGeometry args={[r, 24]} />
              <ToonMaterial color={i % 2 ? '#0d0a18' : '#3a3058'} />
            </mesh>
          ))}
      </group>
    </group>
  );
}

/** A cocktail bar along the open right side, with stools and a neon sign. */
function Bar({ moodColor }: { moodColor: string }) {
  const sign = useCanvasTexture(
    () =>
      neonTexture({
        text: 'BAR',
        color: '#ff8a5c',
        width: 512,
        height: 200,
        fontSize: 160,
      }),
    [],
  );
  const bottleColors = ['#7dff9b', '#ffb547', '#ff4fd8', '#38e1ff', '#b78cff'];
  return (
    <group position={[9.4, 0, 3.8]}>
      {/* counter */}
      <Block size={[1.1, 1.1, 4.4]} position={[-0.4, 0.55, 0]} color="#5a2a6d" radius={0.12} />
      <Block size={[1.4, 0.12, 4.7]} position={[-0.45, 1.16, 0]} color="#c99a2e" radius={0.05} />
      {/* glowing strip along the front */}
      <mesh position={[-0.97, 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[4.3, 0.12]} />
        <meshBasicMaterial color={moodColor} toneMapped={false} />
      </mesh>
      {/* back shelf with bottles */}
      <Block size={[0.4, 2.1, 4.4]} position={[0.9, 1.05, 0]} color="#3a2152" radius={0.06} />
      {[1.1, 1.75].map((y, row) =>
        Array.from({ length: 7 }).map((_, i) => (
          <mesh key={`${y}-${i}`} position={[0.62, y + 0.2, -1.8 + i * 0.6]}>
            <cylinderGeometry args={[0.07, 0.09, 0.4, 10]} />
            <meshBasicMaterial color={bottleColors[(i + row * 2) % bottleColors.length]} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        )),
      )}
      <mesh position={[0.62, 2.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.8, 0.7]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      {/* glasses on the counter */}
      {[-1.2, 0.3, 1.5].map((z) => (
        <mesh key={z} position={[-0.6, 1.33, z]}>
          <cylinderGeometry args={[0.07, 0.05, 0.2, 10]} />
          <meshBasicMaterial color="#e8f6ff" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* stools */}
      {[-1.55, -0.3, 0.95].map((z) => (
        <group key={z} position={[-1.55, 0, z + 0.3]}>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
            <meshStandardMaterial color="#c9c4d6" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.22, 0.12, 16]} />
            <ToonMaterial color="#ff4fd8" />
            <Ink thickness={0.02} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.04, 16]} />
            <meshStandardMaterial color="#c9c4d6" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** An upright arcade cabinet with a glowing screen. */
function Arcade({
  position,
  color,
  screen,
}: {
  position: [number, number, number];
  color: string;
  screen: string;
}) {
  return (
    <group position={position}>
      <Block size={[1, 1.9, 0.8]} position={[0, 0.95, 0]} color={color} radius={0.08} />
      <Block size={[0.85, 0.12, 0.42]} position={[0, 1.02, 0.42]} rotation={[0.35, 0, 0]} color="#1b1530" radius={0.03} />
      <mesh position={[0, 1.48, 0.405]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[0.72, 0.56]} />
        <meshBasicMaterial color={screen} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.78, 0.405]}>
        <planeGeometry args={[0.84, 0.16]} />
        <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
      </mesh>
      {/* joystick and buttons */}
      <mesh position={[-0.2, 1.16, 0.5]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color="#ff5470" toneMapped={false} />
      </mesh>
      {[0.08, 0.22].map((x) => (
        <mesh key={x} position={[x, 1.12, 0.52]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#7dff9b" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** A round cocktail table with two stools and a little glowing lamp. */
function LoungeTable({
  position,
  lamp,
}: {
  position: [number, number, number];
  lamp: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.76, 8]} />
        <ToonMaterial color="#2a2140" />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.07, 24]} />
        <ToonMaterial color="#3d2c5e" />
        <Ink thickness={0.02} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshBasicMaterial color={lamp} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.1, 0]} color={lamp} intensity={2.5} distance={2.2} />
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.6, 14]} />
          <ToonMaterial color="#5a2a6d" />
          <Ink thickness={0.02} />
        </mesh>
      ))}
    </group>
  );
}

/** A round rug under the couch. */
function Rug() {
  return (
    <group position={[2.2, 0.012, 9.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <circleGeometry args={[2.4, 48]} />
        <ToonMaterial color="#7a2f63" />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <ringGeometry args={[1.7, 1.9, 48]} />
        <ToonMaterial color="#ffb547" />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <ringGeometry args={[0.7, 0.85, 48]} />
        <ToonMaterial color="#ffb547" />
      </mesh>
    </group>
  );
}

/** Brass posts and a red velvet rope by the door. */
function VelvetRope() {
  const posts: Array<[number, number]> = [
    [-9.9, 8.3],
    [-8.8, 8.3],
    [-7.7, 8.3],
  ];
  const ropes = useMemo(
    () =>
      posts.slice(1).map(([x, z], i) => {
        const [px, pz] = posts[i];
        return new THREE.CatmullRomCurve3([
          new THREE.Vector3(px, 0.82, pz),
          new THREE.Vector3((px + x) / 2, 0.55, (pz + z) / 2),
          new THREE.Vector3(x, 0.82, z),
        ]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <group>
      {posts.map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.9, 10]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.18, 0.2, 0.06, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      ))}
      {ropes.map((curve, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[curve, 16, 0.035, 8, false]} />
          <ToonMaterial color="#c4163f" />
        </mesh>
      ))}
    </group>
  );
}

/** A bunch of party balloons bobbing on their strings. */
function Balloons({
  position,
  colors,
  reducedMotion,
}: {
  position: [number, number, number];
  colors: string[];
  reducedMotion: boolean;
}) {
  const bunch = useRef<THREE.Group>(null);
  const offsets: Array<[number, number, number]> = [
    [0, 2.3, 0],
    [-0.35, 2.05, 0.15],
    [0.32, 2.1, -0.12],
  ];
  useFrame(({ clock }) => {
    if (!bunch.current || reducedMotion) {
      return;
    }
    bunch.current.children.forEach((child, i) => {
      child.position.y = offsets[i][1] + Math.sin(clock.elapsedTime * 1.3 + i) * 0.06;
    });
  });
  return (
    <group position={position}>
      <Block size={[0.3, 0.16, 0.3]} position={[0, 0.08, 0]} color="#2a2140" radius={0.05} />
      {offsets.map(([x, y, z], i) => (
        <mesh key={`s${i}`} position={[x / 2, (y - 0.3) / 2 + 0.1, z / 2]} rotation={[z, 0, -x * 0.4]}>
          <cylinderGeometry args={[0.006, 0.006, y - 0.25, 4]} />
          <meshBasicMaterial color="#e6e0f0" />
        </mesh>
      ))}
      <group ref={bunch}>
        {offsets.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} scale={[1, 1.18, 1]} castShadow>
            <sphereGeometry args={[0.3, 20, 16]} />
            <ToonMaterial color={colors[i % colors.length]} />
            <Ink thickness={0.02} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** "PARTY" in neon script on the left wall. */
function NeonSign() {
  const sign = useCanvasTexture(
    () =>
      neonTexture({
        text: '♪ PARTY ♪',
        color: '#ff4fd8',
        width: 1024,
        height: 256,
        fontSize: 170,
      }),
    [],
  );
  return (
    <mesh position={[-ROOM_HALF + 0.05, 2.9, -9.5]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[2.6, 0.65]} />
      <meshBasicMaterial map={sign} transparent toneMapped={false} />
    </mesh>
  );
}

/** A big potted palm. */
function Palm({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.3, 0.6, 16]} />
        <ToonMaterial color="#d9733f" />
        <Ink />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 1.4, 8]} />
        <ToonMaterial color="#8a5a2b" />
        <Ink thickness={0.02} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.42, 1.88, Math.sin(angle) * 0.42]}
            rotation={[0, -angle, -0.55]}
            castShadow
          >
            <boxGeometry args={[0.95, 0.04, 0.3]} />
            <ToonMaterial color={i % 2 ? '#37b36a' : '#2c9a5a'} />
            <Ink thickness={0.02} />
          </mesh>
        );
      })}
    </group>
  );
}
