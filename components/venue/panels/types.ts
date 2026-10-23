import type { PopulatedLeague, PopulatedPoll, PopulatedUser } from '@/lib/types';
import type { LeagueSummary } from '@/lib/data';
import type { StationId } from '../stations';
import type { VenueModel } from '../venueModel';

export type PanelProps = {
  league: PopulatedLeague;
  user: PopulatedUser;
  model: VenueModel;
  polls: PopulatedPoll[] | null;
  otherLeagues: LeagueSummary[];
  goTo: (station: StationId) => void;
  // open one round's details inside the record crates
  openRound: (roundId: string) => void;
};
