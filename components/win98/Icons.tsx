/* 16×16 shell icons, drawn as flat shapes on a pixel grid.
   shapeRendering="crispEdges" keeps the edges hard at any zoom. */

type IconProps = { size?: number; className?: string };

function Svg({
  size = 16,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* The flag. Four quadrants sheared into the wave. */
export function WindowsLogo({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 4.2 6.6 2v5.3L1 8.1z" fill="#ff3b30" />
      <path d="M7.4 1.8 15 0v7.2l-7.6.1z" fill="#00a651" />
      <path d="M1 8.9l5.6-.6v5.2L1 11.8z" fill="#0072ff" />
      <path d="M7.4 8.2 15 8v7.5l-7.6-1.9z" fill="#ffd400" />
    </svg>
  );
}

export function ComputerIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="1" y="2" width="12" height="9" fill="#c0c0c0" />
      <rect x="1" y="2" width="12" height="1" fill="#fff" />
      <rect x="1" y="2" width="1" height="9" fill="#fff" />
      <rect x="2" y="3" width="10" height="7" fill="#008080" />
      <rect x="12" y="2" width="1" height="9" fill="#000" />
      <rect x="1" y="10" width="12" height="1" fill="#000" />
      <rect x="4" y="11" width="6" height="2" fill="#808080" />
      <rect x="2" y="13" width="12" height="2" fill="#c0c0c0" />
      <rect x="2" y="13" width="12" height="1" fill="#fff" />
      <rect x="2" y="14" width="12" height="1" fill="#000" />
      <rect x="11" y="13" width="2" height="1" fill="#00ff00" />
    </Svg>
  );
}

export function FolderIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M1 3h5l1 1h8v9H1z" fill="#000" />
      <path d="M2 4h4l1 1h7v7H2z" fill="#ffd400" />
      <path d="M2 4h4l1 1H2z" fill="#ffe680" />
    </Svg>
  );
}

export function FolderOpenIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M1 3h5l1 1h7v2H4L2 12H1z" fill="#000" />
      <path d="M2 4h4l1 1h5v1H4L3 10V4z" fill="#ffd400" />
      <path d="M4 7h11l-2 6H2z" fill="#000" />
      <path d="M5 8h9l-1.5 4H3.5z" fill="#ffe680" />
    </Svg>
  );
}

export function MusicIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="7" y="2" width="2" height="9" fill="#000" />
      <rect x="9" y="2" width="5" height="2" fill="#000" />
      <rect x="9" y="4" width="5" height="1" fill="#808080" />
      <rect x="3" y="9" width="5" height="4" fill="#000" />
      <rect x="4" y="10" width="3" height="2" fill="#808080" />
    </Svg>
  );
}

export function CdIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="8" r="7" fill="#000" />
      <circle cx="8" cy="8" r="6" fill="#c0c0c0" />
      <circle cx="8" cy="8" r="6" fill="none" stroke="#fff" strokeWidth="1" />
      <path d="M4 4a6 6 0 0 1 8 0z" fill="#dfdfdf" />
      <circle cx="8" cy="8" r="2" fill="#fff" stroke="#808080" />
      <circle cx="8" cy="8" r="0.8" fill="#808080" />
    </Svg>
  );
}

export function UserIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="5" r="3" fill="#000" />
      <circle cx="8" cy="5" r="2.2" fill="#ffd9a0" />
      <path d="M2 15c0-4 3-6 6-6s6 2 6 6z" fill="#000" />
      <path d="M3.2 14c.4-3 2.4-4 4.8-4s4.4 1 4.8 4z" fill="#000080" />
    </Svg>
  );
}

export function UsersIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="11" cy="5" r="2.6" fill="#000" />
      <circle cx="11" cy="5" r="1.9" fill="#ffd9a0" />
      <path d="M6 15c0-3.4 2.4-5.2 5-5.2s5 1.8 5 5.2z" fill="#000080" />
      <circle cx="5" cy="6" r="2.6" fill="#000" />
      <circle cx="5" cy="6" r="1.9" fill="#ffd9a0" />
      <path d="M0 15c0-3.4 2.4-5 5-5s5 1.6 5 5z" fill="#008080" />
    </Svg>
  );
}

export function TrophyIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 2h8v4a4 4 0 0 1-8 0z" fill="#ffd400" />
      <path d="M4 2h8v1H4z" fill="#ffe680" />
      <path d="M2 3h2v3H2zM12 3h2v3h-2z" fill="#c8a000" />
      <rect x="7" y="9" width="2" height="3" fill="#c8a000" />
      <rect x="4" y="12" width="8" height="2" fill="#ffd400" />
      <rect x="4" y="12" width="8" height="1" fill="#ffe680" />
    </Svg>
  );
}

