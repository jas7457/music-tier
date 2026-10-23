'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { Billboard } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { STATIONS, StationId, ROOM_HALF } from '../stations';
import {
  AVATAR_COLORS,
  initialTexture,
  lineupPosterTexture,
  neonTexture,
  useCanvasTexture,
  useImageTexture,
} from './textures';
import { NeonTube } from './Room';
import { Block, ToonMaterial } from './toon';
import { StaticAnchor } from './anchors';

export type StationSceneData = {
  heroImageUrl: string | null;
  heroFocal: [number, number];
  marqueeTitle: string;
  marqueeSubtitle: string;
  moodColor: string;
  spinningArt: string | null;
  leagueTitle: string;
  lineup: Array<{ name: string; points: number; place: number }>;
  // top three of the standings, for the podium
  podium: Array<{
    name: string;
    photoUrl?: string;
    colorIndex: number;
    place: number;
    points: number;
  }>;
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
  anchor = true,
  reducedMotion,
  children,
}: {
  id: StationId;
  reducedMotion: boolean;
  onSelect: (id: StationId) => void;
  isQuest: boolean;
  // whether this is the station's labelled spot (props can share a station)
  anchor?: boolean;
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
      {isQuest && (
        <QuestRing
          position={station.approach}
          color={station.color}
          reducedMotion={reducedMotion}
        />
      )}
      {anchor && <StaticAnchor id={`station:${id}`} position={labelPos} />}
      {anchor && <StaticAnchor id={`pointer:${id}`} position={labelPos} />}
    </group>
  );
}

