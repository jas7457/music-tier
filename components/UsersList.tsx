"use client";

import { PopulatedUser } from "@/lib/types";
import { getUserGradient } from "@/lib/utils/getUserGradient";

interface UsersListProps {
  users: (PopulatedUser & { index: number })[];
  text: {
    verb: string;
    noun: string;
  };
}

export function UsersList({ users, text }: UsersListProps) {
  const formattedVerb = text.verb.charAt(0).toUpperCase() + text.verb.slice(1);

  if (users.length === 0) {
    return (
      <div className="mt-4">
        <h6 className="text-xs font-semibold text-gray-600 mb-2">
          {formattedVerb}
        </h6>
        <p className="text-xs text-gray-500">No {text.noun} yet</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h6 className="text-xs font-semibold text-gray-600 mb-2">
        {formattedVerb} ({users.length})
      </h6>
      <div className="flex flex-wrap gap-2">
        {users.map((user) => {
          const fullName = `${user.firstName} ${user.lastName}`;
          const initial = user.userName.charAt(0).toUpperCase();
          const gradient = getUserGradient(user.index);

          return (
            <div key={user._id} className="relative group">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={fullName}
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-300"
                />
              ) : (
                <div
                  className={`w-8 h-8 rounded-full bg-linear-to-br ${gradient} flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-300`}
                >
                  {initial}
                </div>
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {fullName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
