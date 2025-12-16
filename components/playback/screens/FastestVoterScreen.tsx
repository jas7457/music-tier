"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { formatTime } from "./utils";
import { RoundList } from "../components/RoundList";

export function FastestVoterScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.fastestVoters;

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#3b82f6", via: "#a855f7", to: "#10b981" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No voting data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#3b82f6", via: "#a855f7", to: "#10b981" }}>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(voter, index, isItemActive) => (
          <>
            {/* Floating checkmark badges - only for first place */}
            {index === 0 && isItemActive && (
              <>
                <div
                  className="absolute top-[20%] left-[10%] text-6xl opacity-60 z-10"
                  style={{
                    animation: "float-check 3s ease-in-out infinite",
                  }}
                >
                  ✓
                </div>
                <div
                  className="absolute top-[30%] right-[15%] text-5xl opacity-50 z-10"
                  style={{
                    animation: "float-check 3.5s ease-in-out 0.5s infinite",
                  }}
                >
                  ✓
                </div>
                <div
                  className="absolute bottom-[35%] left-[20%] text-7xl opacity-40 z-10"
                  style={{
                    animation: "float-check 3.2s ease-in-out 1s infinite",
                  }}
                >
                  ✓
                </div>
                <div
                  className="absolute bottom-[20%] right-[10%] text-5xl opacity-55 z-10"
                  style={{
                    animation: "float-check 3.8s ease-in-out 1.5s infinite",
                  }}
                >
                  ✓
                </div>
                <div
                  className="absolute top-[50%] right-[25%] text-4xl opacity-45 z-10"
                  style={{
                    animation: "float-check 3.3s ease-in-out 2s infinite",
                  }}
                >
                  ✓
                </div>
              </>
            )}

            <UserStatScreen
              isActive={isItemActive}
              kicker="Did you even listen to the songs?"
              title={
                stat.length > 1
                  ? `#${index + 1} Fastest Voter`
                  : "Fastest Voter"
              }
              user={voter.user}
              strokeColor={NEON_COLORS.ElectricPurple}
              stat={{
                value: formatTime(voter.avgTime),
                label: "average time",
                icon: "⚡",
              }}
              renderBackface={(isBackfaceActive) => (
                <RoundList
                  title="Voting Times"
                  isActive={isActive && isBackfaceActive}
                  rounds={stat[index].rounds.map((vote) => ({
                    round: vote.round,
                    rightText: formatTime(vote.time),
                  }))}
                />
              )}
              noDataMessage="No voting data available"
            />

            {/* Custom animations */}
            <style jsx>{`
              @keyframes float-check {
                0%,
                100% {
                  transform: translateY(0) rotate(0deg) scale(1);
                  opacity: 0.6;
                }
                25% {
                  transform: translateY(-15px) rotate(-5deg) scale(1.05);
                  opacity: 0.8;
                }
                50% {
                  transform: translateY(-25px) rotate(0deg) scale(1.1);
                  opacity: 0.9;
                }
                75% {
                  transform: translateY(-15px) rotate(5deg) scale(1.05);
                  opacity: 0.8;
                }
              }
            `}</style>
          </>
        )}
      />
    </Screen>
  );
}
