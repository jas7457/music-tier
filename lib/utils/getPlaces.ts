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
