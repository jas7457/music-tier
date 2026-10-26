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
/*
 * Drag + flick, done the way scroll views and map apps do it:
 * - while your finger is down the room sticks to it 1:1, unsmoothed
 * - on release, speed is measured over the last moments of the drag only
 * - the glide then slows exponentially (like iOS scrolling), applied directly
 */
// how much of the release speed carries into the glide
const FLICK_GAIN = 1;
// how quickly the glide slows (per second); it travels speed / this far
const MOMENTUM_DECAY = 5;
// below this release speed (px/s) there's no glide, so small, slow drags
// stop where you let go; just above it the glide ramps up from nothing
const FLICK_MIN_SPEED = 350;
// fastest glide (px/s), so a wild flick doesn't shoot across the room
const FLICK_MAX_SPEED = 3000;
// release speed is measured over this much of the end of the drag...
const FLICK_SAMPLE_MS = 100;
// ...and a finger that stopped this long before lifting doesn't fling
const FLICK_MAX_IDLE_MS = 50;

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
  const panVelocity = useRef(new THREE.Vector3());
  const userZoom = useRef(1);
  const zoom = useRef(0);
  const right = useRef(new THREE.Vector3());
  const sway = useRef(new THREE.Vector3());
  const lastTarget = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3());
  // what the camera actually looks at: the smoothed target plus your pan
  const view = useRef(new THREE.Vector3());

  // a new focus resets any manual panning / zooming (by value: the focus
  // object itself is rebuilt on every render)
  const focusPoint = focus?.point;
  const focusZoom = focus?.zoom;
  useEffect(() => {
    // fold the pan into the smoothed target so the camera glides from where
    // you'd dragged it instead of jumping
    target.current.add(pan.current);
    pan.current.set(0, 0, 0);
    panVelocity.current.set(0, 0, 0);
    userZoom.current = 1;
  }, [focusPoint, focusZoom]);

  // gestures
  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;
    // where the dragging finger has been lately, for the release speed
    let samples: { x: number; y: number; t: number }[] = [];

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // grabbing stops any glide in progress, like catching a scroll
      panVelocity.current.set(0, 0, 0);
      samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
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
        // a pinch isn't a flick
        samples = [];
        return;
      }
      if (e.buttons === 0 && e.pointerType === 'mouse') {
        return;
      }
      // zoom is px per world unit at the target, so this moves the room
      // exactly as far as your finger moved
      const z = zoom.current || 1;
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      pan.current
        .addScaledVector(right.current, -dx / z)
        .addScaledVector(up.current, dy / z);
      samples.push({ x: next.x, y: next.y, t: e.timeStamp });
      while (samples.length > 2 && e.timeStamp - samples[0].t > FLICK_SAMPLE_MS) {
        samples.shift();
      }
    };
    const onUp = (e: PointerEvent) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      const remaining = pointers.size;
      if (remaining < 2) {
        pinchDistance = 0;
      }
      // lifting the last finger of a one-finger drag: fling if still moving
      if (wasSingle && remaining === 0 && samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const idle = e.timeStamp - last.t;
        const dt = (last.t - first.t) / 1000;
        if (idle <= FLICK_MAX_IDLE_MS && dt > 0) {
          const vx = (last.x - first.x) / dt;
          const vy = (last.y - first.y) / dt;
          const speed = Math.hypot(vx, vy);
          if (speed > FLICK_MIN_SPEED) {
            // ramp up from nothing at the threshold, and cap the top speed
            const capped = Math.min(speed, FLICK_MAX_SPEED);
            const scale =
              ((capped - FLICK_MIN_SPEED) / speed) * FLICK_GAIN / (zoom.current || 1);
            panVelocity.current
              .copy(right.current)
              .multiplyScalar(-vx * scale)
              .addScaledVector(up.current, vy * scale);
          }
        }
      }
      if (remaining === 0) {
        samples = [];
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

    // Flick momentum: a quick swipe keeps gliding, then eases to a stop.
    if (panVelocity.current.lengthSq() > 1e-6) {
      if (focus) {
        panVelocity.current.set(0, 0, 0);
      } else {
        pan.current.addScaledVector(panVelocity.current, delta);
        panVelocity.current.multiplyScalar(Math.exp(-MOMENTUM_DECAY * delta));
        if (panVelocity.current.lengthSq() < 1e-4) {
          panVelocity.current.set(0, 0, 0);
        }
      }
    }

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
      .addScaledVector(up.current, -screenOffset.y / desiredZoom);

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

    // Your pan goes on top of the smoothed target, unsmoothed, so the room
    // stays glued to your finger (smoothing it is what made dragging floaty).
    const v = view.current.copy(target.current).add(pan.current);
    // keep the room on screen; pull the pan back with it so dragging back
    // from the edge responds at once (no dead zone)
    v.x = THREE.MathUtils.clamp(v.x, -ROOM_HALF - 0.5, ROOM_HALF + 0.5);
    v.z = THREE.MathUtils.clamp(v.z, -ROOM_HALF - 0.5, ROOM_HALF + 0.5);
    v.y = THREE.MathUtils.clamp(v.y, -6, 6);
    pan.current.copy(v).sub(target.current);

    // "zoom" is pixels per world unit at the target: back the camera off to
    // the distance that gives that scale with this lens.
    const distance = size.height / zoom.current / (2 * HALF_FOV_TAN);

    // Lean slightly into the direction of travel: the camera swings a touch
    // sideways as it chases its target, which sells the depth. Only for
    // walking / station moves: on a drag it made the camera swing about.
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
      .copy(v)
      .addScaledVector(VIEW_DIR, distance)
      .add(sway.current);
    cam.lookAt(v);
    const persp = cam as unknown as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera && persp.fov !== CAMERA_FOV) {
      persp.fov = CAMERA_FOV;
      persp.updateProjectionMatrix();
    }
  });

  return null;
}
