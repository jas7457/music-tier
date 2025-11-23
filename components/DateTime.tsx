import { formatDate, formatDateWithTime } from "@/lib/utils/formatDate";

export function DateTime({ children }: { children: number }) {
  return (
    <span title={formatDateWithTime(children)}>{formatDate(children)}</span>
  );
}
