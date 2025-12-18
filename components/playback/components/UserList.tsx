"use client";

import { Avatar } from "@/components/Avatar";
import { PopulatedUser } from "@/lib/types";
import { Screen } from "./Screen";
import { BlockQuote } from "@/components/BlockQuote";

interface UserListItem {
  user: PopulatedUser;
  rightText?: string;
  note: string | undefined;
}

interface UserListProps {
  isActive: boolean;
  users: UserListItem[];
  background?: {
    from: string;
    via: string;
    to: string;
  };
  title?: string;
}

export function UserList({
  users,
  background,
  title,
  isActive,
}: UserListProps) {
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
            <div className="bg-white/10 rounded-xl border border-white/20 max-w-2xl mx-auto divide-y divide-white/20">
              {users.map((item, index) => (
                <div key={item.user._id} className="py-3 px-3">
                  <div
                    className="flex items-center gap-3 transition-all duration-300"
                    style={{
                      animation: isActive
                        ? `slide-in-user 0.4s ease-out ${index * 80}ms both`
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        animation: isActive
                          ? `avatar-pop 0.5s ease-out ${
                              index * 80 + 100
                            }ms both`
                          : "none",
                      }}
                    >
                      <Avatar user={item.user} size={16} includeLink={false} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold text-white drop-shadow-md text-shadow-md">
                        {item.user.firstName} {item.user.lastName}
                      </div>
                      <div className="text-md text-white/70">
                        {item.user.userName}
                      </div>
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
                            : "none",
                        }}
                      >
                        <div className="text-lg font-bold text-green-400 drop-shadow-md transition-all duration-300 text-shadow-lg">
                          {item.rightText}
                        </div>
                      </div>
                    )}
                  </div>

                  {item.note && (
                    <BlockQuote className="ml-8">{item.note}</BlockQuote>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-in-user {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes avatar-pop {
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

        @keyframes glow-pulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>
    </Screen>
  );
}
