'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ROOM_HALF } from '../stations';
import {
  beamTexture,
  floorTexture,
  glowTexture,
  skylineTexture,
  useCanvasTexture,
  wallpaperTexture,
} from './textures';
import { Block, Ink, ToonMaterial } from './toon';

const WALL_HEIGHT = 4.2;
const WALL_THICKNESS = 0.3;

/**
 * The club: floor, walls with windows, dance floor, disco ball, light beams,
 * the couch, plants, and party lights strung across the open front.
 */
export function Room({
  moodColor,
  reducedMotion,
}: {
  moodColor: string;
  reducedMotion: boolean;
}) {
  return (
    <group>
      <Floor />
      <Walls />
      <Window position={[5.1, 3.05, -ROOM_HALF + 0.02]} axis="x" />
      <Window position={[-ROOM_HALF + 0.02, 3.15, 3.3]} axis="z" />
      <Window position={[-ROOM_HALF + 0.02, 2.95, -0.8]} axis="z" />

      {/* neon trim along the top of the walls */}
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
      {/* glowing edge on the open sides of the floor */}
      <NeonTube
        from={[-ROOM_HALF, 0.02, ROOM_HALF + 0.02]}
        to={[ROOM_HALF + 0.02, 0.02, ROOM_HALF + 0.02]}
        color={moodColor}
        radius={0.035}
      />
      <NeonTube
        from={[ROOM_HALF + 0.02, 0.02, -ROOM_HALF]}
        to={[ROOM_HALF + 0.02, 0.02, ROOM_HALF + 0.02]}
        color={moodColor}
        radius={0.035}
      />

      <DanceFloor moodColor={moodColor} reducedMotion={reducedMotion} />
      <DiscoBall reducedMotion={reducedMotion} />
      <Sparkles reducedMotion={reducedMotion} />
      <LightBeams moodColor={moodColor} reducedMotion={reducedMotion} />
      <Couch />
      <Plant position={[6.3, 0, 6.3]} />
      <Plant position={[-6.3, 0, -6.3]} />
      <Plant position={[6.3, 0, -3.4]} scale={0.8} />
      <StringLights reducedMotion={reducedMotion} />
    </group>
  );
}

function Floor() {
  const boards = useCanvasTexture(floorTexture, []);
  return (
    <group>
      {/* the slab's thick edge, seen on the open sides */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[ROOM_HALF * 2 + 0.04, 0.5, ROOM_HALF * 2 + 0.04]} />
        <ToonMaterial color="#120b22" />
        <Ink thickness={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HALF * 2]} />
        <ToonMaterial color="#ffffff" map={boards} />
      </mesh>
    </group>
  );
}

