'use client';

import * as THREE from 'three';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * DOM overlays pinned to points in the 3D scene (labels, speech bubbles).
 *
 * The scene writes world positions into this store; <AnchorProjector> projects
 * them every frame and moves the registered DOM elements with a transform.
 * The elements themselves live in the normal React tree, outside the canvas.
 */

type Anchor = {
  position: THREE.Vector3;
  element: HTMLElement | null;
  // stick to the screen edge (pointing at it) instead of hiding when off-screen
  edge: boolean;
};

const anchors = new Map<string, Anchor>();

function getAnchor(id: string) {
  let anchor = anchors.get(id);
  if (!anchor) {
    anchor = { position: new THREE.Vector3(), element: null, edge: false };
    anchors.set(id, anchor);
  }
  return anchor;
}

/** Called from the scene to say where an anchor is. */
export function setAnchorPosition(id: string, x: number, y: number, z: number) {
  getAnchor(id).position.set(x, y, z);
}

/** Ref callback for the DOM element that should follow an anchor. */
export function useAnchorRef(id: string, { edge = false } = {}) {
  return useCallback(
    (element: HTMLElement | null) => {
      getAnchor(id).element = element;
      getAnchor(id).edge = edge;
      if (element) {
        // hidden until the first projection places it
        element.style.visibility = 'hidden';
      }
    },
    [id, edge],
  );
}

/** Pins a static anchor at a fixed world position. */
export function StaticAnchor({
  id,
  position,
}: {
  id: string;
  position: [number, number, number];
}) {
  useEffect(() => {
    setAnchorPosition(id, ...position);
  }, [id, position]);
  return null;
}

const projected = new THREE.Vector3();

export function AnchorProjector() {
  const { camera, size } = useThree();
  useFrame(() => {
    anchors.forEach((anchor) => {
      const element = anchor.element;
      if (!element) {
        return;
      }
      projected.copy(anchor.position).project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      if (anchor.edge) {
        // keep it on screen, pinned to the nearest edge, and say which way
        // the real spot is
        const margin = 36;
        const inside =
          x > margin &&
          x < size.width - margin &&
          y > margin + 60 &&
          y < size.height - margin - 150;
        const cx = THREE.MathUtils.clamp(x, margin, size.width - margin);
        const cy = THREE.MathUtils.clamp(y, margin + 60, size.height - margin - 150);
        const angle = Math.atan2(y - cy, x - cx);
        element.style.visibility = 'visible';
        element.dataset.offscreen = inside ? '' : 'true';
        element.style.setProperty('--angle', `${angle}rad`);
        element.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%)`;
        return;
      }
      const onScreen =
        projected.z < 1 &&
        x > -100 &&
        x < size.width + 100 &&
        y > -100 &&
        y < size.height + 100;
      element.style.visibility = onScreen ? 'visible' : 'hidden';
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    });
  });
  return null;
}

/* Which character's speech bubble is open (one at a time). */

let bubbleId: string | null = null;
const bubbleListeners = new Set<() => void>();
let bubbleTimer: ReturnType<typeof setTimeout> | null = null;

export function showBubble(id: string | null, { sticky = false } = {}) {
  bubbleId = id;
  if (bubbleTimer) {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
  }
  // friends' status bubbles close themselves; your own menu stays open
  if (id && !sticky) {
    bubbleTimer = setTimeout(() => showBubble(null), 3200);
  }
  bubbleListeners.forEach((listener) => listener());
}

export function useBubble() {
  return useSyncExternalStore(
    (listener) => {
      bubbleListeners.add(listener);
      return () => bubbleListeners.delete(listener);
    },
    () => bubbleId,
    () => null,
  );
}

/** Keeps a moving object's anchor in sync with it. */
export function useTrackAnchor(
  id: string,
  object: React.RefObject<THREE.Object3D | null>,
  height: number,
) {
  const world = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!object.current) {
      return;
    }
    object.current.getWorldPosition(world.current);
    setAnchorPosition(id, world.current.x, world.current.y + height, world.current.z);
  });
}