function QuestRing({
  position,
  color,
  reducedMotion,
}: {
  position: [number, number, number];
  color: string;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) {
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
  const common = { onSelect, reducedMotion };
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
      {data.heroImageUrl && (
        <StationHit id="stage" {...common} isQuest={false} anchor={false}>
          <HeroFrame url={data.heroImageUrl} focal={data.heroFocal} />
        </StationHit>
      )}
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
      <Block size={[5.4, 0.5, 2.6]} position={[0.5, 0.25, -5.6]} color="#3a2a5c" />
      <NeonTube from={[-2.2, 0.51, -4.3]} to={[3.2, 0.51, -4.3]} color="#ff4fd8" radius={0.035} />
      {/* curtain */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[-1.9 + i * 0.6, 1.8, -6.85]}>
          <cylinderGeometry args={[0.32, 0.32, 2.6, 8, 1, false, 0, Math.PI]} />
          <ToonMaterial color="#8b1e3f" side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* marquee board */}
      <Block size={[4.8, 1.2, 0.12]} position={[0.5, 3.6, -6.45]} color="#0d0a18" />
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
          <ToonMaterial color="#222" />
        </mesh>
      </group>
      {/* speakers */}
      {[-1.65, 3.6].map((x) => (
        <group key={x} position={[x, x < 0 ? 0.5 : 0, -5.8]}>
          <Block size={[0.9, 1.8, 0.8]} position={[0, 0.9, 0]} color="#141020" />
          <mesh position={[0, 1.25, 0.41]}>
            <circleGeometry args={[0.28, 24]} />
            <ToonMaterial color="#2b2540" />
          </mesh>
          <mesh position={[0, 0.55, 0.41]}>
            <circleGeometry args={[0.36, 24]} />
            <ToonMaterial color="#2b2540" />
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
      <Block size={[1.2, 1.1, 2.6]} position={[0, 0.55, 0]} color="#17122a" />
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
            <ToonMaterial color="#0b0b0f" />
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
      <Block size={[0.6, 0.08, 0.5]} position={[0, 1.14, 0.35]} color="#222" />
      {[-0.15, 0, 0.15].map((z, i) => (
        <mesh key={z} position={[0.1, 1.2, 0.35 + z]}>
          <boxGeometry args={[0.05, 0.04, 0.08]} />
          <meshBasicMaterial color={['#ff4fd8', '#7dff9b', '#38e1ff'][i]} toneMapped={false} />
        </mesh>
      ))}
      {/* crate of on-deck records */}
      <group position={[0.2, 0, 1.75]}>
        <Block size={[0.7, 0.5, 0.6]} position={[0, 0.25, 0]} color="#8a5a2b" />
        {[-0.2, -0.05, 0.1].map((x, i) => (
          <Block size={[0.035, 0.5, 0.5]} key={x} position={[x, 0.55, 0]} rotation={[0, 0, 0.12 - i * 0.08]} color={['#ff4fd8', '#ffe066', '#38e1ff'][i]} radius={0.015} />
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
        <ToonMaterial color="#2b2147" />
      </mesh>
      <Block size={[0.9, 0.7, 0.9]} position={[0, 1.15, 0]} color="#f3ead2" />
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
          <ToonMaterial color={i % 2 ? '#ffb547' : '#ff4fd8'} />
        </mesh>
      ))}
      <mesh position={[0.65, 0.4, 0.1]}>
        <cylinderGeometry args={[0.18, 0.2, 0.82, 10]} />
        <ToonMaterial color="#2b2147" />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <planeGeometry args={[1.4, 0.44]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ----------------------------- Lineup wall ---------------------------- */

const MEDALS = [
  { color: '#ffcf3f', height: 0.95, x: -4.6 }, // 1st, centre and tallest
  { color: '#cfd6e6', height: 0.65, x: -5.45 }, // 2nd, left
  { color: '#e0915a', height: 0.45, x: -3.75 }, // 3rd, right
];

function LineupWall({ data, reducedMotion }: StationProps) {
  const poster = useCanvasTexture(
    () =>
      lineupPosterTexture({
        leagueTitle: data.leagueTitle,
        acts: data.lineup,
      }),
    [data.leagueTitle, JSON.stringify(data.lineup)],
  );
  const sign = useCanvasTexture(
    () =>
      neonTexture({
        text: 'THE LINEUP',
        color: '#ffcf3f',
        width: 1024,
        height: 200,
        fontSize: 140,
      }),
    [],
  );
  const trophy = useRef<THREE.Group>(null);
  const bulbs = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (reducedMotion) {
      return;
    }
    if (trophy.current) {
      trophy.current.rotation.y = clock.elapsedTime * 0.9;
      trophy.current.position.y = 1.02 + Math.sin(clock.elapsedTime * 2) * 0.04;
    }
    // chasing marquee bulbs
    bulbs.current?.children.forEach((bulb, i) => {
      const on = Math.floor(clock.elapsedTime * 6 - i) % 3 === 0;
      ((bulb as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(
        on ? '#fff3c4' : '#7a5a1a',
      );
    });
  });

  // frame of bulbs around the poster
  const bulbPositions = useMemo(() => {
    const list: Array<[number, number]> = [];
    const w = 1.45;
    const top = 3.95;
    const bottom = 1.2;
    for (let x = -w; x <= w + 0.001; x += 0.29) {
      list.push([x, top], [x, bottom]);
    }
    for (let y = bottom + 0.275; y < top - 0.1; y += 0.275) {
      list.push([-w, y], [w, y]);
    }
    return list;
  }, []);

  return (
    <group>
      {/* poster in a gold frame */}
      <group position={[-4.6, 2.575, -6.97]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[2.7, 3.1, 0.06]} />
          <meshStandardMaterial color="#c99a2e" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.015]}>
          <planeGeometry args={[2.4, 2.8]} />
          <meshBasicMaterial map={poster} toneMapped={false} />
        </mesh>
      </group>
      <group ref={bulbs} position={[-4.6, 0, -6.9]}>
        {bulbPositions.map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#fff3c4" toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* neon sign above it all */}
      <mesh position={[-4.6, 4.22, -6.9]}>
        <planeGeometry args={[2.4, 0.47]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      <pointLight position={[-4.6, 2.6, -5.6]} color="#ffd88a" intensity={6} distance={4} />

      {/* the podium */}
      {MEDALS.map((medal, i) => {
        const act = data.podium[i];
        return (
          <group key={i} position={[medal.x, 0, -6.15]}>
            <Block size={[0.82, medal.height, 0.8]} position={[0, medal.height / 2, 0]} color="#241a3d" />
            {/* medal-coloured top and trim */}
            <mesh position={[0, medal.height + 0.015, 0]}>
              <boxGeometry args={[0.86, 0.03, 0.84]} />
              <meshStandardMaterial
                color={medal.color}
                metalness={0.85}
                roughness={0.25}
                emissive={medal.color}
                emissiveIntensity={0.15}
              />
            </mesh>
            <PodiumNumber place={i + 1} color={medal.color} height={medal.height} />
            {act && (
              <PodiumFace
                act={act}
                color={medal.color}
                height={medal.height}
                crowned={i === 0}
              />
            )}
          </group>
        );
      })}
      {/* trophy floating over the winner's spot */}
      <group ref={trophy} position={[-4.6, 1.02, -6.55]} scale={0.7}>
        <TrophyCup />
      </group>
    </group>
  );
}

function PodiumNumber({
  place,
  color,
  height,
}: {
  place: number;
  color: string;
  height: number;
}) {
  const texture = useCanvasTexture(
    () =>
      neonTexture({
        text: String(place),
        color,
        width: 256,
        height: 256,
        fontSize: 200,
      }),
    [place, color],
  );
  return (
    <mesh position={[0, height / 2, 0.405]}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/** A standee of the player: their face on a disc, ringed in their medal colour. */
function PodiumFace({
  act,
  color,
  height,
  crowned,
}: {
  act: StationSceneData['podium'][number];
  color: string;
  height: number;
  crowned: boolean;
}) {
  const fallback = useCanvasTexture(
    () =>
      initialTexture(
        act.name.charAt(0).toUpperCase(),
        AVATAR_COLORS[act.colorIndex % AVATAR_COLORS.length],
      ),
    [act.name, act.colorIndex],
  );
  const face = useImageTexture(act.photoUrl, { circle: true, fallback });
  return (
    <Billboard position={[0, height + 0.55, 0]}>
      <mesh>
        <circleGeometry args={[0.42, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.37, 40]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      {crowned && (
        <group position={[0, 0.5, 0.02]}>
          <mesh>
            <planeGeometry args={[0.46, 0.15]} />
            <meshBasicMaterial color="#ffcf3f" toneMapped={false} />
          </mesh>
          {[-0.17, 0, 0.17].map((x) => (
            <mesh key={x} position={[x, 0.12, 0]}>
              <circleGeometry args={[0.08, 3, Math.PI / 2]} />
              <meshBasicMaterial color="#ffcf3f" toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
    </Billboard>
  );
}

function TrophyCup() {
  const gold = (
    <meshStandardMaterial
      color="#ffcf3f"
      metalness={0.9}
      roughness={0.2}
      emissive="#7a5200"
      emissiveIntensity={0.4}
    />
  );
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.2, 12]} />
        {gold}
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.18, 8]} />
        {gold}
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.24, 0.1, 0.4, 16, 1, true]} />
        <meshStandardMaterial
          color="#ffcf3f"
          metalness={0.9}
          roughness={0.2}
          emissive="#7a5200"
          emissiveIntensity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.25, 0.58, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.08, 0.02, 6, 12, Math.PI]} />
          {gold}
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
      <Block size={[0.7, 2, 3.2]} position={[0, 1, 0]} color="#5c3a1e" />
      {[0.68, 1.36].map((y) => (
        <Block size={[0.04, 0.05, 3.1]} key={y} position={[0.36, y, 0]} color="#7a4f2b" />
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
          <Block size={[0.8, 0.5, 1]} position={[0, 0.25, 0]} color="#9b6a35" />
          {[-0.3, -0.15, 0, 0.15, 0.3].map((z, j) => (
            <Block size={[0.6, 0.55, 0.035]} key={z} position={[0, 0.55, z]} rotation={[0.15 - j * 0.04, 0, 0]} color={['#ff4fd8', '#38e1ff', '#7dff9b', '#ffe066', '#b78cff'][(i + j) % 5]} radius={0.015} />
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
        <ToonMaterial color="#38e1ff" />
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
        <Block size={[0.07, 1.9, 0.07]} key={x} position={[x, 0.9, -0.1]} rotation={[0.12, 0, 0]} color="#5c3a1e" />
      ))}
      <Block size={[1.9, 1.3, 0.08]} position={[0, 1.45, 0]} color="#b9844f" />
      {Array.from({ length: notes }).map((_, i) => (
        <group
          key={i}
          position={[-0.6 + (i % 3) * 0.6, 1.72 - Math.floor(i / 3) * 0.55, 0.05]}
          rotation={[0, 0, ((i * 37) % 10) / 40 - 0.12]}
        >
          <mesh>
            <planeGeometry args={[0.46, 0.4]} />
            <ToonMaterial color={i < data.openPollCount ? '#fff3a3' : '#f4efe6'} />
          </mesh>
          <mesh position={[0, 0.15, 0.02]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <ToonMaterial color={['#ff5470', '#38e1ff', '#7dff9b'][i % 3]} />
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
      <Block size={[1.3, 1.6, 0.8]} position={[0, 0.8, 0]} color="#5a1f3d" />
      <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.8, 24, 1, false, 0, Math.PI]} />
        <ToonMaterial color="#5a1f3d" />
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
        <ToonMaterial color="#3d2c5e" />
      </mesh>
      <mesh position={[0.04, 1.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 2.3]} />
        <ToonMaterial color="#0f0b1c" />
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

/* ------------------------- League photo on the wall -------------------- */

const FRAME_W = 2.4;
const FRAME_H = 1.6;

/** The league's cover photo, framed on the left wall (cropped round its focal point). */
function HeroFrame({ url, focal }: { url: string; focal: [number, number] }) {
  const source = useImageTexture(url);
  const texture = useMemo(() => {
    if (!source?.image) {
      return null;
    }
    const image = source.image as HTMLImageElement;
    const t = source.clone();
    // cover-crop to the frame's aspect, centred on the focal point
    const imageAspect = image.width / image.height;
    const frameAspect = FRAME_W / FRAME_H;
    if (imageAspect > frameAspect) {
      t.repeat.set(frameAspect / imageAspect, 1);
    } else {
      t.repeat.set(1, imageAspect / frameAspect);
    }
    t.offset.set(
      THREE.MathUtils.clamp((focal[0] / 100) * (1 - t.repeat.x) * 1, 0, 1 - t.repeat.x),
      THREE.MathUtils.clamp((1 - focal[1] / 100) * (1 - t.repeat.y), 0, 1 - t.repeat.y),
    );
    t.needsUpdate = true;
    return t;
  }, [source, focal]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) {
    return null;
  }
  return (
    <group position={[-ROOM_HALF + 0.03, 2.5, -4.4]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[FRAME_W + 0.2, FRAME_H + 0.2, 0.06]} />
        <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[FRAME_W, FRAME_H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
