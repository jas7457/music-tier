"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps } from "react";

type MaybeLinkProps = ComponentProps<typeof Link> & {
  forceNormalText?: boolean;
};

export function MaybeLink({
  href,
  children,
  className,
  forceNormalText = false,
  ...props
}: MaybeLinkProps) {
  const pathname = usePathname();

  // Convert href to string for comparison
  const hrefString = typeof href === "string" ? href : href.pathname || "";

  // Check if the link is to the current route
  const isCurrentRoute = pathname === hrefString;

  if (isCurrentRoute || forceNormalText) {
    // Render as a div if linking to current route
    return <div className={className}>{children}</div>;
  }

  // Render as a Link if not current route
  return (
    <Link
      href={href}
      className={[className, "hover:text-purple-500 transition-colors"]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Link>
  );
}
