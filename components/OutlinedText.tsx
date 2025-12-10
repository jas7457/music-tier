import { twMerge } from "tailwind-merge";

export function OutlinedText({
  children,
  strokeWidth = 3,
  strokeColor = "white",
  fillColor = "transparent",
  className,
}: {
  children: React.ReactNode;
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
  className?: string;
}) {
  return (
    <div className="relative inline-block">
      {/* Stroke layer (behind) */}
      <div
        className={twMerge("text-transparent", className)}
        style={{
          WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
          paintOrder: "stroke fill",
          fontFamily: "sans-serif",
        }}
        aria-hidden="true"
      >
        {children}
      </div>
      {/* Fill layer (on top) */}
      <div
        className={twMerge("absolute inset-0", className)}
        style={{
          color: fillColor,
        }}
      >
        {children}
      </div>
    </div>
  );
}
