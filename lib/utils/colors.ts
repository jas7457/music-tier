import { PopulatedLeague, PopulatedRound } from '../types';
import { assertNever } from './never';

export type StatusColor =
  | PopulatedLeague['status']
  | PopulatedRound['stage']
  | 'error'
  | 'warning'
  | 'info';

// Game Boy screens have four shades, so statuses differ by fill, not hue.
export function getStatusColor(status: StatusColor): string {
  switch (status) {
    case 'completed': {
      return 'bg-black text-white ring-black';
    }
    case 'active': {
      return 'bg-white text-black ring-black';
    }
    case 'upcoming': {
      return 'bg-gray-400 text-black ring-black';
    }
    case 'unknown':
    case 'pending': {
      return 'bg-white text-gray-600 ring-gray-600';
    }
    case 'submission': {
      return 'bg-white text-black ring-black';
    }
    case 'voting':
    case 'currentUserVotingCompleted': {
      return 'bg-gray-600 text-white ring-black';
    }
    case 'error': {
      return 'bg-black text-white ring-black';
    }
    case 'warning': {
      return 'bg-gray-400 text-black ring-black';
    }
    case 'info': {
      return 'bg-white text-black ring-black';
    }
    default: {
      assertNever(status);
    }
  }
}
