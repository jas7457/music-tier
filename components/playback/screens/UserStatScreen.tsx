"use client";

import { twMerge } from "tailwind-merge";
import { Avatar } from "@/components/Avatar";
import type { PopulatedUser } from "@/lib/types";
import { OutlinedText } from "@/components/OutlinedText";

interface UserStatScreenProps {
  isActive: boolean;
  kicker: string;
  title: string;
  user: PopulatedUser | null;
  strokeColor: string;
  stat: {
    value: string | number;
    label: string;
    icon?: string;
  };
  noDataMessage?: string;
}

export function UserStatScreen({
  isActive,
  kicker,
  title,
  user,
  stat,
  strokeColor,
  noDataMessage = "No data available",
}: UserStatScreenProps) {
  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">{noDataMessage}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-white gap-8">
      <div
        className={twMerge(
          "transition-all duration-500",
          isActive ? "opacity-100 delay-0" : "opacity-0"
        )}
      >
        <h2 className="text-center">{kicker}</h2>
        <p className="text-2xl text-purple-300 text-center">{title}</p>
      </div>

      <div
        className={twMerge(
          "transition-all duration-500",
          isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
        )}
      >
        <Avatar user={user} size={100} includeLink={false} isSizePercent />
      </div>

      <div
        className={twMerge(
          "text-center transition-all duration-500",
          isActive ? "opacity-100 delay-400" : "opacity-0"
        )}
      >
        <p className="text-3xl md:text-4xl font-bold mb-4">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xl text-purple-200 mb-2">{stat.label}</p>
        <div className="text-6xl font-bold wrap-break-word break-all">
          {stat.icon && <span className="mr-1">{stat.icon}</span>}
          <OutlinedText strokeColor={strokeColor} strokeWidth={2}>
            {stat.value}
          </OutlinedText>
        </div>
      </div>
    </div>
  );
}
