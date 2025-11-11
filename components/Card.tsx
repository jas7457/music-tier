import { twMerge } from "tailwind-merge";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outlined" | "elevated";
}

export default function Card({
  children,
  className = "",
  variant = "default",
}: CardProps) {
  const baseStyles = "rounded-lg transition-shadow";

  const variantStyles = {
    default: "bg-white shadow-md",
    outlined: "bg-white border border-gray-200",
    elevated: "bg-white shadow-lg hover:shadow-xl",
  };

  return (
    <div
      data-component="Card"
      className={twMerge(baseStyles, variantStyles[variant], className)}
    >
      {children}
    </div>
  );
}
