'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { STATIONS, StationId, ROOM_HALF } from '../stations';
import {
  cardTexture,
  neonTexture,
  useCanvasTexture,
  useImageTexture,
} from './textures';
import { NeonTube } from './Room';
import { StaticAnchor } from './anchors';

export type StationSceneData = {
  marqueeTitle: string;
  marqueeSubtitle: string;
  moodColor: string;
  spinningArt: string | null;
  lineup: Array<{ name: string; points: number; place: number }>;
  crateArt: string[];
  pollCount: number;
  openPollCount: number;
  hasRecap: boolean;
  ballotDone: boolean;
  questStation: StationId | null;
};

type StationProps = {
  data: StationSceneData;
  reducedMotion: boolean;
};

/**
 * A clickable station: its props plus a floating label and, when it's where
 * you should go next, a pulsing ring on the floor.
 */
function StationHit({
  id,
  onSelect,
  isQuest,
  children,
}: {
  id: StationId;
  onSelect: (id: StationId) => void;
  isQuest: boolean;
  children: React.ReactNode;
}) {
  const station = STATIONS[id];
  const labelPos = useMemo(
    (): [number, number, number] => [
      station.focus[0],
      station.focus[1] + 1.3,
      station.focus[2],
    ],
    [station],
  );
  return (
    <group>
      <group
        onClick={(e: ThreeEvent<MouseEvent>) => {
          // ignore the click that ends a drag
          if (e.delta > 8) {
            return;
          }
          e.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        {children}
      </group>
      {isQuest && <QuestRing position={station.approach} color={station.color} />}
      <StaticAnchor id={`station:${id}`} position={labelPos} />
    </group>
  );
}

function QuestRing({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const t = (clock.elapsedTime % 1.6) / 1.6;
    ref.current.scale.setScalar(0.6 + t * 0.9);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
  });
  return (
    <group position={[position[0], 0.06, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.6, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.7, 40]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Stations({
  data,
  reducedMotion,
  onSelect,
}: StationProps & {
  onSelect: (id: StationId) => void;
}) {
  const common = { onSelect };
  return (
    <group>
      <StationHit id="stage" {...common} isQuest={data.questStation === 'stage'}>
        <Stage data={data} reducedMotion={reducedMotion} />
      </StationHit>
      <StationHit id="booth" {...common} isQuest={data.questStation === 'booth'}>
        <DjBooth data={data} reducedMotion={reducedMotion} />
      </StationHit>
      <StationHit
        id="ballot"
        {...common}
        isQuest={data.questStation === 'ballot'}
      >
        <BallotBox data={data} reducedMotion={reducedMotion} />
      </StationHit>
      <StationHit
        id="lineup"
        {...common}
        isQuest={data.questStation === 'lineup'}
      >
        <LineupWall data={data} reducedMotion={reducedMotion} />
      </StationHit>
      <StationHit
        id="crates"
        {...common}
        isQuest={data.questStation === 'crates'}
      >
        <Crates data={data} reducedMotion={reducedMotion} />
      </StationHit>
      <StationHit
        id="board"
        {...common}
        isQuest={data.questStation === 'board'}
      >
        <Corkboard data={data} reducedMotion={reducedMotion} />
      </StationHit>
      <StationHit
        id="jukebox"
        {...common}
        isQuest={data.questStation === 'jukebox'}
      >
        <Jukebox data={data} reducedMotion={reducedMotion} />
      </StationHit>
      <StationHit id="exit" {...common} isQuest={data.questStation === 'exit'}>
        <ExitDoor />
      </StationHit>
    </group>
  );
}

/* ----------------------------- Main stage ----------------------------- */

function Stage({ data }: StationProps) {
  const title = useCanvasTexture(
    () =>
      neonTexture({
        text: data.marqueeTitle,
        color: '#ff4fd8',
        width: 1024,
        height: 182,
        fontSize: 120,
        maxLines: 1,
      }),
    [data.marqueeTitle],
  );
  const subtitle = useCanvasTexture(
    () =>
      neonTexture({
        text: data.marqueeSubtitle,
        color: data.moodColor,
        width: 1024,
        height: 92,
        fontSize: 64,
        weight: 700,
      }),
    [data.marqueeSubtitle, data.moodColor],
  );
  return (
    <group>
      {/* platform */}
      <mesh position={[0.5, 0.25, -5.6]}>
        <boxGeometry args={[5.4, 0.5, 2.6]} />
        <meshStandardMaterial color="#3a2a5c" roughness={0.6} />
      </mesh>
      <NeonTube from={[-2.2, 0.51, -4.3]} to={[3.2, 0.51, -4.3]} color="#ff4fd8" radius={0.035} />
      {/* curtain */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[-1.9 + i * 0.6, 1.8, -6.85]}>
          <cylinderGeometry args={[0.32, 0.32, 2.6, 8, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#8b1e3f" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* marquee board */}
      <mesh position={[0.5, 3.6, -6.45]}>
        <boxGeometry args={[4.8, 1.2, 0.12]} />
        <meshStandardMaterial color="#0d0a18" />
      </mesh>
      <mesh position={[0.5, 3.75, -6.38]}>
        <planeGeometry args={[4.5, 0.8]} />
        <meshBasicMaterial map={title} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0.5, 3.24, -6.38]}>
        <planeGeometry args={[3.8, 0.34]} />
        <meshBasicMaterial map={subtitle} transparent toneMapped={false} />
      </mesh>
      {/* bulbs around the marquee */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[-1.7 + i * 0.338, 4.12, -6.38]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
        </mesh>
      ))}
      {/* mic stand */}
      <group position={[0.5, 0.5, -5]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.4, 6]} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.45, 0.05]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>
      {/* speakers */}
      {[-2.6, 3.6].map((x) => (
        <group key={x} position={[x, 0, -5.8]}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.9, 1.8, 0.8]} />
            <meshStandardMaterial color="#141020" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.25, 0.41]}>
            <circleGeometry args={[0.28, 24]} />
            <meshStandardMaterial color="#2b2540" />
          </mesh>
          <mesh position={[0, 0.55, 0.41]}>
            <circleGeometry args={[0.36, 24]} />
            <meshStandardMaterial color="#2b2540" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------ DJ booth ------------------------------ */

function DjBooth({ data, reducedMotion }: StationProps) {
  const art = useImageTexture(data.spinningArt);
  const platter = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (platter.current && !reducedMotion) {
      platter.current.rotation.y -= delta * 3.4;
    }
  });
  const color = STATIONS.booth.color;
  return (
    <group position={[-5.6, 0, -0.8]}>
      {/* desk */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.2, 1.1, 2.6]} />
        <meshStandardMaterial color="#17122a" roughness={0.6} />
      </mesh>
      <mesh position={[0.61, 0.55, 0]}>
        <planeGeometry args={[2.4, 0.9]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} toneMapped={false} />
      </mesh>
      <NeonTube from={[0.62, 1.08, -1.3]} to={[0.62, 1.08, 1.3]} color={color} radius={0.03} />
      <NeonTube from={[0.62, 0.05, -1.3]} to={[0.62, 0.05, 1.3]} color={color} radius={0.03} />
      {/* turntable with the record you're playing */}
      <group position={[0, 1.12, -0.55]}>
        <mesh>
          <boxGeometry args={[0.95, 0.06, 0.95]} />
          <meshStandardMaterial color="#c9c4d6" metalness={0.4} roughness={0.4} />
        </mesh>
        <group ref={platter} position={[0, 0.045, 0]}>
          <mesh>
            <cylinderGeometry args={[0.4, 0.4, 0.02, 40]} />
            <meshStandardMaterial color="#0b0b0f" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 40]} />
            {/* keyed: a material that gains a map needs a new shader */}
            <meshBasicMaterial
              key={art ? art.uuid : 'none'}
              map={art}
              color={art ? '#ffffff' : color}
              toneMapped={false}
            />
          </mesh>
        </group>
        <mesh position={[0.32, 0.08, 0.3]} rotation={[0, 0.5, 0]}>
          <boxGeometry args={[0.04, 0.03, 0.5]} />
          <meshStandardMaterial color="#ddd" metalness={0.8} />
        </mesh>
      </group>
      {/* mixer */}
      <mesh position={[0, 1.14, 0.35]}>
        <boxGeometry args={[0.6, 0.08, 0.5]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {[-0.15, 0, 0.15].map((z, i) => (
        <mesh key={z} position={[0.1, 1.2, 0.35 + z]}>
          <boxGeometry args={[0.05, 0.04, 0.08]} />
          <meshBasicMaterial color={['#ff4fd8', '#7dff9b', '#38e1ff'][i]} toneMapped={false} />
        </mesh>
      ))}
      {/* crate of on-deck records */}
      <group position={[0.2, 0, 1.75]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.7, 0.5, 0.6]} />
          <meshStandardMaterial color="#8a5a2b" roughness={0.9} />
        </mesh>
        {[-0.2, -0.05, 0.1].map((x, i) => (
          <mesh key={x} position={[x, 0.55, 0]} rotation={[0, 0, 0.12 - i * 0.08]}>
            <boxGeometry args={[0.03, 0.5, 0.5]} />
            <meshStandardMaterial color={['#ff4fd8', '#ffe066', '#38e1ff'][i]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ----------------------------- Ballot box ----------------------------- */

function BallotBox({ data, reducedMotion }: StationProps) {
  const color = STATIONS.ballot.color;
  const sign = useCanvasTexture(
    () => neonTexture({ text: data.ballotDone ? 'VOTED ✓' : 'VOTE', color, width: 512, height: 160 }),
    [data.ballotDone],
  );
  const slot = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (slot.current) {
      const pulse = reducedMotion ? 1 : 0.6 + Math.sin(clock.elapsedTime * 4) * 0.4;
      (slot.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });
  return (
    <group position={[4.6, 0, 4.4]} rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.8, 8]} />
        <meshStandardMaterial color="#2b2147" />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color="#f3ead2" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.15, 0.452]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={slot} position={[0, 1.505, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.08]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} />
      </mesh>
      {/* stack of chips */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0.65, 0.84 + i * 0.05, 0.1]}>
          <cylinderGeometry args={[0.13, 0.13, 0.045, 20]} />
          <meshStandardMaterial color={i % 2 ? '#ffb547' : '#ff4fd8'} />
        </mesh>
      ))}
      <mesh position={[0.65, 0.4, 0.1]}>
        <cylinderGeometry args={[0.18, 0.2, 0.82, 10]} />
        <meshStandardMaterial color="#2b2147" />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <planeGeometry args={[1.4, 0.44]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ----------------------------- Lineup wall ---------------------------- */

function LineupWall({ data }: StationProps) {
  const poster = useCanvasTexture(
    () =>
      cardTexture({
        title: 'The Lineup',
        lines:
          data.lineup.length > 0
            ? data.lineup.map((entry) => `${entry.place}. ${entry.name} · ${entry.points}`)
            : ['Results after round 1'],
        background: '#ffe066',
        width: 512,
        height: 680,
      }),
    [JSON.stringify(data.lineup)],
  );
  return (
    <group>
      <mesh position={[-4.6, 2.3, -6.97]}>
        <planeGeometry args={[2.2, 2.92]} />
        <meshStandardMaterial map={poster} roughness={0.8} emissive="#ffffff" emissiveIntensity={0.18} emissiveMap={poster} />
      </mesh>
      {/* tape */}
      {[
        [-5.6, 3.7],
        [-3.6, 3.7],
      ].map(([x, y]) => (
        <mesh key={x} position={[x, y, -6.95]} rotation={[0, 0, x < -4 ? 0.5 : -0.5]}>
          <planeGeometry args={[0.4, 0.12]} />
          <meshBasicMaterial color="#f5f0e6" transparent opacity={0.85} />
        </mesh>
      ))}
      <Trophy position={[-4.6, 0, -6.2]} />
    </group>
  );
}

function Trophy({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.7, 0.8, 0.7]} />
        <meshStandardMaterial color="#2b2147" />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.2, 12]} />
        <meshStandardMaterial color="#ffcf3f" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.18, 8]} />
        <meshStandardMaterial color="#ffcf3f" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <cylinderGeometry args={[0.24, 0.1, 0.4, 16, 1, true]} />
        <meshStandardMaterial color="#ffcf3f" metalness={0.9} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, 1.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.08, 0.02, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#ffcf3f" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------- Record crates -------------------------- */

