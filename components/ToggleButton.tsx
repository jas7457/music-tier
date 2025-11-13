import { twMerge } from "tailwind-merge";

export function ToggleButton({
  children,
  onClick,
  selected,
}: {
  onClick: () => void;
  children: React.ReactNode;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        selected
          ? "bg-purple-600 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      )}
    >
      {children}
    </button>
  );
}
