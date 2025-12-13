export function getPlaces(points: number[]) {
  const inOrder = [...points].sort((a, b) => b - a);

  let currentHighScore = inOrder[0];
  let currentPlace = 1;

  return points.map((point, index) => {
    const thisPlace = point === currentHighScore ? currentPlace : index + 1;
    if (point < currentHighScore) {
      currentPlace = thisPlace;
      currentHighScore = point;
    }
    return thisPlace;
  });
}

export function getPlaceString(place: number) {
  const suffix =
    place % 10 === 1 && place % 100 !== 11
      ? "st"
      : place % 10 === 2 && place % 100 !== 12
      ? "nd"
      : place % 10 === 3 && place % 100 !== 13
      ? "rd"
      : "th";
  return `${place}${suffix}`;
}
