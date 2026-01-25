'use client';

import { twMerge } from 'tailwind-merge';
import { Screen } from '../components/Screen';
import type { PlaybackScreenProps } from '../types';
import { Avatar } from '@/components/Avatar';
import { DataText } from '@/components/DataText';
import { NEON_COLORS } from '../constants';
import { HorizontalCarousel } from '../components/HorizontalCarousel';
import { StatBounce } from '../components/Animations';

export function ConspiratorsScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.conspirators || playback.conspirators.length === 0) {
    return (
      <Screen background={{ from: '#a855f7', via: '#1e1b4b', to: '#f97316' }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">
            No conspiracy data available
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: '#a855f7', via: '#1e1b4b', to: '#f97316' }}>
      <HorizontalCarousel
        isActive={isActive}
        items={playback.conspirators}
        buttonPosition="bottom"
        renderItem={(conspirator, index, isItemActive) => {
          const { user1, user2 } = conspirator;

          return (
            <div className="flex flex-col p-8 items-center justify-center gap-8 min-w-full h-full">
              {/* Animated mystery/conspiracy elements in background */}
              {index === 0 && isItemActive && (
                <>
                  {/* Floating eyes watching */}
                  <div
                    className="absolute top-[8%] left-[10%] text-5xl opacity-25 z-10"
                    style={{
                      animation: 'eye-blink 5s ease-in-out infinite',
                    }}
                  >
                    👁️
                  </div>
                  <div
                    className="absolute top-[15%] right-[12%] text-4xl opacity-30 z-10"
                    style={{
                      animation: 'eye-blink 4.5s ease-in-out 1s infinite',
                    }}
                  >
                    👁️
                  </div>
                  <div
                    className="absolute bottom-[25%] left-[8%] text-6xl opacity-20 z-10"
                    style={{
                      animation: 'eye-blink 5.5s ease-in-out 2s infinite',
                    }}
                  >
                    👁️
                  </div>
                  <div
                    className="absolute bottom-[15%] right-[15%] text-5xl opacity-25 z-10"
                    style={{
                      animation: 'eye-blink 4.8s ease-in-out 0.5s infinite',
                    }}
                  >
                    👁️
                  </div>

                  {/* Mysterious sparkles/stars */}
                  <div
                    className="absolute top-[30%] left-[20%] text-3xl opacity-40 z-10"
                    style={{
                      animation: 'sparkle-twinkle 3s ease-in-out infinite',
                    }}
                  >
                    ✨
                  </div>
                  <div
                    className="absolute top-[70%] right-[25%] text-4xl opacity-35 z-10"
                    style={{
                      animation:
                        'sparkle-twinkle 3.5s ease-in-out 0.8s infinite',
                    }}
                  >
                    ✨
                  </div>
                  <div
                    className="absolute top-[45%] right-[10%] text-3xl opacity-30 z-10"
                    style={{
                      animation:
                        'sparkle-twinkle 3.2s ease-in-out 1.5s infinite',
                    }}
                  >
                    ⭐
                  </div>
                  <div
                    className="absolute bottom-[40%] left-[15%] text-4xl opacity-35 z-10"
                    style={{
                      animation:
                        'sparkle-twinkle 3.8s ease-in-out 2.2s infinite',
                    }}
                  >
                    ⭐
                  </div>

                  {/* Question marks floating around */}
                  <div
                    className="absolute top-[20%] right-[20%] text-4xl opacity-20 z-10"
                    style={{
                      animation: 'float-spin 6s ease-in-out infinite',
                    }}
                  >
                    ❓
                  </div>
                  <div
                    className="absolute bottom-[30%] right-[8%] text-5xl opacity-25 z-10"
                    style={{
                      animation: 'float-spin 5.5s ease-in-out 1.5s infinite',
                    }}
                  >
                    ❓
                  </div>
                  <div
                    className="absolute top-[50%] left-[5%] text-4xl opacity-20 z-10"
                    style={{
                      animation: 'float-spin 6.5s ease-in-out 3s infinite',
                    }}
                  >
                    ❓
                  </div>
                </>
              )}

              {/* Titles */}
              <div
                className={twMerge(
                  'transition-all duration-700 transform relative z-10',
                  isItemActive
                    ? 'opacity-100 delay-0 scale-100'
                    : 'opacity-0 scale-95',
                )}
              >
                <h2 className="text-center text-white drop-shadow-lg">
                  You two must be working together
                </h2>
                <p className="text-4xl text-purple-300 text-center drop-shadow-lg">
                  The Conspirators
                </p>
              </div>

              {/* User 1 with mysterious glow */}
              <div
                className={twMerge(
                  'flex items-center gap-8 transition-all duration-700 relative z-10',
                  isItemActive
                    ? 'opacity-100 scale-100 delay-200'
                    : 'opacity-0 scale-50',
                )}
              >
                {/* User 1 with mysterious glow */}
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full opacity-50 z-0"
                    style={{
                      background: 'radial-gradient(circle, #a855f7, #6366f1)',
                      filter: 'blur(40px)',
                      animation: isItemActive
                        ? 'pulse-mysterious 3s ease-in-out infinite'
                        : 'none',
                    }}
                  />
                  <div
                    style={{
                      animation: isItemActive
                        ? 'avatar-bump-right 5s ease-in-out infinite'
                        : 'none',
                    }}
                  >
                    <Avatar
                      user={user1}
                      size={100}
                      includeLink={false}
                      isSizePercent
                      className="relative z-10"
                    />
                  </div>

                  {/* User 1 Points Animation */}
                  <div
                    className="absolute top-0 left-0 w-full h-full text-6xl font-bold"
                    style={{
                      animation: isItemActive
                        ? 'points-flow-to-handshake 5s ease-in infinite'
                        : 'none',
                      color: '#a855f7',
                      textShadow: '0px 2px 5px rgba(0, 0, 0, 1)',
                      transformOrigin: 'center',
                    }}
                  >
                    +{conspirator.user1Points}
                  </div>
                </div>

                {/* Animated handshake with connecting line */}
                <div className="relative flex items-center gap-2">
                  {/* Glowing connection line */}
                  <div
                    className="absolute top-1/2 left-0 right-0 h-1 -z-10"
                    style={{
                      background: 'linear-gradient(90deg, #a855f7, #f97316)',
                      animation: isItemActive
                        ? 'pulse-line 2s ease-in-out infinite'
                        : 'none',
                      transform: 'translateY(-50%)',
                      filter: 'blur(2px)',
                    }}
                  />
                  <div
                    className="text-6xl"
                    style={{
                      animation: isItemActive
                        ? 'handshake-pulse 2s ease-in-out infinite'
                        : 'none',
                    }}
                  >
                    🤝
                  </div>
                </div>

                {/* User 2 with mysterious glow */}
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full opacity-50 z-0"
                    style={{
                      background: 'radial-gradient(circle, #f97316, #fbbf24)',
                      filter: 'blur(40px)',
                      animation: isItemActive
                        ? 'pulse-mysterious 3s ease-in-out 0.5s infinite'
                        : 'none',
                    }}
                  />
                  <div
                    style={{
                      animation: isItemActive
                        ? 'avatar-bump-left 5s ease-in-out infinite'
                        : 'none',
                    }}
                  >
                    <Avatar
                      user={user2}
                      size={100}
                      includeLink={false}
                      isSizePercent
                      className="relative z-10"
                    />
                  </div>

                  {/* User 2 Points Animation */}
                  <div
                    className="absolute top-0 left-0 w-full h-full text-right text-6xl font-bold"
                    style={{
                      animation: isItemActive
                        ? 'points-flow-to-handshake-left 5s ease-in infinite'
                        : 'none',
                      color: '#f97316',
                      textShadow: '0px 2px 5px rgba(0, 0, 0, 1)',
                      transformOrigin: 'center left',
                    }}
                  >
                    +{conspirator.user2Points}
                  </div>
                </div>
              </div>

              <div
                className={twMerge(
                  'text-center transition-all duration-700 transform relative z-10',
                  isItemActive
                    ? 'opacity-100 delay-400 translate-y-0'
                    : 'opacity-0 translate-y-10',
                )}
              >
                <p
                  className="text-2xl text-white md:text-3xl font-bold mb-2 drop-shadow-lg"
                  style={{
                    animation: isItemActive
                      ? 'fade-in-bounce 0.6s ease-out 0.6s both'
                      : 'none',
                  }}
                >
                  {user1.firstName} & {user2.firstName}
                </p>
                <p
                  className="text-xl text-purple-200 mb-4 drop-shadow-md"
                  style={{
                    animation: isItemActive
                      ? 'fade-in-bounce 0.6s ease-out 0.8s both'
                      : 'none',
                  }}
                >
                  exchanged a total of
                </p>

                <StatBounce isActive={isItemActive}>
                  <div
                    style={{
                      animation: isItemActive
                        ? 'points-explode 0.8s ease-out 1s both'
                        : 'none',
                    }}
                  >
                    <DataText
                      className="text-6xl md:text-8xl font-bold"
                      color={NEON_COLORS.Yellow}
                    >
                      {conspirator.totalPoints} points
                    </DataText>
                  </div>
                </StatBounce>
              </div>
            </div>
          );
        }}
      />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes eye-blink {
          0%,
          94%,
          100% {
            opacity: 0.25;
            transform: scaleY(1) rotate(0deg);
          }
          95%,
          97% {
            opacity: 0.1;
            transform: scaleY(0.1) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
          }
        }

        @keyframes sparkle-twinkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.8) rotate(0deg);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.3) rotate(180deg);
          }
        }

        @keyframes float-spin {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-20px) rotate(90deg);
            opacity: 0.35;
          }
          50% {
            transform: translateY(0) rotate(180deg);
            opacity: 0.2;
          }
          75% {
            transform: translateY(20px) rotate(270deg);
            opacity: 0.35;
          }
        }

        @keyframes pulse-mysterious {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.6;
          }
        }

        @keyframes avatar-bump-right {
          0%,
          100% {
            transform: translateX(0) rotate(0deg);
          }
          15% {
            transform: translateX(30px) rotate(8deg);
          }
          20% {
            transform: translateX(35px) rotate(10deg);
          }
          25% {
            transform: translateX(30px) rotate(8deg);
          }
          30% {
            transform: translateX(0) rotate(0deg);
          }
        }

        @keyframes avatar-bump-left {
          0%,
          100% {
            transform: translateX(0) rotate(0deg);
          }
          15% {
            transform: translateX(-30px) rotate(-8deg);
          }
          20% {
            transform: translateX(-35px) rotate(-10deg);
          }
          25% {
            transform: translateX(-30px) rotate(-8deg);
          }
          30% {
            transform: translateX(0) rotate(0deg);
          }
        }

        @keyframes handshake-pulse {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.15) rotate(-5deg);
          }
          75% {
            transform: scale(1.15) rotate(5deg);
          }
        }

        @keyframes pulse-line {
          0%,
          100% {
            opacity: 0.3;
            transform: translateY(-50%) scaleX(1);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-50%) scaleX(1.05);
          }
        }

        @keyframes fade-in-bounce {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          60% {
            transform: translateY(-5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes points-explode {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-15deg);
          }
          50% {
            transform: scale(1.15) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes points-flow-to-handshake {
          0% {
            opacity: 1;
            transform: translateX(0) translateY(0);
            scale: 1;
          }
          20% {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
          25% {
            opacity: 1;
            transform: translateX(80%) translateY(22%);
            scale: 0.5;
          }
          30% {
            opacity: 0;
            transform: translateX(80%) translateY(22%);
            scale: 0.5;
          }
          100% {
            opacity: 0;
            transform: translateX(80%) translateY(22%);
            scale: 0.5;
          }
        }

        @keyframes points-flow-to-handshake-left {
          0% {
            opacity: 1;
            transform: translateX(0) translateY(0);
            scale: 1;
          }
          20% {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
          25% {
            opacity: 1;
            transform: translateX(-80%) translateY(22%);
            scale: 0.5;
          }
          30% {
            opacity: 0;
            transform: translateX(-80%) translateY(22%);
            scale: 0.5;
          }
          100% {
            opacity: 0;
            transform: translateX(-80%) translateY(22%);
            scale: 0.5;
          }
        }
      `}</style>
    </Screen>
  );
}
