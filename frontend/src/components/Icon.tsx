import type { CSSProperties } from "react";
export type IconName =
  | "arrow"
  | "check"
  | "book"
  | "upload"
  | "file"
  | "shield"
  | "heart"
  | "bulb"
  | "tree"
  | "clock"
  | "leaf"
  | "eye"
  | "flag"
  | "close"
  | "settings"
  | "user"
  | "palette"
  | "volume"
  | "mute"
  | "pause"
  | "play"
  | "refresh"
  | "download"
  | "lock"
  | "chart"
  | "brain"
  | "info"
  | "chevron"
  | "sun"
  | "moon"
  | "save"
  | "spark"
  | "layers"
  | "trophy";
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  book: (
    <>
      <path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  heart: (
    <path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 1 9 8 15 7-6 12-11 8-15Z" />
  ),
  bulb: (
    <>
      <path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7M8 17h8m-7 4h6M12 9v5" />
    </>
  ),
  tree: (
    <>
      <rect x="9" y="2" width="6" height="5" rx="1" />
      <rect x="2" y="17" width="6" height="5" rx="1" />
      <rect x="16" y="17" width="6" height="5" rx="1" />
      <path d="M12 7v5M5 17v-5h14v5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  leaf: (
    <>
      <path d="M12 21c-2-8 3-13 9-16 1 9-2 13-9 13C4 18 2 13 3 8c5 0 8 3 9 7M12 15V3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  flag: (
    <>
      <path d="M5 22V3c6-4 8 4 15 0v11c-7 4-9-4-15 0" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  settings: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c4 0 1-4 4-5h2c6-1 3-13-6-13Z" />
      <path d="M7 9h.01M11 6h.01M16 8h.01M6 14h.01" />
    </>
  ),
  volume: (
    <>
      <path d="M11 4 5 9H2v6h3l6 5ZM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="M11 4 5 9H2v6h3l6 5ZM16 9l6 6m-6 0 6-6" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  chart: <path d="M5 20V10m7 10V4m7 16v-7" />,
  brain: (
    <>
      <path d="M9 4c-4-2-7 3-5 6-4 4 0 8 3 8 1 5 5 3 5 0V6c0-3-3-4-3-2Zm6 0c4-2 7 3 5 6 4 4 0 8-3 8-1 5-5 3-5 0M7 9l2 3-2 3m10-6-2 3 2 3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.1" />
    </>
  ),
  chevron: <path d="m8 5 7 7-7 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  save: (
    <>
      <path d="M5 3h14v18l-7-5-7 5Z" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 6-10 6L2 8Zm-10 11 10 6 10-6M2 18l10 6 10-6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3c0 4 4 4 4 4m10-7h4v3c0 4-4 4-4 4M12 15v6m-5 0h10" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
