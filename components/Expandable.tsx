import { twMerge } from "tailwind-merge";

export function Expandable({
  isExpanded,
  children,
  className,
}: {
  isExpanded: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={twMerge(
        "overflow-hidden transition-[height] duration-300 ease-in-out",
        isExpanded ? "h-auto" : "h-0"
      )}
      style={{
        // @ts-ignore
        interpolateSize: "allow-keywords",
      }}
    >
      <div className={className}>{children}</div>
    </div>
  );
}
