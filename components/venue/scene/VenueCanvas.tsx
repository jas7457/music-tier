'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { Room } from './Room';
import { Stations, StationSceneData } from './Stations';
import { Friends, Player } from './Characters';
import { CameraRig, CameraFocus } from './CameraRig';
import { AnchorProjector } from './anchors';
import { Confetti, MusicNotes } from './Effects';
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
}: VenueCanvasProps) {
  const playerPosition = useRef(new THREE.Vector3(...SPAWN));
  // don't leave a pointer cursor behind if the scene goes while hovering
  useEffect(() => () => void (document.body.style.cursor = ''), []);
  return (
    <Canvas
      orthographic
      camera={{ position: [40, 37, 40], zoom: 20, near: 0.1, far: 200 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      frameloop={paused ? 'never' : 'always'}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#07050d');
      }}
    >
      <fog attach="fog" args={['#07050d', 50, 80]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#9d8cff', '#1b1530', 0.9]} />
      <directionalLight position={[8, 14, 6]} intensity={1.1} />
      <pointLight
        position={[0.5, 3, -4]}
        color={sceneData.moodColor}
        intensity={18}
        distance={10}
      />
      <pointLight position={[-4.5, 2.5, -0.8]} color="#38e1ff" intensity={10} distance={6} />
      <pointLight position={[4.5, 2.5, 4]} color="#ffb547" intensity={8} distance={6} />

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

      <Room moodColor={sceneData.moodColor} reducedMotion={reducedMotion} />
      <Stations
        data={sceneData}
        reducedMotion={reducedMotion}
        onSelect={onSelectStation}
      />
      <Friends friends={friends} reducedMotion={reducedMotion} />
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
