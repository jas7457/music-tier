import { PopulatedLeague, PopulatedRound } from '../types';
import { assertNever } from './never';

export type StatusColor =
  | PopulatedLeague['status']
  | PopulatedRound['stage']
  | 'error'
  | 'info';

/**
 * Status colours drawn from the VGA 16, which is all the shell ever had.
 * Every value is a flat fill plus its legible foreground — no rings, no alpha.
 */
export function getStatusColor(status: StatusColor): string {
  switch (status) {
    case 'completed': {
      return 'bg-[#008000] text-white';
    }
    case 'active': {
      return 'bg-[#000080] text-white';
    }
    case 'upcoming': {
      return 'bg-[#808000] text-white';
    }
    case 'unknown':
    case 'pending': {
      return 'bg-w98-face text-black';
    }
    case 'submission': {
      return 'bg-[#008080] text-white';
    }
    case 'voting':
    case 'currentUserVotingCompleted': {
      return 'bg-[#800080] text-white';
    }
    case 'error': {
      return 'bg-[#800000] text-white';
    }
    case 'info': {
      return 'bg-[#0000c0] text-white';
    }
    default: {
      assertNever(status);
    }
  }
}
