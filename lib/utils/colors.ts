import { PopulatedLeague, PopulatedRound } from '../types';
import { assertNever } from './never';

export type StatusColor =
  | PopulatedLeague['status']
  | PopulatedRound['stage']
  | 'error'
  | 'warning'
  | 'info';

export function getStatusColor(status: StatusColor): string {
  switch (status) {
    case 'completed': {
      return 'bg-emerald-50/80 text-emerald-800 ring-emerald-600/25';
    }
    case 'active': {
      return 'bg-blue-50/80 text-blue-800 ring-blue-600/25';
    }
    case 'upcoming': {
      return 'bg-amber-50/80 text-amber-800 ring-amber-600/30';
    }
    case 'unknown':
    case 'pending': {
      return 'bg-white/60 text-ink-muted ring-black/10';
    }
    case 'submission': {
      return 'bg-primary-lightest/80 text-primary-darkest ring-primary/30';
    }
    case 'voting':
    case 'currentUserVotingCompleted': {
      return 'bg-orange-50/80 text-orange-800 ring-orange-600/30';
    }
    case 'error': {
      return 'bg-red-50/80 text-red-800 ring-red-600/25';
    }
    case 'warning': {
      return 'bg-amber-100/90 text-amber-900 ring-amber-600/40';
    }
    case 'info': {
      return 'bg-sky-50/80 text-sky-800 ring-sky-600/25';
    }
    default: {
      assertNever(status);
    }
  }
}
