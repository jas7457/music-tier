'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Vec3 } from '../stations';

// The diorama is always seen from the front-right, a little above.
const VIEW_DIR = new THREE.Vector3(1, 0.92, 1).normalize();
const DISTANCE = 40;
const OVERVIEW_TARGET = new THREE.Vector3(0, 0.6, 0.4);

export type CameraFocus = {
  point: Vec3;
  zoom: number;
} | null;

/**
 * Orthographic camera that glides between the overview and a focused
 * station, keeping the focused thing inside the part of the screen the
 * panel doesn't cover. One-finger drag pans, pinch / wheel zooms.
 */
export function CameraRig({
  focus,
  // where the visible area's centre sits, relative to the canvas centre,
  // in CSS px (+y is up)
  screenOffset,
  reducedMotion,
}: {
  focus: CameraFocus;
  screenOffset: { x: number; y: number };
  reducedMotion: boolean;
}) {
  const { camera, size, gl } = useThree();
  const target = useRef(OVERVIEW_TARGET.clone());
  const pan = useRef(new THREE.Vector3());
  const userZoom = useRef(1);
  const zoom = useRef(0);
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3());

  // a new focus resets any manual panning / zooming
  useEffect(() => {
    pan.current.set(0, 0, 0);
    userZoom.current = 1;
  }, [focus]);

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
            0.7,
            3.5,
          );
        }
        pinchDistance = distance;
        return;
      }
      if (e.buttons === 0 && e.pointerType === 'mouse') {
        return;
      }
      const z = zoom.current || 1;
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      pan.current
        .addScaledVector(right.current, -dx / z)
        .addScaledVector(up.current, dy / z);
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
        0.7,
        3.5,
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

  useFrame((_, delta) => {
    const cam = camera as THREE.OrthographicCamera;
    const overviewZoom = Math.min(size.width / 18.5, size.height / 18);
    const desiredZoom =
      overviewZoom * (focus ? focus.zoom : 1) * userZoom.current;

    // camera axes (fixed orientation, so they only need computing once,
    // but this is cheap and survives resizes)
    right.current.set(1, 0, -1).normalize();
    up.current.crossVectors(right.current, VIEW_DIR).normalize().negate();
    if (up.current.y < 0) {
      up.current.negate();
    }

    const desiredTarget = (
      focus ? new THREE.Vector3(...focus.point) : OVERVIEW_TARGET.clone()
    )
      .addScaledVector(right.current, -screenOffset.x / desiredZoom)
      .addScaledVector(up.current, -screenOffset.y / desiredZoom)
      .add(pan.current);

    // keep the room on screen
    desiredTarget.x = THREE.MathUtils.clamp(desiredTarget.x, -8, 8);
    desiredTarget.z = THREE.MathUtils.clamp(desiredTarget.z, -8, 8);
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

    cam.position.copy(target.current).addScaledVector(VIEW_DIR, DISTANCE);
    cam.lookAt(target.current);
    if (Math.abs(cam.zoom - zoom.current) > 1e-4) {
      cam.zoom = zoom.current;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
