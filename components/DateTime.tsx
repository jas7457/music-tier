import { formatDate, formatDateWithTime } from "@/lib/utils/formatDate";

export function DateTime({
  children,
  prefix = "",
}: {
  children: number;
  prefix?: string;
}) {
  return (
    <span title={formatDateWithTime(children)}>
      {prefix ? `${prefix} ` : ""}
      {formatDate(children)}
    </span>
  );
}
