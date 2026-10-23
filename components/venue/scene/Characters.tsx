'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { showBubble, useTrackAnchor } from './anchors';
import { findPath, freeSpot, stepTowards } from './pathing';
import { EMOTE_MS, getExpression, getMove } from '../expressions';
import { getRemoteSpot, reportPosition } from '../live';
import { Ink, ToonMaterial } from './toon';
import { useMovementKeys } from './keyboard';
import { STATION_ORDER, STATIONS, type StationId } from '../stations';
import type { FriendState } from '../venueModel';
import {
  AVATAR_COLORS,
  initialTexture,
  neonTexture,
  useCanvasTexture,
  useImageTexture,
} from './textures';
import { ROOM_HALF, type Vec3 } from '../stations';

export type Pose = 'dance' | 'idle' | 'wait';

const DANCE_CENTER: Vec3 = [0, 0, 0];

/** Floor spots for people who are done (dancing) or still to go (lounging). */
function getSpot(kind: 'dance' | 'wait', index: number, count: number): Vec3 {
  if (kind === 'dance') {
    const angle = (index / Math.max(count, 1)) * Math.PI * 2 + 0.4;
    const radius = count <= 3 ? 1.8 : 2.8;
    return [
      DANCE_CENTER[0] + Math.cos(angle) * radius,
      0,
      DANCE_CENTER[2] + Math.sin(angle) * radius,
    ];
  }
  // by the couch, then at the bar
  const lounge: Vec3[] = [
    [1.2, 0, 8.6],
    [2.3, 0, 8.7],
    [3.3, 0, 8.6],
    [7.4, 0, 2.3],
    [7.4, 0, 3.6],
    [-0.4, 0, 8.4],
    [7.4, 0, 4.9],
    [0.6, 0, 7.4],
  ];
  return lounge[index % lounge.length];
}

export function Friends({
  friends,
  reducedMotion,
  online,
}: {
  friends: FriendState[];
  reducedMotion: boolean;
  // who's in the venue right now: they walk where they really are
  online: ReadonlySet<string>;
}) {
  const others = friends.filter((friend) => !friend.isYou);
  const done = others.filter((friend) => friend.isDone);
  const waiting = others.filter((friend) => !friend.isDone);
  return (
    <group>
      {done.map((friend, i) => (
        <Character
          key={friend.user._id}
          friend={friend}
          position={getSpot('dance', i, done.length)}
          pose="dance"
          reducedMotion={reducedMotion}
          seed={i}
          live={online.has(friend.user._id)}
        />
      ))}
      {waiting.map((friend, i) => (
        <Character
          key={friend.user._id}
          friend={friend}
          position={getSpot('wait', i, waiting.length)}
          pose="wait"
          reducedMotion={reducedMotion}
          seed={i + 10}
          live={online.has(friend.user._id)}
        />
      ))}
    </group>
  );
}

function useFaceTexture(friend: FriendState) {
  const color = AVATAR_COLORS[friend.user.index % AVATAR_COLORS.length];
  const fallback = useCanvasTexture(
    () => initialTexture(friend.user.userName.charAt(0).toUpperCase(), color),
    [friend.user.userName, color],
  );
  return {
    face: useImageTexture(friend.user.photoUrl, { circle: true, fallback }),
    color,
  };
}

