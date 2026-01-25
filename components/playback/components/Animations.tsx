'use client';

import { CSSProperties, ReactNode } from 'react';

interface StatBounceProps {
  isActive: boolean;
  delay?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  repeatAfter?: number;
}

export function StatBounce({
  isActive,
  delay = 0.7,
  children,
  className = '',
  style = {},
}: StatBounceProps) {
  return (
    <div
      className={className}
      style={{
        ...style,
        animation: isActive ? `stat-bounce 5s infinite ${delay}s both` : 'none',
      }}
    >
      {children}

      <style jsx>{`
        @keyframes stat-bounce {
          0% {
            transform: scale(0.8);
          }

          10% {
            transform: scale(1.15);
          }

          20% {
            transform: scale(1);
          }

          60% {
            transform: scale(1);
          }

          100% {
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}
