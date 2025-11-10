export function getUserGradient(userIndex: number): string {
  const gradients = [
    "from-blue-500 to-purple-600",
    "from-pink-500 to-rose-600",
    "from-green-500 to-emerald-600",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-purple-600",
    "from-amber-500 to-orange-600",
    "from-teal-500 to-cyan-600",
    "from-indigo-500 to-blue-600",
    "from-fuchsia-500 to-pink-600",
  ];

  return gradients[userIndex % gradients.length];
}