/** A bobble-headed little person with the user's photo for a face. */
function Character({
  friend,
  position,
  pose,
  reducedMotion,
  seed,
  live,
}: {
  friend: FriendState;
  position: Vec3;
  pose: Pose;
  reducedMotion: boolean;
  seed: number;
  // online right now: walks to where they really are instead of their spot
  live: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  useTrackAnchor(`friend:${friend.user._id}`, root, 2.05);
  useTrackAnchor(`say:${friend.user._id}`, root, 2.25);
  const movingRef = useRef(false);

  // glide to a new spot when their status changes rather than teleporting
  const current = useRef(new THREE.Vector3(...position));
  const target = useMemo(() => new THREE.Vector3(...position), [position]);
  const liveTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) {
      return;
    }
    const spot = live ? getRemoteSpot(friend.user._id) : undefined;
    if (!spot) {
      movingRef.current = false;
      current.current.lerp(target, Math.min(1, delta * 2));
      group.position.copy(current.current);
      return;
    }
    // walk after where they say they are (it arrives a few times a second)
    liveTarget.set(spot.x, 0, spot.z);
    const toGoal = liveTarget.clone().sub(current.current);
    const distance = toGoal.length();
    if (distance > 6 || reducedMotion) {
      current.current.copy(liveTarget);
      movingRef.current = false;
    } else if (distance > 0.04) {
      const step = Math.min(distance, Math.min(delta, 0.1) * 5);
      current.current.addScaledVector(toGoal.normalize(), step);
      group.rotation.y = lerpAngle(
        group.rotation.y,
        Math.atan2(toGoal.x, toGoal.z),
        Math.min(1, delta * 12),
      );
      movingRef.current = true;
    } else {
      movingRef.current = false;
    }
    group.position.copy(current.current);
  });

  return (
    <group
      ref={root}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) {
          return;
        }
        e.stopPropagation();
        showBubble(friend.user._id);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {live && (
        // online now: a green glow under their feet
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
          <ringGeometry args={[0.42, 0.54, 32]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
      <Body
        friend={friend}
        pose={pose}
        moving={false}
        movingRef={movingRef}
        reducedMotion={reducedMotion}
        seed={seed}
        online={live}
      />
    </group>
  );
}

export function Body({
  friend,
  pose,
  moving,
  reducedMotion,
  seed,
  movingRef,
  online = false,
}: {
  friend: FriendState;
  pose: Pose;
  moving: boolean;
  reducedMotion: boolean;
  seed: number;
  // show a green "online" dot on their face
  online?: boolean;
  // when given, read each frame instead of `moving` (for the player)
  movingRef?: React.RefObject<boolean>;
}) {
  const { face, color } = useFaceTexture(friend);
  const bodyRef = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const waitBubble = useCanvasTexture(
    () =>
      neonTexture({
        text: '…',
        color: '#ffffff',
        width: 256,
        height: 128,
        fontSize: 110,
      }),
    [],
  );
  const isLeader = friend.place === 1;

  useFrame(({ clock }) => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    const isMoving = movingRef ? movingRef.current : moving;
    const t = clock.elapsedTime + seed * 0.73;
    if (reducedMotion) {
      body.position.y = 0;
      return;
    }
    if (isMoving) {
      const swing = Math.sin(t * 12) * 0.6;
      body.position.y = Math.abs(Math.sin(t * 12)) * 0.06;
      body.rotation.z = 0;
      if (leftLeg.current) leftLeg.current.rotation.x = swing;
      if (rightLeg.current) rightLeg.current.rotation.x = -swing;
      body.rotation.y = 0;
      if (leftArm.current) {
        leftArm.current.rotation.x = -swing;
        leftArm.current.rotation.z = 0.15;
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = swing;
        rightArm.current.rotation.z = -0.15;
      }
      return;
    }
    if (leftLeg.current) leftLeg.current.rotation.x = 0;
    if (rightLeg.current) rightLeg.current.rotation.x = 0;

    // acting out an emote takes over from the idle / dance loop
    const expression = getExpression(friend.user._id);
    const move = getMove(expression);
    if (move && expression) {
      const progress = Math.min(1, (Date.now() - expression.at) / EMOTE_MS);
      const left = leftArm.current;
      const right = rightArm.current;
      body.rotation.z = 0;
      body.rotation.y = 0;
      body.position.y = 0;
      if (left) {
        left.rotation.set(0, 0, 0.15);
      }
      if (right) {
        right.rotation.set(0, 0, -0.15);
      }
      switch (move) {
        case 'wave':
          if (right) {
            right.rotation.z = -2.6 + Math.sin(t * 14) * 0.4;
          }
          body.rotation.z = -0.08;
          break;
        case 'spin':
          body.rotation.y = progress * Math.PI * 4;
          body.position.y = Math.abs(Math.sin(progress * Math.PI * 4)) * 0.25;
          if (left) left.rotation.z = 2.4;
          if (right) right.rotation.z = -2.4;
          break;
        case 'hop':
          body.position.y = Math.abs(Math.sin(progress * Math.PI * 5)) * 0.4;
          if (left) left.rotation.z = 1.2 + Math.sin(t * 20) * 0.3;
          if (right) right.rotation.z = -1.2 - Math.sin(t * 20) * 0.3;
          break;
        case 'clap': {
          const clap = Math.abs(Math.sin(t * 16)) * 0.5;
          if (left) {
            left.rotation.x = -1.3;
            left.rotation.z = -0.2 - clap;
          }
          if (right) {
            right.rotation.x = -1.3;
            right.rotation.z = 0.2 + clap;
          }
          break;
        }
      }
      return;
    }

    if (pose === 'dance') {
      const beat = t * 4.2;
      body.position.y = Math.abs(Math.sin(beat)) * 0.16;
      body.rotation.z = Math.sin(beat / 2) * 0.12;
      body.rotation.y = Math.sin(t * 0.7) * 0.6;
      if (leftArm.current) {
        leftArm.current.rotation.x = 0;
        leftArm.current.rotation.z = 2.3 + Math.sin(beat) * 0.4;
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = 0;
        rightArm.current.rotation.z = -2.3 - Math.cos(beat) * 0.4;
      }
    } else {
      body.position.y = Math.sin(t * 1.6) * 0.015;
      body.rotation.z = 0;
      body.rotation.y = pose === 'wait' ? Math.sin(t * 0.4) * 0.3 : 0;
      if (leftArm.current) {
        leftArm.current.rotation.x = 0;
        leftArm.current.rotation.z = 0.15;
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = 0;
        rightArm.current.rotation.z = -0.15;
      }
    }
  });

  return (
    <group>
      {/* blob shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.38, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <group ref={bodyRef}>
        {/* stubby legs */}
        <mesh ref={leftLeg} position={[-0.13, 0.42, 0]} geometry={legGeometry} castShadow>
          <ToonMaterial color={shade(color, -0.35)} />
          <Ink thickness={0.025} />
        </mesh>
        <mesh ref={rightLeg} position={[0.13, 0.42, 0]} geometry={legGeometry} castShadow>
          <ToonMaterial color={shade(color, -0.35)} />
          <Ink thickness={0.025} />
        </mesh>
        {/* bean-shaped body */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <capsuleGeometry args={[0.28, 0.3, 8, 16]} />
          <ToonMaterial color={color} />
          <Ink thickness={0.03} />
        </mesh>
        {/* backpack */}
        <mesh position={[0, 0.8, -0.27]} castShadow>
          <capsuleGeometry args={[0.14, 0.2, 6, 10]} />
          <ToonMaterial color={shade(color, -0.2)} />
          <Ink thickness={0.025} />
        </mesh>
        {/* arms pivot at the shoulder */}
        <group ref={leftArm} position={[-0.31, 0.95, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.24, 4, 8]} />
            <ToonMaterial color={color} />
            <Ink thickness={0.02} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.31, 0.95, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.24, 4, 8]} />
            <ToonMaterial color={color} />
            <Ink thickness={0.02} />
          </mesh>
        </group>
        {/* head with the photo as a face that always looks at the camera */}
        <Billboard position={[0, 1.45, 0]}>
          <mesh position={[0, 0, -0.01]}>
            <circleGeometry args={[0.395, 32]} />
            <meshBasicMaterial color="#140c24" />
          </mesh>
          <mesh>
            <circleGeometry args={[0.36, 32]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <circleGeometry args={[0.32, 32]} />
            <meshBasicMaterial map={face} toneMapped={false} />
          </mesh>
          {isLeader && (
            <group position={[0, 0.42, 0.02]}>
              <mesh>
                <planeGeometry args={[0.42, 0.14]} />
                <meshBasicMaterial color="#ffcf3f" toneMapped={false} />
              </mesh>
              {[-0.16, 0, 0.16].map((x) => (
                <mesh key={x} position={[x, 0.11, 0]}>
                  <circleGeometry args={[0.07, 3, Math.PI / 2]} />
                  <meshBasicMaterial color="#ffcf3f" toneMapped={false} />
                </mesh>
              ))}
            </group>
          )}
          {online && (
            <group position={[0.27, 0.27, 0.03]}>
              <mesh>
                <circleGeometry args={[0.1, 20]} />
                <meshBasicMaterial color="#140c24" />
              </mesh>
              <mesh position={[0, 0, 0.005]}>
                <circleGeometry args={[0.075, 20]} />
                <meshBasicMaterial color="#4ade80" toneMapped={false} />
              </mesh>
            </group>
          )}
          {pose === 'wait' && !online && (
            <mesh position={[0.42, 0.42, 0.02]}>
              <planeGeometry args={[0.5, 0.25]} />
              <meshBasicMaterial map={waitBubble} transparent toneMapped={false} />
            </mesh>
          )}
        </Billboard>
      </group>
    </group>
  );
}