export function ChartIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="1" y="1" width="14" height="14" fill="#fff" />
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        fill="none"
        stroke="#000"
        strokeWidth="1"
      />
      <rect x="3" y="8" width="2" height="5" fill="#ff3b30" />
      <rect x="6" y="5" width="2" height="8" fill="#00a651" />
      <rect x="9" y="3" width="2" height="10" fill="#0072ff" />
      <rect x="12" y="7" width="2" height="6" fill="#ffd400" />
    </Svg>
  );
}

export function SettingsIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="7" y="1" width="2" height="14" fill="#808080" />
      <rect x="1" y="7" width="14" height="2" fill="#808080" />
      <rect x="3" y="3" width="10" height="10" fill="#c0c0c0" />
      <rect x="3" y="3" width="10" height="1" fill="#fff" />
      <rect x="3" y="12" width="10" height="1" fill="#000" />
      <circle cx="8" cy="8" r="2.6" fill="#000" />
      <circle cx="8" cy="8" r="1.6" fill="#008080" />
    </Svg>
  );
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="6.5" cy="6.5" r="4.5" fill="#fff" stroke="#000" />
      <path d="M6.5 3a3.5 3.5 0 0 0-3.5 3.5" stroke="#8ecfff" fill="none" />
      <path d="M10 10l4.5 4.5" stroke="#000" strokeWidth="2" />
    </Svg>
  );
}

export function CalendarIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="1" y="2" width="14" height="13" fill="#fff" stroke="#000" />
      <rect x="1" y="2" width="14" height="4" fill="#ff3b30" />
      <rect x="3" y="8" width="2" height="2" fill="#000" />
      <rect x="7" y="8" width="2" height="2" fill="#000" />
      <rect x="11" y="8" width="2" height="2" fill="#000" />
      <rect x="3" y="11" width="2" height="2" fill="#000" />
      <rect x="7" y="11" width="2" height="2" fill="#000080" />
    </Svg>
  );
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="8" r="7" fill="#fff" stroke="#000" />
      <path d="M8 4v4l3 2" stroke="#000" fill="none" />
    </Svg>
  );
}

export function VolumeIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M2 6h3l3-3v10L5 10H2z" fill="#c0c0c0" stroke="#000" />
      <path d="M10 5c2 1.5 2 5.5 0 7" stroke="#000" fill="none" />
      <path d="M12 3c3 2.5 3 7.5 0 10" stroke="#000" fill="none" />
    </Svg>
  );
}

export function MailIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="1" y="3" width="14" height="10" fill="#fff" stroke="#000" />
      <path d="M1 3l7 6 7-6" fill="none" stroke="#000" />
    </Svg>
  );
}

export function ErrorIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="8" r="7" fill="#d40000" stroke="#800000" />
      <path
        d="M4.5 4.5l7 7M11.5 4.5l-7 7"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
      />
    </Svg>
  );
}

export function WarningIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M8 1l7 13H1z" fill="#ffd400" stroke="#000" />
      <rect x="7" y="6" width="2" height="4" fill="#000" />
      <rect x="7" y="11" width="2" height="2" fill="#000" />
    </Svg>
  );
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="8" r="7" fill="#0072ff" stroke="#000080" />
      <rect x="7" y="6.5" width="2" height="5" fill="#fff" />
      <rect x="7" y="3.5" width="2" height="2" fill="#fff" />
    </Svg>
  );
}

export function SuccessIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="8" r="7" fill="#00a651" stroke="#005228" />
      <path
        d="M4 8l3 3 5-6"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        shapeRendering="geometricPrecision"
      />
    </Svg>
  );
}

export function HelpIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="8" r="7" fill="#0072ff" stroke="#000080" />
      <text
        x="8"
        y="12"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="#fff"
        fontFamily="Tahoma, sans-serif"
      >
        ?
      </text>
    </Svg>
  );
}

export function DocumentIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#000" />
      <path d="M10 1v3h3" fill="#c0c0c0" stroke="#000" />
      <rect x="5" y="7" width="6" height="1" fill="#808080" />
      <rect x="5" y="9" width="6" height="1" fill="#808080" />
      <rect x="5" y="11" width="4" height="1" fill="#808080" />
    </Svg>
  );
}

export function SpotifyIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7.5" fill="#1db954" />
      <path
        d="M4 6.2c2.6-.8 5.6-.6 8 .9M4.6 8.6c2.1-.6 4.5-.4 6.5.8M5.2 11c1.7-.5 3.5-.3 5 .6"
        stroke="#000"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 1l2 4.6 5 .5-3.8 3.3 1.2 4.9L8 11.7 3.6 14.3l1.2-4.9L1 6.1l5-.5z"
        fill="#ffd400"
        stroke="#a07800"
      />
    </svg>
  );
}

export function KeyIcon({ size = 16, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="5" cy="6" r="3.5" fill="#ffd400" stroke="#000" />
      <circle cx="5" cy="6" r="1.2" fill="#fff" stroke="#000" />
      <path d="M7 8l6 6M10 12l1.5-1.5M12 14l1.5-1.5" stroke="#000" />
    </Svg>
  );
}
