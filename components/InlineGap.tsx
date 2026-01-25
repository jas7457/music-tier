import { Fragment, ReactNode } from 'react';

export function InlineGap({ children }: { children: Array<ReactNode> }) {
  return (
    <Fragment>
      {children.filter(Boolean).map((child, index) => {
        return (
          <Fragment key={index}>
            {index > 0 && <>&nbsp;&nbsp;</>}
            {child}
          </Fragment>
        );
      })}
    </Fragment>
  );
}
