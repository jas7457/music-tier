import { PopulatedUser } from "@/lib/types";
import { twMerge } from "tailwind-merge";

export function Avatar({
  className,
  user,
  size = 8,
  includeTooltip,
  tooltipText = `${user.firstName} ${user.lastName}`,
}: {
  user: PopulatedUser;
  size?: number;
  includeTooltip?: boolean;
  tooltipText?: string;
  className?: string;
}) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const initial = user.userName.charAt(0).toUpperCase();

  const gradients = [
    "from-blue-500 to-purple-600",
    "from-pink-500 to-rose-600",
    "from-green-500 to-emerald-600",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-purple-600",
    "from-amber-500 to-orange-600",
    "from-teal-500 to-cyan-600",
    "from-indigo-500 to-blue-600",
    "from-fuchsia-500 to-pink-600",
  ];

  const sizeStr = `w-${size} h-${size}`;

  const index = user.index === -1 ? 0 : user.index;
  const gradient = gradients[index % gradients.length];
  return (
    <div className="relative group">
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={fullName}
          className={`${sizeStr} rounded-full object-cover border-2 border-gray-300`}
        />
      ) : (
        <div
          className={twMerge(
            sizeStr,
            gradient,
            "rounded-full bg-linear-to-br flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-300",
            className
          )}
        >
          {initial}
        </div>
      )}

      {includeTooltip && (
        <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {tooltipText}
        </div>
      )}
    </div>
  );
}
