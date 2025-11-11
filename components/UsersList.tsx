"use client";

import { PopulatedUser } from "@/lib/types";
import { Avatar } from "./Avatar";

interface UsersListProps {
  className?: string;
  users: (PopulatedUser & { index: number })[];
  text: {
    verb: string;
    noun: string;
  };
}

export function UsersList({ users, text, className }: UsersListProps) {
  const formattedVerb = text.verb.charAt(0).toUpperCase() + text.verb.slice(1);

  if (users.length === 0) {
    return (
      <div className={className}>
        <h6 className="text-xs font-semibold text-gray-600">{formattedVerb}</h6>
        <p className="text-xs text-gray-500">No {text.noun} yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h6 className="text-xs font-semibold text-gray-600">
        {formattedVerb} ({users.length})
      </h6>
      <div className="flex flex-wrap gap-2">
        {users.map((user) => {
          return <Avatar key={user._id} user={user} size={8} includeTooltip />;
        })}
      </div>
    </div>
  );
}
