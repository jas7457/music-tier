import { getStatusColor, StatusColor } from "@/lib/utils/colors";
import { twMerge } from "tailwind-merge";

export function Pill({
  children,
  status,
  className,
}: {
  children: React.ReactNode;
  status: StatusColor;
  className?: string;
}) {
  return (
    <span
      className={twMerge(
        "inline-block rounded-full px-3 py-1 text-xs font-semibold",
        getStatusColor(status),
        className
      )}
    >
      {children}
    </span>
  );
}
