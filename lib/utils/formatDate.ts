export function formatDate(timestamp?: number) {
  if (!timestamp) return "Not set";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