function Walls() {
  const paper = useCanvasTexture(wallpaperTexture, []);
  // each wall gets its own copy so the pattern tiles at the right scale
  const back = useMemo(() => {
    const t = paper.clone();
    t.repeat.set(ROOM_HALF * 2 / 1.6, WALL_HEIGHT / 1.6);
    t.needsUpdate = true;
    return t;
  }, [paper]);
  const left = useMemo(() => {
    const t = paper.clone();
    t.repeat.set(ROOM_HALF * 2 / 1.6, WALL_HEIGHT / 1.6);
    t.needsUpdate = true;
    return t;
  }, [paper]);
  useEffect(
    () => () => {
      back.dispose();
      left.dispose();
    },
    [back, left],
  );
  const z = -ROOM_HALF - WALL_THICKNESS / 2;
  const x = -ROOM_HALF - WALL_THICKNESS / 2;
  return (
    <group>
      {/* wall bodies */}
      <mesh position={[0, WALL_HEIGHT / 2, z]} receiveShadow>
        <boxGeometry args={[ROOM_HALF * 2 + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]} />
        <ToonMaterial color="#1c1433" />
        <Ink thickness={0.04} />
      </mesh>
      <mesh position={[x, WALL_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, ROOM_HALF * 2]} />
        <ToonMaterial color="#1c1433" />
        <Ink thickness={0.04} />
      </mesh>
      {/* wallpaper on the inside faces */}
      <mesh position={[0, WALL_HEIGHT / 2, -ROOM_HALF + 0.005]} receiveShadow>
        <planeGeometry args={[ROOM_HALF * 2, WALL_HEIGHT]} />
        <ToonMaterial color="#ffffff" map={back} />
      </mesh>
      <mesh
        position={[-ROOM_HALF + 0.005, WALL_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_HALF * 2, WALL_HEIGHT]} />
        <ToonMaterial color="#ffffff" map={left} />
      </mesh>
      {/* dollhouse cut-away caps on top of the walls */}
      <Block
        size={[ROOM_HALF * 2 + 0.5, 0.16, WALL_THICKNESS + 0.12]}
        position={[0, WALL_HEIGHT + 0.06, z]}
        color="#3a2a5e"
        radius={0.06}
        castShadow={false}
      />
      <Block
        size={[WALL_THICKNESS + 0.12, 0.16, ROOM_HALF * 2 + 0.25]}
        position={[x, WALL_HEIGHT + 0.06, 0]}
        color="#3a2a5e"
        radius={0.06}
        castShadow={false}
      />
      {/* skirting boards */}
      <Block
        size={[ROOM_HALF * 2, 0.32, 0.08]}
        position={[0, 0.16, -ROOM_HALF + 0.04]}
        color="#47336f"
        radius={0.03}
        outline={false}
        castShadow={false}
      />
      <Block
        size={[0.08, 0.32, ROOM_HALF * 2]}
        position={[-ROOM_HALF + 0.04, 0.16, 0]}
        color="#47336f"
        radius={0.03}
        outline={false}
        castShadow={false}
      />
    </group>
  );
}

/**
 * A window onto the city. The skyline slides as the camera moves, so it
 * looks far away (parallax), even though it's painted on the wall.
 */
function Window({
  position,
  axis,
}: {
  position: [number, number, number];
  axis: 'x' | 'z';
}) {
  const source = useCanvasTexture(skylineTexture, []);
  const sky = useMemo(() => {
    const t = source.clone();
    t.repeat.set(0.45, 1);
    t.needsUpdate = true;
    return t;
  }, [source]);
  useEffect(() => () => sky.dispose(), [sky]);
  const base = axis === 'x' ? position[0] : position[2];
  const glass = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ camera }) => {
    // where the camera sits along the wall decides which slice we see
    const along = axis === 'x' ? camera.position.x : -camera.position.z;
    const map = glass.current?.map;
    if (map) {
      map.offset.x = 0.25 + base * 0.02 + along * 0.006;
    }
  });
  const rotation: [number, number, number] =
    axis === 'x' ? [0, 0, 0] : [0, Math.PI / 2, 0];
  const w = 1.6;
  const h = 1.05;
  return (
    <group position={position} rotation={rotation}>
      <Block size={[w + 0.22, h + 0.22, 0.12]} position={[0, 0, 0.02]} color="#5a3f86" radius={0.05} castShadow={false} />
      <mesh position={[0, 0, 0.085]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial ref={glass} map={sky} toneMapped={false} />
      </mesh>
      {/* mullions */}
      <Block size={[0.06, h, 0.04]} position={[0, 0, 0.1]} color="#5a3f86" radius={0.01} outline={false} castShadow={false} />
      <Block size={[w, 0.06, 0.04]} position={[0, 0, 0.1]} color="#5a3f86" radius={0.01} outline={false} castShadow={false} />
      {/* sill */}
      <Block size={[w + 0.4, 0.08, 0.26]} position={[0, -h / 2 - 0.12, 0.1]} color="#6a4c9a" radius={0.03} castShadow={false} />
    </group>
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
      <cylinderGeometry args={[radius, radius, length, 8]} />
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
          0.045,
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
      const lit =
        (x * 7 + z * 13 + step * 5) % 4 === 0 || (x + z + step) % 5 === 0;
      tmp.copy(lit ? palette[(x + z + step) % palette.length] : dark);
      mesh.setColorAt(i, tmp);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* a raised stage-like platform the tiles sit in */}
      <Block
        size={[TILE * TILES + 0.36, 0.05, TILE * TILES + 0.36]}
        position={[0, 0.025, 0.6]}
        color="#0d0a18"
        radius={0.05}
        castShadow={false}
      />
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, TILES * TILES]}
        frustumCulled={false}
        receiveShadow
      >
        <boxGeometry args={[TILE - 0.08, 0.025, TILE - 0.08]} />
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
        <cylinderGeometry args={[0.015, 0.015, 1.1, 6]} />
        <meshBasicMaterial color="#888" />
      </mesh>
      <mesh ref={ref} castShadow>
        <icosahedronGeometry args={[0.42, 2]} />
        <meshStandardMaterial
          color="#e8e8ff"
          metalness={1}
          roughness={0.12}
          flatShading
          emissive="#5a4a90"
          emissiveIntensity={0.6}
        />
        <Ink thickness={0.025} />
      </mesh>
    </group>
  );
}