/** A colour, lightened (+) or darkened (-) by amount (0..1). */
function shade(color: string, amount: number) {
  const c = new THREE.Color(color);
  return amount >= 0
    ? `#${c.lerp(new THREE.Color('#ffffff'), amount).getHexString()}`
    : `#${c.lerp(new THREE.Color('#000000'), -amount).getHexString()}`;
}

const legGeometry = new THREE.CapsuleGeometry(0.1, 0.24, 4, 8).translate(
  0,
  -0.12,
  0,
);

/**
 * You. Walks to wherever you tap, or to the station you picked.
 */
export function Player({
  me,
  destination,
  reducedMotion,
  onArrive,
  onNearStation,
  openStation,
  onLeaveStation,
  positionRef,
}: {
  // the station whose panel is open, if any
  openStation?: StationId | null;
  // you walked (with the keyboard) too far from the open station
  onLeaveStation?: () => void;
  me: FriendState;
  destination: Vec3 | null;
  reducedMotion: boolean;
  onArrive?: () => void;
  // after walking with the keyboard: the station you're standing at, if any
  onNearStation?: (id: StationId | null) => void;
  positionRef: React.RefObject<THREE.Vector3>;
}) {
  const root = useRef<THREE.Group>(null);
  const readKeys = useMovementKeys();
  const nearRef = useRef<StationId | null>(null);
  const usedKeysRef = useRef(false);
  const nearCallback = useRef(onNearStation);
  const leaveCallback = useRef(onLeaveStation);
  const openRef = useRef(openStation);
  useEffect(() => {
    nearCallback.current = onNearStation;
    leaveCallback.current = onLeaveStation;
    openRef.current = openStation;
  }, [onNearStation, onLeaveStation, openStation]);
  useTrackAnchor(`friend:${me.user._id}`, root, 2.05);
  useTrackAnchor(`say:${me.user._id}`, root, 2.25);
  const movingRef = useRef(false);
  const waypoints = useRef<THREE.Vector3[]>([]);
  const arrivedRef = useRef(onArrive);
  useEffect(() => {
    arrivedRef.current = onArrive;
  }, [onArrive]);

  useEffect(() => {
    if (!destination) {
      return;
    }
    const goal = freeSpot({
      x: THREE.MathUtils.clamp(destination[0], -ROOM_HALF + 0.6, ROOM_HALF - 0.4),
      z: THREE.MathUtils.clamp(destination[2], -ROOM_HALF + 0.6, ROOM_HALF - 0.4),
    });
    const start = positionRef.current;
    usedKeysRef.current = false;
    const path = findPath({ x: start.x, z: start.z }, goal);
    waypoints.current = path.map((p) => new THREE.Vector3(p.x, 0, p.z));
    if (reducedMotion) {
      positionRef.current.copy(waypoints.current[waypoints.current.length - 1]);
      waypoints.current = [];
    }
  }, [destination, reducedMotion, positionRef]);

  const reportNear = (pos: THREE.Vector3) => {
    // only offered after keyboard walking; taps open stations directly
    let near: StationId | null = null;
    if (usedKeysRef.current) {
      let best = 1.6;
      for (const id of STATION_ORDER) {
        const [x, , z] = STATIONS[id].approach;
        const distance = Math.hypot(pos.x - x, pos.z - z);
        if (distance < best) {
          best = distance;
          near = id;
        }
      }
    }
    if (near !== nearRef.current) {
      nearRef.current = near;
      nearCallback.current?.(near);
    }
  };

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) {
      return;
    }
    const pos = positionRef.current;
    const speed = 4.2;

    // Keyboard: walk in the held direction, relative to the screen (up is
    // away from the camera), sliding along furniture.
    const input = readKeys();
    if (input) {
      waypoints.current = [];
      usedKeysRef.current = true;
      const step = Math.min(delta, 0.1) * speed;
      const dx = (input.x - input.y) * Math.SQRT1_2;
      const dz = (-input.x - input.y) * Math.SQRT1_2;
      const next = stepTowards({ x: pos.x, z: pos.z }, dx * step, dz * step);
      const moved = next.x !== pos.x || next.z !== pos.z;
      pos.set(next.x, 0, next.z);
      group.rotation.y = lerpAngle(
        group.rotation.y,
        Math.atan2(dx, dz),
        Math.min(1, delta * 14),
      );
      movingRef.current = moved;
      group.position.copy(pos);
      reportNear(pos);
      reportPosition(pos.x, pos.z);
      // walking away from an open station closes its panel
      const open = openRef.current;
      if (moved && open) {
        const [x, , z] = STATIONS[open].approach;
        if (Math.hypot(pos.x - x, pos.z - z) > LEAVE_DISTANCE) {
          openRef.current = null;
          leaveCallback.current?.();
        }
      }
      return;
    }

    let budget = Math.min(delta, 0.1) * speed;
    while (waypoints.current.length > 0 && budget > 0) {
      const goal = waypoints.current[0];
      const toGoal = goal.clone().sub(pos);
      const distance = toGoal.length();
      if (distance < 1e-3) {
        waypoints.current.shift();
        continue;
      }
      const step = Math.min(distance, budget);
      budget -= step;
      pos.add(toGoal.normalize().multiplyScalar(step));
      const heading = Math.atan2(toGoal.x, toGoal.z);
      group.rotation.y = lerpAngle(group.rotation.y, heading, Math.min(1, delta * 12));
      if (step === distance) {
        waypoints.current.shift();
        if (waypoints.current.length === 0) {
          arrivedRef.current?.();
        }
      }
    }
    movingRef.current = waypoints.current.length > 0;
    group.position.copy(pos);
    reportNear(pos);
    reportPosition(pos.x, pos.z);
  });



  return (
    <group
      ref={root}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) {
          return;
        }
        e.stopPropagation();
        showBubble(me.user._id, { sticky: true });
      }}
    >
      {/* spotlight on you */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[0.42, 0.52, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} toneMapped={false} />
      </mesh>
      <Body
        friend={me}
        pose={me.isDone ? 'dance' : 'idle'}
        moving={false}
        movingRef={movingRef}
        reducedMotion={reducedMotion}
        seed={99}
      />
    </group>
  );
}

// how far (world units) you can wander from a station before its panel closes
const LEAVE_DISTANCE = 2.6;

function lerpAngle(from: number, to: number, t: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}
