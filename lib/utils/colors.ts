import { PopulatedLeague, PopulatedRound } from "../types";
import { assertNever } from "./never";

export function getStatusColor(
  status: PopulatedLeague["status"] | PopulatedRound["stage"]
): string {
  switch (status) {
    case "completed": {
      return "bg-green-50 text-green-800 border border-green-300";
    }
    case "active": {
      return "bg-blue-50 text-blue-800 border border-blue-300";
    }
    case "upcoming": {
      return "bg-yellow-50 text-yellow-800 border border-yellow-300";
    }
    case "unknown":
    case "pending": {
      return "bg-gray-50 text-gray-800 border border-gray-300";
    }
    case "submission": {
      return "bg-purple-50 text-purple-800 border border-purple-300";
    }
    case "voting":
    case "currentUserVotingCompleted": {
      return "bg-orange-50 text-orange-800 border border-orange-300";
    }
    default: {
      assertNever(status);
    }
  }
}
