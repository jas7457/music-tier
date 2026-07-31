import { PopulatedUser } from '@/lib/types';
import { twMerge } from 'tailwind-merge';
import { MaybeLink } from './MaybeLink';

export interface AvatarProps {
  user: PopulatedUser;
  size?: number;
  isSizePercent?: boolean;
  includeTooltip?: boolean;
  tooltipText?: string;
  className?: string;
  includeLink?: boolean;
  maxWidth?: string;
}

export function Avatar({
  className,
  user,
  size = 8,
  isSizePercent = false,
  includeTooltip,
  tooltipText = user.userName,
  includeLink = true,
  maxWidth,
}: AvatarProps) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const initial = user.userName.charAt(0).toUpperCase();

  // Flat VGA fills instead of gradients — one per user, stable by index.
  const colors = [
    'bg-[#000080]',
    'bg-[#800000]',
    'bg-[#008000]',
    'bg-[#808000]',
    'bg-[#008080]',
    'bg-[#800080]',
    'bg-[#0000c0]',
    'bg-[#c05000]',
    'bg-[#005050]',
    'bg-[#404080]',
  ];

  const sizeStr = isSizePercent ? '' : `w-${size}`;

  const index = user.index === -1 ? 0 : user.index;
  const color = colors[index % colors.length];

  return (
    <MaybeLink
      href={`/users/${user._id}`}
      className="relative group no-underline"
      forceNormalText={!includeLink}
      {...(includeTooltip ? { title: tooltipText } : {})}
      style={{ width: isSizePercent ? `${size}%` : undefined, maxWidth }}
    >
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={fullName}
          className={twMerge(
            sizeStr,
            'object-cover shadow-w98-out-thin aspect-square max-w-full',
            isSizePercent ? 'w-full' : '',
            className,
          )}
        />
      ) : (
        <div
          className={twMerge(
            sizeStr,
            color,
            'flex items-center justify-center text-white font-bold text-sm aspect-square max-w-full shadow-w98-out-thin',
            className,
          )}
        >
          {initial}
        </div>
      )}
    </MaybeLink>
  );
}
