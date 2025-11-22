"use client";

import { PopulatedUser } from "@/lib/types";
import { Avatar, type AvatarProps } from "./Avatar";
import { twMerge } from "tailwind-merge";

interface UsersListProps {
  className?: string;
  tooltipClassName?: string;
  users: (PopulatedUser & { index: number })[];
  position?: AvatarProps["position"];
  tooltipText?: (user: PopulatedUser) => string;
  text: {
    verb: string;
    noun: string;
  };
}

export function UsersList({
  users,
  text,
  tooltipText = (user) => user.userName,
  className,
  tooltipClassName,
  position,
}: UsersListProps) {
  const formattedVerb = text.verb.charAt(0).toUpperCase() + text.verb.slice(1);

  if (users.length === 0) {
    return (
      <div className={twMerge(className, "flex flex-col")}>
        <h6 className="text-xs font-semibold text-gray-600">{formattedVerb}</h6>
        <p className="text-xs text-gray-500">No {text.noun} yet</p>
      </div>
    );
  }

  return (
    <div className={twMerge(className, "flex flex-col gap-1")}>
      <h6 className="text-xs font-semibold text-gray-600">
        {formattedVerb} ({users.length})
      </h6>
      <div className="flex flex-wrap gap-1">
        {users.map((user) => {
          return (
            <Avatar
              key={user._id}
              tooltipClassName={tooltipClassName}
              user={user}
              size={8}
              includeTooltip
              position={position}
              tooltipText={tooltipText(user)}
            />
          );
        })}
      </div>
    </div>
  );
}
