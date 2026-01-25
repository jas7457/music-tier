import { PopulatedRound } from '../types';

export function getRoundTitle(
  round: Pick<
    PopulatedRound,
    'isHidden' | 'title' | 'isPending' | '_id' | 'roundIndex'
  >,
  includeRoundPrefix = true,
) {
  const roundTitle = (() => {
    if (round.isHidden) {
      return 'Hidden';
    }
    if (round.title) {
      return round.title;
    }
    if (round.isPending && !round._id) {
      return 'Pending';
    }
    return 'Unknown Round';
  })();

  if (includeRoundPrefix) {
    return `Round ${round.roundIndex + 1}: ${roundTitle}`;
  } else {
    return roundTitle;
  }
}
