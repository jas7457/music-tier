"use client";

import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number; // How far to pull before triggering refresh (in pixels)
  resistance?: number; // How much resistance when pulling (0-1, lower = more resistance)
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 0.5,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    let rafId: number;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if we're at the top of the page
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      // Only allow pulling down (positive distance) and when at top
      if (distance > 0 && window.scrollY === 0) {
        // Prevent default scrolling when pulling
        e.preventDefault();

        // Apply resistance to make it feel natural
        const resistedDistance = distance * resistance;
        setPullDistance(resistedDistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;

      isPulling.current = false;
      const currentPullDistance = pullDistance;

      // If pulled far enough, trigger refresh
      if (currentPullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch {
        } finally {
          setIsRefreshing(false);
        }
      }
      console.log({ currentPullDistance });
      setPullDistance(0);
      return;

      // Animate back to 0
      const startDistance = currentPullDistance;
      const startTime = Date.now();
      const duration = 300;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const newDistance = startDistance * (1 - easeOut);
        setPullDistance(newDistance);

        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        } else {
          setPullDistance(0);
        }
      };

      rafId = requestAnimationFrame(animate);
    };

    // Add event listeners with { passive: false } to allow preventDefault
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [pullDistance, threshold, resistance, onRefresh, isRefreshing]);

  return {
    pullDistance,
    isRefreshing,
    isPullingToRefresh: pullDistance > 0,
    shouldTriggerRefresh: pullDistance >= threshold,
  };
}
