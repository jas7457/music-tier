"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { CarouselContext } from "./HorizontalCarousel";

interface DualScreenProps {
  children: React.ReactNode;
  backFace: (isFlipped: boolean) => React.ReactNode;
  isActive: boolean;
  className?: string;
}

export function DualScreen({
  children,
  backFace,
  className,
  isActive,
}: DualScreenProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const carouselContext = useContext(CarouselContext);

  const handleFlip = useCallback(() => {
    const newValue = !isFlipped;
    setIsFlipped(newValue);
    carouselContext.showButtons(!newValue);
  }, [carouselContext, isFlipped]);

  useEffect(() => {
    if (!isActive && isFlipped) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleFlip();
    }
  }, [handleFlip, isActive, isFlipped]);

  const backfaceMarkup = backFace(isFlipped);

  return (
    <div className={twMerge("relative w-full h-full", className)}>
      {/* Flip Button */}
      {backfaceMarkup && (
        <button
          onClick={handleFlip}
          className={twMerge(
            "absolute bottom-4 right-4 z-50 backdrop-blur-sm text-white rounded-full p-3 transition-all duration-300",
            isFlipped
              ? "bg-purple-500/80 border-2 border-purple-300 hover:bg-purple-400/80 shadow-lg shadow-purple-500/50"
              : "bg-white/10 border border-white/20 hover:bg-white/20"
          )}
          style={{
            animation:
              isActive && !isFlipped
                ? "hint-flip 5.6s ease-in-out 3s infinite"
                : "none",
          }}
          aria-label="Flip screen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            {/* Flip/Rotate icon - two curved arrows suggesting flip */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      )}

      {/* 3D Container */}
      <div
        className="relative w-full h-full"
        style={{
          perspective: "3000px",
        }}
      >
        <div
          className="relative w-full h-full transition-transform duration-700"
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Face */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
              WebkitTransform: "rotateY(0deg)",
              pointerEvents: isFlipped ? "none" : "auto",
            }}
          >
            {children}
          </div>

          {/* Back Face */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              WebkitTransform: "rotateY(180deg)",
              pointerEvents: isFlipped ? "auto" : "none",
            }}
          >
            {backfaceMarkup}
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes hint-flip {
          0%,
          10.7%,
          100% {
            transform: perspective(500px) rotateY(0deg) scale(1);
          }
          2.7% {
            transform: perspective(500px) rotateY(90deg) scale(1.1);
          }
          5.4% {
            transform: perspective(500px) rotateY(180deg) scale(1.15);
          }
          8% {
            transform: perspective(500px) rotateY(-90deg) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
