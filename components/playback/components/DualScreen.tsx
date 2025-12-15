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
    console.log({ isActive, isFlipped });
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
            {/* Info circle */}
            <circle cx="12" cy="12" r="10" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16v-4m0-4h.01"
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
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Face */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
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
