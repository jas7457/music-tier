"use client";

import { useEffect, useState } from "react";

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Use useState with initializer function - only runs once
  const [shootingStars] = useState(generateShootingStars);
  const [floatingNotes] = useState(generateFloatingNotes);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Animated background with parallax */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Base gradient layer */}
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            ...(background && {
              background: `linear-gradient(135deg, ${background.from}, ${background.to})`,
            }),
            transform: `translate(${mousePosition.x * 0.5}px, ${
              mousePosition.y * 0.5
            }px) scale(1.1)`,
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
            transform: `translate(${mousePosition.x * 1.2}px, ${
              mousePosition.y * 1.2
            }px)`,
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] top-1/2 right-0 opacity-40 blur-3xl transition-colors duration-1000"
          style={{
            ...(background && {
              background: `radial-gradient(circle, ${background.from} 0%, transparent 70%)`,
            }),
            animation: "gradient-swirl-2 15s ease-in-out infinite",
            transform: `translate(${mousePosition.x * 0.8}px, ${
              mousePosition.y * 0.8
            }px)`,
          }}
        />
        <div
          className="absolute w-[700px] h-[700px] bottom-0 left-1/4 opacity-30 blur-3xl transition-colors duration-1000"
          style={{
            ...(background && {
              background: `radial-gradient(circle, ${background.to} 0%, transparent 70%)`,
            }),
            animation: "gradient-swirl-3 18s ease-in-out infinite",
            transform: `translate(${mousePosition.x * 1}px, ${
              mousePosition.y * 1
            }px)`,
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
              className="absolute text-white/20 text-2xl"
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

      {/* Content with parallax */}
      <div
        className="relative z-10 h-full"
        style={{
          transform: `translate(${mousePosition.x * -0.3}px, ${
            mousePosition.y * -0.3
          }px)`,
          transition: "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes shooting-star {
          0% {
            opacity: 0;
            transform: translateX(0) translateY(0);
          }
          10% {
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(300px) translateY(200px);
          }
        }

        @keyframes float-note {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
