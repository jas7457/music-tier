import { PopulatedLeague, PopulatedRound } from "@/lib/types";
import { assertNever } from "@/lib/utils/never";
import { twMerge } from "tailwind-merge";

export function Pill({
  children,
  status,
  className,
}: {
  children: React.ReactNode;
  status: PopulatedLeague["status"] | PopulatedRound["stage"];
  className?: string;
}) {
  const statusClasses = (() => {
    switch (status) {
      case "completed": {
        return "bg-green-100 text-green-800";
      }
      case "active": {
        return "bg-blue-100 text-blue-800";
      }
      case "upcoming": {
        return "bg-yellow-100 text-yellow-800";
      }
      case "unknown":
      case "pending": {
        return "bg-gray-200 text-gray-700";
      }
      case "submission": {
        return "bg-purple-100 text-purple-800";
      }
      case "voting":
      case "currentUserVotingCompleted": {
        return "bg-orange-100 text-orange-800";
      }
      default: {
        assertNever(status);
      }
    }
  })();

  return (
    <span
      className={twMerge(
        "inline-block rounded-full px-3 py-1 text-xs font-semibold",
        statusClasses,
        className
      )}
    >
      {children}
    </span>
  );
}
