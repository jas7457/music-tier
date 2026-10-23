'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ROOM_HALF } from '../stations';

const WALL_HEIGHT = 4.2;
const FLOOR_COLOR = '#1b1530';
const WALL_COLOR = '#241a3d';
const TRIM_COLOR = '#2f2350';

/** Floor, walls, dance floor, disco ball and the moving light beams. */
export function Room({
  moodColor,
  reducedMotion,
}: {
  moodColor: string;
  reducedMotion: boolean;
}) {
  return (
    <group>
      {/* Floor slab */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ROOM_HALF * 2, 0.3, ROOM_HALF * 2]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.85} />
      </mesh>
      {/* Plank lines */}
      <FloorPlanks />

      {/* Back wall */}
      <mesh position={[0, WALL_HEIGHT / 2, -ROOM_HALF - 0.15]}>
        <boxGeometry args={[ROOM_HALF * 2 + 0.3, WALL_HEIGHT, 0.3]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-ROOM_HALF - 0.15, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.3, WALL_HEIGHT, ROOM_HALF * 2]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      {/* Wainscoting strips */}
      <mesh position={[0, 0.5, -ROOM_HALF + 0.02]}>
        <boxGeometry args={[ROOM_HALF * 2, 1, 0.04]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>
      <mesh position={[-ROOM_HALF + 0.02, 0.5, 0]}>
        <boxGeometry args={[0.04, 1, ROOM_HALF * 2]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>

      {/* Neon trim along the top of the walls */}
      <NeonTube
        from={[-ROOM_HALF + 0.05, WALL_HEIGHT - 0.25, -ROOM_HALF + 0.05]}
        to={[ROOM_HALF, WALL_HEIGHT - 0.25, -ROOM_HALF + 0.05]}
        color={moodColor}
      />
      <NeonTube
        from={[-ROOM_HALF + 0.05, WALL_HEIGHT - 0.25, -ROOM_HALF + 0.05]}
        to={[-ROOM_HALF + 0.05, WALL_HEIGHT - 0.25, ROOM_HALF]}
        color={moodColor}
      />
      {/* Floor edge glow on the open sides */}
      <NeonTube
        from={[-ROOM_HALF, 0.02, ROOM_HALF]}
        to={[ROOM_HALF, 0.02, ROOM_HALF]}
        color={moodColor}
        radius={0.03}
      />
      <NeonTube
        from={[ROOM_HALF, 0.02, -ROOM_HALF]}
        to={[ROOM_HALF, 0.02, ROOM_HALF]}
        color={moodColor}
        radius={0.03}
      />

      <DanceFloor moodColor={moodColor} reducedMotion={reducedMotion} />
      <DiscoBall reducedMotion={reducedMotion} />
      <LightBeams moodColor={moodColor} reducedMotion={reducedMotion} />
      <Couch />
      <Plant position={[6.3, 0, 6.3]} />
      <Plant position={[-6.3, 0, -6.3]} />
    </group>
  );
}

function FloorPlanks() {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (let i = -ROOM_HALF + 1; i < ROOM_HALF; i += 1) {
      points.push(i, 0.005, -ROOM_HALF, i, 0.005, ROOM_HALF);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#120d22" />
    </lineSegments>
  );
}

export function NeonTube({
  from,
  to,
  color,
  radius = 0.045,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  radius?: number;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { position: mid, quaternion: q, length: dir.length() };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

const TILE = 0.95;
const TILES = 6;

function DanceFloor({
  moodColor,
  reducedMotion,
}: {
  moodColor: string;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const palette = useMemo(
    () =>
      [moodColor, '#ff4fd8', '#38e1ff', '#7dff9b', '#ffe066'].map(
        (c) => new THREE.Color(c),
      ),
    [moodColor],
  );
  const dark = useMemo(() => new THREE.Color('#2a2144'), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  const matrices = useMemo(() => {
    const m = new THREE.Matrix4();
    const list: THREE.Matrix4[] = [];
    for (let x = 0; x < TILES; x++) {
      for (let z = 0; z < TILES; z++) {
        m.makeTranslation(
          (x - (TILES - 1) / 2) * TILE,
          0.03,
          (z - (TILES - 1) / 2) * TILE + 0.6,
        );
        list.push(m.clone());
      }
    }
    return list;
  }, []);

  const lastStep = useRef(-1);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    // tiles change on the beat (~120 bpm), not every frame
    const step = reducedMotion ? 0 : Math.floor(clock.elapsedTime * 2);
    if (step === lastStep.current) {
      return;
    }
    lastStep.current = step;
    matrices.forEach((matrix, i) => {
      mesh.setMatrixAt(i, matrix);
      const x = Math.floor(i / TILES);
      const z = i % TILES;
      const lit = (x * 7 + z * 13 + step * 5) % 4 === 0 || (x + z + step) % 5 === 0;
      if (lit) {
        tmp.copy(palette[(x + z + step) % palette.length]);
      } else {
        tmp.copy(dark);
      }
      mesh.setColorAt(i, tmp);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.01, 0.6]}>
        <boxGeometry args={[TILE * TILES + 0.2, 0.04, TILE * TILES + 0.2]} />
        <meshStandardMaterial color="#0d0a18" />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, TILES * TILES]}
        frustumCulled={false}
      >
        <boxGeometry args={[TILE - 0.07, 0.05, TILE - 0.07]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function DiscoBall({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current && !reducedMotion) {
      ref.current.rotation.y += delta * 0.6;
    }
  });
  return (
    <group position={[0, 3.6, 0.6]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 4]} />
        <meshBasicMaterial color="#888" />
      </mesh>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial
          color="#d8d8f0"
          metalness={0.9}
          roughness={0.15}
          flatShading
          emissive="#3a2f60"
        />
      </mesh>
    </group>
  );
}

/** Fake volumetric spotlights: additive cones that sweep the room. */
function LightBeams({
  moodColor,
  reducedMotion,
}: {
  moodColor: string;
  reducedMotion: boolean;
}) {
  const beams = useMemo(
    () => [
      { origin: [-5, 4.1, -6.6], color: moodColor, speed: 0.5, phase: 0 },
      { origin: [5, 4.1, -6.6], color: '#ff4fd8', speed: 0.42, phase: 2 },
      { origin: [-6.6, 4.1, 2], color: '#38e1ff', speed: 0.36, phase: 4 },
    ],
    [moodColor],
  );
  return (
    <group>
      {beams.map((beam, i) => (
        <Beam key={i} {...beam} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function Beam({
  origin,
  color,
  speed,
  phase,
  reducedMotion,
}: {
  origin: number[];
  color: string;
  speed: number;
  phase: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const length = 5.5;
  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const t = reducedMotion ? phase : clock.elapsedTime * speed + phase;
    // aim at a point wandering around the dance floor
    const target = new THREE.Vector3(
      Math.sin(t) * 2.6,
      0,
      0.6 + Math.cos(t * 1.3) * 2.6,
    );
    ref.current.lookAt(target);
  });
  return (
    <group ref={ref} position={origin as [number, number, number]}>
      {/* cone tip is at +Y; turn it so the tip sits at the lamp and it opens along +Z (lookAt) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length / 2]}>
        <coneGeometry args={[0.9, length, 24, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Couch() {
  return (
    <group position={[2.2, 0, 6.2]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[3, 0.5, 0.9]} />
        <meshStandardMaterial color="#5b2a6e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.65, 0.35]}>
        <boxGeometry args={[3, 0.8, 0.25]} />
        <meshStandardMaterial color="#6b3280" roughness={0.9} />
      </mesh>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.25, 0.6, 0.9]} />
          <meshStandardMaterial color="#6b3280" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 8]} />
        <meshStandardMaterial color="#c2683a" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos(i * 1.3) * 0.18,
            0.75 + (i % 2) * 0.2,
            Math.sin(i * 1.3) * 0.18,
          ]}
          rotation={[Math.cos(i) * 0.5, i, Math.sin(i) * 0.5]}
        >
          <coneGeometry args={[0.2, 0.7, 5]} />
          <meshStandardMaterial color="#2f9e5a" flatShading />
        </mesh>
      ))}
    </group>
  );
}
