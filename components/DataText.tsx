import { twMerge } from 'tailwind-merge';

export function DataText({
  children,
  variant = 'glow',
  color,
  className,
}: {
  children: React.ReactNode;
  variant?: 'gradient' | 'shadow' | 'glow';
  color: string;
  className?: string;
}) {
  const variantStyles = {
    gradient: {
      background: `linear-gradient(135deg, ${color} 0%, ${color} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontWeight: '700',
    },
    shadow: {
      color: color,
      textShadow: '2px 2px 0px rgba(0,0,0,0.1), 0px 4px 8px rgba(0,0,0,0.15)',
      fontWeight: '700',
    },
    glow: {
      color: color || '#6366f1',
      filter: 'drop-shadow(0 0 10px currentColor)',
      fontWeight: '700',
    },
  };

  return (
    <span
      className={twMerge('inline-block', className)}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
