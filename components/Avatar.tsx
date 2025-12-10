import { PopulatedUser } from "@/lib/types";
import { twMerge } from "tailwind-merge";
import { MaybeLink } from "./MaybeLink";

export interface AvatarProps {
  user: PopulatedUser;
  size?: number;
  isSizePercent?: boolean;
  includeTooltip?: boolean;
  tooltipText?: string;
  className?: string;
  includeLink?: boolean;
}

export function Avatar({
  className,
  user,
  size = 8,
  isSizePercent = false,
  includeTooltip,
  tooltipText = user.userName,
  includeLink = true,
}: AvatarProps) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const initial = user.userName.charAt(0).toUpperCase();

  const gradients = [
    "from-blue-500 to-primary-dark",
    "from-pink-500 to-rose-600",
    "from-green-500 to-emerald-600",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-primary-dark",
    "from-amber-500 to-orange-600",
    "from-teal-500 to-cyan-600",
    "from-indigo-500 to-blue-600",
    "from-fuchsia-500 to-pink-600",
  ];

  const sizeStr = isSizePercent ? "" : `w-${size}`;

  const index = user.index === -1 ? 0 : user.index;
  const gradient = gradients[index % gradients.length];
  return (
    <MaybeLink
      href={`/users/${user._id}`}
      className="relative group"
      forceNormalText={!includeLink}
      {...(includeTooltip ? { title: tooltipText } : {})}
      style={{ width: isSizePercent ? `${size}%` : undefined }}
    >
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={fullName}
          className={twMerge(
            sizeStr,
            "rounded-full object-cover border-2 border-gray-300 aspect-square",
            isSizePercent ? "w-full" : ""
          )}
        />
      ) : (
        <div
          className={twMerge(
            sizeStr,
            gradient,
            "rounded-full bg-linear-to-br flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-300 aspect-square",
            className
          )}
        >
          {initial}
        </div>
      )}
    </MaybeLink>
  );
}
