import { twMerge } from "tailwind-merge";

import type { JSX, FC } from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outlined" | "elevated";
  element?: "div" | "button" | FC<JSX.IntrinsicElements["button"]>;
  onClick?: () => void;
  title?: string;
}

export default function Card({
  children,
  className = "",
  variant = "default",
  element: Element = "div",
  onClick,
  title,
}: CardProps) {
  const baseStyles = "rounded-lg transition-shadow";

  const variantStyles = {
    default: "bg-white shadow-md",
    outlined: "bg-white border border-gray-200",
    elevated: "bg-white shadow-lg hover:shadow-xl",
  };

  return (
    <Element
      data-component="Card"
      className={twMerge(baseStyles, variantStyles[variant], className)}
      onClick={onClick}
      title={title}
    >
      {children}
    </Element>
  );
}
