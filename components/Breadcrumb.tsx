'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type BreadcrumbItem = {
  label: string;
  href?: string; // If href is undefined, the item is not clickable (current page)
  icon?: ReactNode; // Optional icon to display before the label
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

/** Explorer's Address bar: a label, a sunken combo-like well, and a path. */
export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="mb-2 flex items-center gap-2" aria-label="Breadcrumb">
      <span className="text-sm flex-none hidden sm:inline">Address</span>
      <ol className="w98-field flex items-center gap-0.5 grow min-w-0 overflow-x-auto whitespace-nowrap py-0.5">
        {items.map((item, index) => {
          return (
            <li key={index} className="flex items-center flex-none">
              {index > 0 && <span className="px-0.5 text-black">\</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 px-1 text-black no-underline hover:bg-primary hover:text-white"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1 px-1 font-bold">
                  {item.icon}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Icon components — drawn on the pixel grid to match the rest of the shell.
export const HomeIcon = ({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 1l7 7h-2v7H3V8H1z" fill="#000" />
    <path d="M8 3l5 5v6H4V8z" fill="#c05000" />
    <rect x="6" y="10" width="4" height="5" fill="#3f2000" />
    <rect x="4" y="8" width="8" height="1" fill="#ffb080" />
  </svg>
);

export const LeagueIcon = ({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    className={className}
    aria-hidden="true"
  >
    <rect x="1" y="1" width="14" height="14" fill="#fff" stroke="#000" />
    <rect x="3" y="8" width="2" height="5" fill="#ff3b30" />
    <rect x="6" y="5" width="2" height="8" fill="#00a651" />
    <rect x="9" y="3" width="2" height="10" fill="#0072ff" />
    <rect x="12" y="7" width="2" height="6" fill="#ffd400" />
  </svg>
);

export const RoundIcon = ({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="7" fill="#000" />
    <circle cx="8" cy="8" r="6" fill="#c0c0c0" stroke="#fff" />
    <path d="M4 4a6 6 0 0 1 8 0z" fill="#dfdfdf" />
    <circle cx="8" cy="8" r="2" fill="#fff" stroke="#808080" />
    <circle cx="8" cy="8" r="0.8" fill="#808080" />
  </svg>
);
