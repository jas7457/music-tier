import { Fragment, ReactNode } from 'react';

export function InlineGap({ children }: { children: Array<ReactNode> }) {
  return (
    <Fragment>
      {children.filter(Boolean).map((child, index) => {
        return (
          <Fragment key={index}>
            {/* nbsp + normal space: keeps the gap but lets the row wrap */}
            {index > 0 && <>&nbsp; </>}
            {child}
          </Fragment>
        );
      })}
    </Fragment>
  );
}