/** Specks of light thrown by the disco ball, drifting over floor and walls. */
function Sparkles({ reducedMotion }: { reducedMotion: boolean }) {
  const glow = useCanvasTexture(glowTexture, []);
  const group = useRef<THREE.Group>(null);
  const specks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        radius: 1.2 + ((i * 37) % 10) * 0.45,
        angle: (i / 22) * Math.PI * 2,
        color: ['#ffffff', '#ffe9a8', '#b9f3ff', '#ffc2f0'][i % 4],
      })),
    [],
  );
  useFrame(({ clock }) => {
    if (!group.current) {
      return;
    }
    const t = reducedMotion ? 0 : clock.elapsedTime * 0.35;
    group.current.children.forEach((child, i) => {
      const speck = specks[i];
      const a = speck.angle + t;
      child.position.set(
        Math.cos(a) * speck.radius,
        0.12,
        0.6 + Math.sin(a) * speck.radius,
      );
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = 0.35 + Math.sin(t * 6 + i) * 0.25;
    });
  });
  return (
    <group ref={group}>
      {specks.map((speck, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial
            map={glow}
            color={speck.color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Soft spotlight cones that sweep the dance floor and fade towards it. */
function LightBeams({
  moodColor,
  reducedMotion,
}: {
  moodColor: string;
  reducedMotion: boolean;
}) {
  const fade = useCanvasTexture(beamTexture, []);
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
        <Beam key={i} {...beam} fade={fade} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function Beam({
  origin,
  color,
  speed,
  phase,
  fade,
  reducedMotion,
}: {
  origin: number[];
  color: string;
  speed: number;
  phase: number;
  fade: THREE.Texture;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const length = 5.5;
  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const t = reducedMotion ? phase : clock.elapsedTime * speed + phase;
    // aim at a point wandering around the dance floor
    aim.set(Math.sin(t) * 2.6, 0, 0.6 + Math.cos(t * 1.3) * 2.6);
    ref.current.lookAt(aim);
  });
  return (
    <group ref={ref} position={origin as [number, number, number]}>
      {/* cone tip is at +Y; turn it so the tip sits at the lamp and it opens along +Z (lookAt) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length / 2]}>
        <coneGeometry args={[1, length, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          alphaMap={fade}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* the lamp */}
      <mesh>
        <cylinderGeometry args={[0.16, 0.12, 0.26, 12]} />
        <ToonMaterial color="#2a2140" />
        <Ink thickness={0.02} />
      </mesh>
      <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Couch() {
  const velvet = '#6b3280';
  return (
    <group position={[2.2, 0, 6.2]}>
      <Block size={[3.1, 0.42, 1]} position={[0, 0.27, 0]} color="#4f2460" radius={0.12} />
      {/* seat cushions */}
      {[-0.98, 0, 0.98].map((x) => (
        <Block key={x} size={[0.94, 0.2, 0.8]} position={[x, 0.55, -0.05]} color={velvet} radius={0.09} />
      ))}
      {/* backrest */}
      <Block size={[3.1, 0.85, 0.3]} position={[0, 0.78, 0.38]} color="#5a2a6d" radius={0.13} />
      {/* arms */}
      {[-1.48, 1.48].map((x) => (
        <Block key={x} size={[0.3, 0.7, 1]} position={[x, 0.52, 0]} color="#5a2a6d" radius={0.13} />
      ))}
      {/* stubby legs */}
      {[-1.4, 1.4].flatMap((x) =>
        [-0.4, 0.4].map((z) => (
          <Block key={`${x}${z}`} size={[0.12, 0.08, 0.12]} position={[x, 0.04, z]} color="#2a1734" radius={0.03} outline={false} />
        )),
      )}
    </group>
  );
}

function Plant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.54, 16]} />
        <ToonMaterial color="#d9733f" />
        <Ink />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.06, 16]} />
        <ToonMaterial color="#b85b2f" />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos(i * 1.1) * 0.16,
            0.95 + (i % 3) * 0.12,
            Math.sin(i * 1.1) * 0.16,
          ]}
          rotation={[Math.cos(i * 1.1) * 0.55, 0, -Math.sin(i * 1.1) * 0.55]}
          castShadow
        >
          <sphereGeometry args={[0.2, 12, 10]} />
          <ToonMaterial color={i % 2 ? '#37b36a' : '#2c9a5a'} />
          <Ink thickness={0.02} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Party lights strung along the open front of the room, up high and close
 * to the camera, so they slide past in the foreground as you move.
 */
function StringLights({ reducedMotion }: { reducedMotion: boolean }) {
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const { points, wires } = useMemo(() => {
    const list: THREE.Vector3[] = [];
    const curves: THREE.CatmullRomCurve3[] = [];
    const strands: Array<[THREE.Vector3, THREE.Vector3]> = [
      [new THREE.Vector3(-ROOM_HALF, 4.9, ROOM_HALF + 0.3), new THREE.Vector3(0, 4.9, ROOM_HALF + 0.3)],
      [new THREE.Vector3(0, 4.9, ROOM_HALF + 0.3), new THREE.Vector3(ROOM_HALF + 0.3, 4.9, ROOM_HALF + 0.3)],
      [new THREE.Vector3(ROOM_HALF + 0.3, 4.9, ROOM_HALF + 0.3), new THREE.Vector3(ROOM_HALF + 0.3, 4.9, 0)],
      [new THREE.Vector3(ROOM_HALF + 0.3, 4.9, 0), new THREE.Vector3(ROOM_HALF + 0.3, 4.9, -ROOM_HALF)],
    ];
    strands.forEach(([a, b]) => {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y -= 0.4; // sag
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      curves.push(curve);
      curve.getSpacedPoints(12).forEach((p, i) => {
        if (i > 0) {
          list.push(p.clone().add(new THREE.Vector3(0, -0.08, 0)));
        }
      });
    });
    return { points: list, wires: curves };
  }, []);

  const colors = useMemo(
    () => ['#ffd36b', '#ff6fb5', '#6fe3ff', '#9cff8f'].map((c) => new THREE.Color(c)),
    [],
  );
  const dim = useMemo(() => new THREE.Color('#3a2a55'), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const lastStep = useRef(-1);

  useFrame(({ clock }) => {
    const mesh = bulbs.current;
    if (!mesh) {
      return;
    }
    const step = reducedMotion ? 0 : Math.floor(clock.elapsedTime * 1.5);
    if (step === lastStep.current) {
      return;
    }
    lastStep.current = step;
    const m = new THREE.Matrix4();
    points.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      mesh.setMatrixAt(i, m);
      const off = !reducedMotion && (i + step) % 7 === 0;
      tmp.copy(off ? dim : colors[i % colors.length]);
      mesh.setColorAt(i, tmp);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {wires.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 24, 0.012, 4, false]} />
          <meshBasicMaterial color="#1a1328" />
        </mesh>
      ))}
      <instancedMesh
        ref={bulbs}
        args={[undefined, undefined, points.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
