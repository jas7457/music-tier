"use client";

import { useState } from "react";

import "./Screen.css";

// Generate random values outside component
const generateShootingStars = () =>
  Array.from({ length: 5 }, (_, i) => ({
    left: Math.random() * 100,
    top: Math.random() * 50,
    duration: 3 + Math.random() * 2,
    delay: i * 2,
  }));

const generateFloatingNotes = () =>
  Array.from({ length: 8 }, (_, i) => ({
    left: 10 + i * 12,
    duration: 5 + Math.random() * 3,
    delay: i * 0.5,
    symbol: i % 2 === 0 ? "♪" : "♫",
  }));

export function Screen({
  background,
  children,
}: {
  background?: { from: string; via: string; to: string };
  children: React.ReactNode;
}) {
  // Use useState with initializer function - only runs once
  const [shootingStars] = useState(generateShootingStars);
  const [floatingNotes] = useState(generateFloatingNotes);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ contentVisibility: "auto", containIntrinsicSize: "100vw 100vh" }}
    >
      {background && (
        <>
          {/* Animated background with parallax */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Base gradient layer */}
            <div
              className="absolute inset-0 transition-all duration-1000 ease-in-out"
              style={{
                ...(background && {
                  background: `linear-gradient(135deg, ${background.from}, ${background.to})`,
                }),
              }}
            />

            {/* Animated gradient blobs with parallax */}
            <div
              className="absolute w-[800px] h-[800px] -top-40 -left-40 opacity-50 blur-3xl transition-colors duration-1000"
              style={{
                ...(background && {
                  background: `radial-gradient(circle, ${background.via} 0%, transparent 70%)`,
                }),
                animation: "gradient-swirl-1 12s ease-in-out infinite",
              }}
            />
            <div
              className="absolute w-[600px] h-[600px] top-1/2 right-0 opacity-40 blur-3xl transition-colors duration-1000"
              style={{
                ...(background && {
                  background: `radial-gradient(circle, ${background.from} 0%, transparent 70%)`,
                }),
                animation: "gradient-swirl-2 15s ease-in-out infinite",
              }}
            />
            <div
              className="absolute w-[700px] h-[700px] bottom-0 left-1/4 opacity-30 blur-3xl transition-colors duration-1000"
              style={{
                ...(background && {
                  background: `radial-gradient(circle, ${background.to} 0%, transparent 70%)`,
                }),
                animation: "gradient-swirl-3 18s ease-in-out infinite",
              }}
            />

            {/* Shooting stars */}
            <div className="absolute inset-0">
              {shootingStars.map((star, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full opacity-0"
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                    animation: `shooting-star ${star.duration}s ease-in-out infinite`,
                    animationDelay: `${star.delay}s`,
                  }}
                >
                  <div className="absolute w-20 h-0.5 bg-linear-to-r from-white to-transparent -translate-x-full" />
                </div>
              ))}
            </div>

            {/* Floating music notes */}
            <div className="absolute inset-0">
              {floatingNotes.map((note, i) => (
                <div
                  key={i}
                  className="absolute text-white text-2xl"
                  style={{
                    left: `${note.left}%`,
                    animation: `float-note ${note.duration}s ease-in-out infinite`,
                    animationDelay: `${note.delay}s`,
                  }}
                >
                  {note.symbol}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Content with parallax */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
