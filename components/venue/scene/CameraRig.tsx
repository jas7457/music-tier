'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ROOM_HALF, type Vec3 } from '../stations';

// The diorama is always seen from the front-right, a little above.
const VIEW_DIR = new THREE.Vector3(1, 0.92, 1).normalize();
// A narrow lens far away: reads like the flat isometric view, but close
// things shift a little more than far ones as the camera moves (parallax).
export const CAMERA_FOV = 20;
const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
const START_TARGET = new THREE.Vector3(0, 0.9, 0.4);
// look at your chest, not your feet
const FOLLOW_HEIGHT = 0.9;
// How far the view travels per unit of finger drag. >1 so a swipe moves more
// than a strict 1:1 would: the camera smooths toward its target, so without
// this a drag feels like it lags behind your finger.
const PAN_SENSITIVITY = 2.2;

export type CameraFocus = {
  point: Vec3;
  zoom: number;
} | null;

/**
 * Orthographic camera that follows you around the room up close, and frames
 * a station when its panel is open (keeping it inside the part of the screen
 * the panel doesn't cover). One-finger drag looks around (it drifts back to
 * you once you walk), pinch / wheel zooms.
 */
export function CameraRig({
  focus,
  follow,
  // where the visible area's centre sits, relative to the canvas centre,
  // in CSS px (+y is up)
  screenOffset,
  reducedMotion,
}: {
  focus: CameraFocus;
  // the player's position, followed when no station is open
  follow: React.RefObject<THREE.Vector3>;
  screenOffset: { x: number; y: number };
  reducedMotion: boolean;
}) {
  const { size, gl } = useThree();
  const target = useRef(START_TARGET.clone());
  const lastFollow = useRef(new THREE.Vector3(Infinity, 0, 0));
  const pan = useRef(new THREE.Vector3());
  const userZoom = useRef(1);
  const zoom = useRef(0);
  const right = useRef(new THREE.Vector3());
  const sway = useRef(new THREE.Vector3());
  const lastTarget = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3());

  // a new focus resets any manual panning / zooming (by value: the focus
  // object itself is rebuilt on every render)
  const focusPoint = focus?.point;
  const focusZoom = focus?.zoom;
  useEffect(() => {
    pan.current.set(0, 0, 0);
    userZoom.current = 1;
  }, [focusPoint, focusZoom]);

  // gestures
  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) {
        return;
      }
      const next = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, next);
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance > 0) {
          userZoom.current = THREE.MathUtils.clamp(
            userZoom.current * (distance / pinchDistance),
            0.5,
            2.5,
          );
        }
        pinchDistance = distance;
        return;
      }
      if (e.buttons === 0 && e.pointerType === 'mouse') {
        return;
      }
      const z = (zoom.current || 1) / PAN_SENSITIVITY;
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      pan.current
        .addScaledVector(right.current, -dx / z)
        .addScaledVector(up.current, dy / z);
      // no dead zone past the edge of the room
      pan.current.clampLength(0, ROOM_HALF + 2);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        pinchDistance = 0;
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userZoom.current = THREE.MathUtils.clamp(
        userZoom.current * Math.exp(-e.deltaY * 0.0015),
        0.5,
        2.5,
      );
    };
    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      element.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      element.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame((state, delta) => {
    // mutated here, as R3F intends: the camera is the scene's, not React state
    const cam = state.camera;
    const portrait = size.width < size.height;
    // Stations are framed relative to the size that fits the whole room...
    const fitZoom = portrait
      ? Math.min(size.width / 12, size.height / 17)
      : Math.min(size.width / 18.5, size.height / 18);
    // ...while walking around the camera stays close: a few metres of room
    // around you, so you explore to find things.
    const followZoom = portrait
      ? Math.min(size.width / 7.5, size.height / 12)
      : Math.min(size.width / 13, size.height / 9.5);
    const desiredZoom =
      (focus ? fitZoom * focus.zoom : followZoom) * userZoom.current;

    // Walking pulls the camera back to you after looking around.
    const you = follow.current;
    if (!focus && you) {
      const moved = lastFollow.current.distanceToSquared(you) > 1e-6;
      lastFollow.current.copy(you);
      if (moved) {
        pan.current.multiplyScalar(Math.exp(-4 * delta));
      }
    }

    // camera axes (fixed orientation, so they only need computing once,
    // but this is cheap and survives resizes)
    right.current.set(1, 0, -1).normalize();
    up.current.crossVectors(right.current, VIEW_DIR).normalize().negate();
    if (up.current.y < 0) {
      up.current.negate();
    }

    const desiredTarget = (
      focus
        ? new THREE.Vector3(...focus.point)
        : you
          ? new THREE.Vector3(you.x, FOLLOW_HEIGHT, you.z)
          : START_TARGET.clone()
    )
      .addScaledVector(right.current, -screenOffset.x / desiredZoom)
      .addScaledVector(up.current, -screenOffset.y / desiredZoom)
      .add(pan.current);

    // keep the room on screen
    desiredTarget.x = THREE.MathUtils.clamp(desiredTarget.x, -ROOM_HALF - 0.5, ROOM_HALF + 0.5);
    desiredTarget.z = THREE.MathUtils.clamp(desiredTarget.z, -ROOM_HALF - 0.5, ROOM_HALF + 0.5);
    desiredTarget.y = THREE.MathUtils.clamp(desiredTarget.y, -6, 6);

    const snap = reducedMotion || zoom.current === 0;
    const lambda = 5;
    if (snap) {
      target.current.copy(desiredTarget);
      zoom.current = desiredZoom;
    } else {
      target.current.lerp(desiredTarget, 1 - Math.exp(-lambda * delta));
      zoom.current = THREE.MathUtils.damp(
        zoom.current,
        desiredZoom,
        lambda,
        delta,
      );
    }

    // "zoom" is pixels per world unit at the target: back the camera off to
    // the distance that gives that scale with this lens.
    const distance = size.height / zoom.current / (2 * HALF_FOV_TAN);

    // Lean slightly into the direction of travel: the camera swings a touch
    // sideways as it chases its target, which sells the depth.
    const velocity = target.current.clone().sub(lastTarget.current);
    lastTarget.current.copy(target.current);
    if (!reducedMotion && delta > 0) {
      const lateral = velocity.dot(right.current) / delta;
      sway.current.lerp(
        right.current.clone().multiplyScalar(THREE.MathUtils.clamp(-lateral * 0.35, -1.6, 1.6)),
        1 - Math.exp(-3 * delta),
      );
    }

    cam.position
      .copy(target.current)
      .addScaledVector(VIEW_DIR, distance)
      .add(sway.current);
    cam.lookAt(target.current);
    const persp = cam as unknown as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera && persp.fov !== CAMERA_FOV) {
      persp.fov = CAMERA_FOV;
      persp.updateProjectionMatrix();
    }
  });

  return null;
}
