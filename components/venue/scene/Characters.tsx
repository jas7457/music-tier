'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { showBubble, useTrackAnchor } from './anchors';
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

const DANCE_CENTER: Vec3 = [0, 0, 0.6];

/** Floor spots for people who are done (dancing) or still to go (lounging). */
function getSpot(kind: 'dance' | 'wait', index: number, count: number): Vec3 {
  if (kind === 'dance') {
    const angle = (index / Math.max(count, 1)) * Math.PI * 2 + 0.4;
    const radius = count <= 3 ? 1.2 : 1.9;
    return [
      DANCE_CENTER[0] + Math.cos(angle) * radius,
      0,
      DANCE_CENTER[2] + Math.sin(angle) * radius,
    ];
  }
  const lounge: Vec3[] = [
    [1.2, 0, 5.3],
    [2.2, 0, 5.4],
    [3.2, 0, 5.3],
    [5.6, 0, 2.2],
    [6, 0, 0.9],
    [-1.2, 0, 5.6],
    [-2.2, 0, 5.2],
    [0, 0, 6.2],
  ];
  return lounge[index % lounge.length];
}

export function Friends({
  friends,
  reducedMotion,
}: {
  friends: FriendState[];
  reducedMotion: boolean;
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
}: {
  friend: FriendState;
  position: Vec3;
  pose: Pose;
  reducedMotion: boolean;
  seed: number;
}) {
  const root = useRef<THREE.Group>(null);
  useTrackAnchor(`friend:${friend.user._id}`, root, 2.05);

  // glide to a new spot when their status changes rather than teleporting
  const current = useRef(new THREE.Vector3(...position));
  const target = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame((_, delta) => {
    if (!root.current) {
      return;
    }
    current.current.lerp(target, Math.min(1, delta * 2));
    root.current.position.copy(current.current);
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
      <Body
        friend={friend}
        pose={pose}
        moving={false}
        reducedMotion={reducedMotion}
        seed={seed}
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
}: {
  friend: FriendState;
  pose: Pose;
  moving: boolean;
  reducedMotion: boolean;
  seed: number;
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
        {/* legs */}
        <mesh ref={leftLeg} position={[-0.12, 0.42, 0]} geometry={legGeometry}>
          <meshStandardMaterial color="#1d1d2b" />
        </mesh>
        <mesh ref={rightLeg} position={[0.12, 0.42, 0]} geometry={legGeometry}>
          <meshStandardMaterial color="#1d1d2b" />
        </mesh>
        {/* torso */}
        <mesh position={[0, 0.82, 0]}>
          <capsuleGeometry args={[0.23, 0.32, 6, 12]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* arms pivot at the shoulder */}
        <group ref={leftArm} position={[-0.29, 0.98, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.29, 0.98, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
        {/* head with the photo as a face that always looks at the camera */}
        <Billboard position={[0, 1.45, 0]}>
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
          {pose === 'wait' && (
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

const legGeometry = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8).translate(
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
  positionRef,
}: {
  me: FriendState;
  destination: Vec3 | null;
  reducedMotion: boolean;
  onArrive?: () => void;
  positionRef: React.RefObject<THREE.Vector3>;
}) {
  const root = useRef<THREE.Group>(null);
  useTrackAnchor(`friend:${me.user._id}`, root, 2.05);
  const movingRef = useRef(false);
  const target = useRef<THREE.Vector3 | null>(null);
  const arrivedRef = useRef(onArrive);
  useEffect(() => {
    arrivedRef.current = onArrive;
  }, [onArrive]);

  useEffect(() => {
    if (!destination) {
      return;
    }
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(destination[0], -ROOM_HALF + 0.6, ROOM_HALF - 0.4),
      0,
      THREE.MathUtils.clamp(destination[2], -ROOM_HALF + 0.6, ROOM_HALF - 0.4),
    );
    if (reducedMotion) {
      positionRef.current.copy(target.current);
    }
  }, [destination, reducedMotion, positionRef]);

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) {
      return;
    }
    const pos = positionRef.current;
    const goal = target.current;
    if (goal) {
      const toGoal = goal.clone().sub(pos);
      const distance = toGoal.length();
      if (distance < 0.05) {
        target.current = null;
        movingRef.current = false;
        arrivedRef.current?.();
      } else {
        movingRef.current = true;
        const step = Math.min(distance, delta * 4.2);
        pos.add(toGoal.normalize().multiplyScalar(step));
        const heading = Math.atan2(toGoal.x, toGoal.z);
        group.rotation.y = lerpAngle(group.rotation.y, heading, Math.min(1, delta * 12));
      }
    }
    group.position.copy(pos);
  });

  return (
    <group
      ref={root}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) {
          return;
        }
        e.stopPropagation();
        showBubble(me.user._id);
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

function lerpAngle(from: number, to: number, t: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}
