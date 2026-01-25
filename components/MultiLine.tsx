import { Fragment, useMemo } from 'react';

export function MultiLine({ children }: { children: string }) {
  const output = useMemo(() => {
    const lines = children.split('\n');
    if (lines.length === 1) {
      return children;
    }
    return lines
      .flatMap((line, index) => {
        const arr = [line] as React.ReactNode[];
        if (index < lines.length - 1) {
          arr.push(<br />);
        }
        return arr;
      })
      .map((node, index) => {
        const key = typeof node === 'string' ? `${node}.${index}` : index;
        return <Fragment key={key}>{node}</Fragment>;
      });
  }, [children]);

  return output;
}
