import { PopulatedUser } from '../types';

export function getPlaces<
  TEntry extends { user: PopulatedUser; points: number; wins: number },
>(entries: Array<TEntry>) {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    return a.user.index - b.user.index;
  });

  let currentHighScore = sortedEntries[0].points;
  let currentPlace = 1;

  return sortedEntries.map((entry, index) => {
    const thisPlace =
      entry.points === currentHighScore ? currentPlace : index + 1;
    if (entry.points < currentHighScore) {
      currentPlace = thisPlace;
      currentHighScore = entry.points;
    }
    return { ...entry, place: thisPlace };
  });
}

export function getPlaceString(place: number) {
  const suffix =
    place % 10 === 1 && place % 100 !== 11
      ? 'st'
      : place % 10 === 2 && place % 100 !== 12
        ? 'nd'
        : place % 10 === 3 && place % 100 !== 13
          ? 'rd'
          : 'th';
  return `${place}${suffix}`;
}
