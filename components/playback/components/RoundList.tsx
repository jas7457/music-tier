'use client';

import { PopulatedRound } from '@/lib/types';
import { Screen } from './Screen';

interface RoundListItem {
  round: PopulatedRound;
  subtitle?: string;
  rightText?: string;
}

interface RoundListProps {
  isActive: boolean;
  rounds: RoundListItem[];
  background?: {
    from: string;
    via: string;
    to: string;
  };
  title?: string;
}

export function RoundList({
  rounds,
  background,
  title,
  isActive,
}: RoundListProps) {
  return (
    <Screen background={background}>
      <div className="h-full grid items-center text-white py-14">
        <div className="max-h-full overflow-y-auto">
          {title && (
            <div className="text-center py-3 shrink-0">
              <h2 className="text-2xl font-bold drop-shadow-lg">{title}</h2>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="bg-white/10 rounded-xl border border-white/20 max-w-2xl mx-auto space-y-2">
              {rounds.map((item, index) => (
                <div
                  key={item.round._id}
                  className="flex items-center gap-3 py-3 px-3 rounded-lg transition-all duration-300"
                  style={{
                    animation: isActive
                      ? `slide-in-round 0.4s ease-out ${index * 80}ms both`
                      : 'none',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white drop-shadow-md">
                      {item.round.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-xs text-white/70">
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {item.rightText && (
                    <div
                      className="shrink-0 relative"
                      style={{
                        animation: isActive
                          ? `points-fade-in 0.5s ease-out ${
                              index * 80 + 200
                            }ms both, points-bounce 3.6s ease-in-out ${
                              index * 80 + 3200
                            }ms infinite`
                          : 'none',
                      }}
                    >
                      <div
                        className="text-lg font-bold text-white drop-shadow-lg transition-all duration-300"
                        style={{
                          textShadow:
                            '0 0 10px rgba(251, 191, 36, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        {item.rightText}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-in-round {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes round-pop {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-180deg);
          }
          60% {
            transform: scale(1.15) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes points-fade-in {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.8);
          }
          60% {
            transform: translateY(2px) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes points-bounce {
          0%,
          8.3%,
          16.7%,
          100% {
            transform: scale(1);
          }
          12.5% {
            transform: scale(1.15);
          }
        }
      `}</style>
    </Screen>
  );
}
