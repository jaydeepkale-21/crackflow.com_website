import React, { ReactNode } from "react";

export type DashboardIconName =
  | "home"
  | "file"
  | "card"
  | "play"
  | "user"
  | "help"
  | "menu"
  | "close"
  | "chevron"
  | "download"
  | "shield"
  | "mic"
  | "check"
  | "upload"
  | "trash"
  | "replace"
  | "arrow"
  | "clock"
  | "camera"
  | "spark"
  | "lock"
  | "mail"
  | "alert"
  | "external"
  | "palette"
  | "windows"
  | "spinner"
  | "calendar"
  | "eye"
  | "copy"
  | "star";

interface IconProps {
  name: DashboardIconName;
  size?: number;
  className?: string;
}

export function DashboardIcon({ name, size = 20, className = "" }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  const paths: Record<DashboardIconName, ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 13h6M9 17h6" />
      </>
    ),
    card: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="M2.5 10h19M7 15h3" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21c.6-4.2 3-6 7-6s6.4 1.8 7 6" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.7 9a2.4 2.4 0 1 1 3.7 2c-1 .6-1.4 1.1-1.4 2M12 17h.01" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 7 5 5-5 5" />,
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    upload: (
      <>
        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
      </>
    ),
    replace: (
      <>
        <path d="M20 7h-5V2M4 17h5v5" />
        <path d="M18.6 11A7 7 0 0 0 6.5 6L4 9m16 6-2.5 3A7 7 0 0 1 5.4 13" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="m8 6 1.5-2h5L16 6" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9zM18 15l.7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7z" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.5 20h19z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    external: (
      <>
        <path d="M13 5h6v6M19 5l-8 8" />
        <path d="M17 13v6H5V7h6" />
      </>
    ),
    palette: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="8" cy="9" r=".6" fill="currentColor" />
        <circle cx="12" cy="7" r=".6" fill="currentColor" />
        <circle cx="16" cy="10" r=".6" fill="currentColor" />
        <path d="M15 16c0 1.2-1 2-2.3 2H12a2 2 0 0 1 0-4h1" />
      </>
    ),
    windows: (
      <>
        <path
          d="M3 5.5 10.5 4v7H3zM12 3.7 21 2v9h-9zM3 12.5h7.5v7L3 18zM12 12.5h9v9L12 20z"
          strokeWidth="1.4"
        />
      </>
    ),
    spinner: (
      <path
        d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"
        className="animate-spin origin-center"
      />
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    star: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
  };

  return <svg {...common}>{paths[name] || paths.spark}</svg>;
}

