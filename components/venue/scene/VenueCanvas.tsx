'use client';

import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { Room } from './Room';
import { Stations, StationSceneData } from './Stations';
import { Friends, Player } from './Characters';
import { CameraRig, CameraFocus, CAMERA_FOV } from './CameraRig';
import { AnchorProjector } from './anchors';
import { Confetti, MusicNotes } from './Effects';
import { Decor } from './Decor';
import { ROOM_HALF, SPAWN, StationId, Vec3 } from '../stations';
import type { FriendState } from '../venueModel';

export type VenueCanvasProps = {
  sceneData: StationSceneData;
  friends: FriendState[];
  me: FriendState;
  focus: CameraFocus;
  screenOffset: { x: number; y: number };
  destination: Vec3 | null;
  paused: boolean;
  reducedMotion: boolean;
  onSelectStation: (id: StationId) => void;
  onFloorTap: (point: Vec3) => void;
  onNearStation: (id: StationId | null) => void;
  openStation: StationId | null;
  // who's in the venue right now
  online: ReadonlySet<string>;
  onLeaveStation: () => void;
};

export default function VenueCanvas({
  sceneData,
  friends,
  me,
  focus,
  screenOffset,
  destination,
  paused,
  reducedMotion,
  onSelectStation,
  onFloorTap,
  onNearStation,
  openStation,
  onLeaveStation,
  online,
}: VenueCanvasProps) {
  const playerPosition = useRef(new THREE.Vector3(...SPAWN));
  // drop resolution on devices that can't keep up
  const [dpr, setDpr] = useState(1.75);
  // don't leave a pointer cursor behind if the scene goes while hovering
  useEffect(() => () => void (document.body.style.cursor = ''), []);
  return (
    <Canvas
      shadows
      camera={{ position: [40, 37, 40], fov: CAMERA_FOV, near: 1, far: 250 }}
      dpr={[1, dpr]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      frameloop={paused ? 'never' : 'always'}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#07050d');
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(1.75)}
      />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#b9a8ff', '#1b1530', 0.8]} />
      {/* key light: the one that casts the (soft, cartoon) shadows */}
      <directionalLight
        position={[8, 18, 12]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-radius={6}
      />
      <pointLight
        position={[0, 3, -8]}
        color={sceneData.moodColor}
        intensity={18}
        distance={10}
      />
      <pointLight position={[-8.5, 2.5, -2]} color="#38e1ff" intensity={10} distance={6} />
      <pointLight position={[6, 2.5, 6.5]} color="#ffb547" intensity={8} distance={6} />
      <pointLight position={[0, 3, 0]} color="#ff9ae6" intensity={10} distance={9} />

      <AnchorProjector />
      <CameraRig
        focus={focus}
        follow={playerPosition}
        screenOffset={screenOffset}
        reducedMotion={reducedMotion}
      />

      {/* tap target for walking around */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 8) {
            return;
          }
          onFloorTap([e.point.x, 0, e.point.z]);
        }}
      >
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HALF * 2]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Room
        moodColor={sceneData.moodColor}
        reducedMotion={reducedMotion}
        playerRef={playerPosition}
      />
      <Decor moodColor={sceneData.moodColor} reducedMotion={reducedMotion} />
      <Stations
        data={sceneData}
        reducedMotion={reducedMotion}
        onSelect={onSelectStation}
      />
      <Friends friends={friends} reducedMotion={reducedMotion} online={online} />
      <MusicNotes reducedMotion={reducedMotion} />
      <Confetti reducedMotion={reducedMotion} />
      <Player
        me={me}
        destination={destination}
        reducedMotion={reducedMotion}
        positionRef={playerPosition}
        onNearStation={onNearStation}
        openStation={openStation}
        onLeaveStation={onLeaveStation}
      />
    </Canvas>
  );
}
