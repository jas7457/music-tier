import { formatDate, formatDateWithTime } from '@/lib/utils/formatDate';
import { useState } from 'react';

export function DateTime({
  children,
  prefix = '',
}: {
  children: number;
  prefix?: string;
}) {
  const [shortVersion, setShortVersion] = useState(true);
  return (
    <span
      title={formatDateWithTime(children, { second: 'numeric' })}
      onClick={() => setShortVersion((current) => !current)}
      className="select-none"
    >
      {prefix ? `${prefix} ` : ''}
      {shortVersion ? formatDate(children) : formatDateWithTime(children)}
    </span>
  );
}