function Crates({ data }: StationProps) {
  const covers = data.crateArt.slice(0, 6);
  return (
    <group position={[-6.5, 0, 3.4]}>
      {/* shelf */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.7, 2, 3.2]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
      </mesh>
      {[0.68, 1.36].map((y) => (
        <mesh key={y} position={[0.36, y, 0]}>
          <boxGeometry args={[0.04, 0.05, 3.1]} />
          <meshStandardMaterial color="#7a4f2b" />
        </mesh>
      ))}
      {covers.map((url, i) => (
        <Cover
          key={`${url}-${i}`}
          url={url}
          position={[0.38, i < 3 ? 1.7 : 1.02, -1 + (i % 3)]}
        />
      ))}
      {/* floor crates */}
      {[0, 1].map((i) => (
        <group key={i} position={[1.1, 0, -0.7 + i * 1.3]}>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.8, 0.5, 1]} />
            <meshStandardMaterial color="#9b6a35" roughness={0.9} />
          </mesh>
          {[-0.3, -0.15, 0, 0.15, 0.3].map((z, j) => (
            <mesh key={z} position={[0, 0.55, z]} rotation={[0.15 - j * 0.04, 0, 0]}>
              <boxGeometry args={[0.6, 0.55, 0.03]} />
              <meshStandardMaterial color={['#ff4fd8', '#38e1ff', '#7dff9b', '#ffe066', '#b78cff'][(i + j) % 5]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Cover({
  url,
  position,
}: {
  url: string;
  position: [number, number, number];
}) {
  const texture = useImageTexture(url);
  return (
    <mesh position={position} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.6, 0.6]} />
      {texture ? (
        <meshBasicMaterial map={texture} />
      ) : (
        <meshStandardMaterial color="#38e1ff" />
      )}
    </mesh>
  );
}

/* ------------------------------ Corkboard ----------------------------- */

function Corkboard({ data }: StationProps) {
  const notes = Math.max(3, Math.min(6, data.pollCount));
  return (
    <group position={[5.7, 0, -1.4]} rotation={[0, Math.PI / 4, 0]}>
      {/* easel legs */}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.9, -0.1]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[0.07, 1.9, 0.07]} />
          <meshStandardMaterial color="#5c3a1e" />
        </mesh>
      ))}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[1.9, 1.3, 0.08]} />
        <meshStandardMaterial color="#b9844f" roughness={1} />
      </mesh>
      {Array.from({ length: notes }).map((_, i) => (
        <group
          key={i}
          position={[-0.6 + (i % 3) * 0.6, 1.72 - Math.floor(i / 3) * 0.55, 0.05]}
          rotation={[0, 0, ((i * 37) % 10) / 40 - 0.12]}
        >
          <mesh>
            <planeGeometry args={[0.46, 0.4]} />
            <meshStandardMaterial
              color={i < data.openPollCount ? '#fff3a3' : '#f4efe6'}
            />
          </mesh>
          <mesh position={[0, 0.15, 0.02]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={['#ff5470', '#38e1ff', '#7dff9b'][i % 3]} />
          </mesh>
          {[0.04, -0.04, -0.12].map((y) => (
            <mesh key={y} position={[0, y, 0.005]}>
              <planeGeometry args={[0.32, 0.025]} />
              <meshBasicMaterial color="#9a8f80" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------- Jukebox ------------------------------ */

function Jukebox({ data, reducedMotion }: StationProps) {
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const color = STATIONS.jukebox.color;
  useFrame(({ clock }) => {
    if (glow.current) {
      const hue = reducedMotion ? 0.75 : (clock.elapsedTime * 0.08) % 1;
      glow.current.color.setHSL(hue, 0.9, 0.62);
    }
  });
  return (
    <group position={[5.6, 0, -6.2]}>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1.3, 1.6, 0.8]} />
        <meshStandardMaterial color="#5a1f3d" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.8, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#5a1f3d" roughness={0.5} />
      </mesh>
      {/* glowing arch */}
      <mesh position={[0, 1.6, 0.41]}>
        <ringGeometry args={[0.48, 0.58, 32, 1, 0, Math.PI]} />
        <meshBasicMaterial ref={glow} color={color} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.15, 0.41]}>
        <planeGeometry args={[0.9, 0.55]} />
        <meshBasicMaterial color={data.hasRecap ? '#ffe9a8' : '#3a2d4f'} toneMapped={false} />
      </mesh>
      {[-0.35, 0, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.45, 0.41]}>
          <planeGeometry args={[0.2, 0.55]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------- Exit -------------------------------- */

function ExitDoor() {
  const sign = useCanvasTexture(
    () => neonTexture({ text: 'EXIT', color: '#ff5470', width: 512, height: 180 }),
    [],
  );
  return (
    <group position={[-ROOM_HALF + 0.02, 0, 6]}>
      <mesh position={[0.02, 1.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.3, 2.5]} />
        <meshStandardMaterial color="#3d2c5e" />
      </mesh>
      <mesh position={[0.04, 1.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 2.3]} />
        <meshStandardMaterial color="#0f0b1c" />
      </mesh>
      <mesh position={[0.06, 1.2, 0.4]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.05, 2.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 0.38]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
