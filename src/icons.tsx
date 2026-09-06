import type { ReactNode } from "react";

function S({ c, children, sw = 1.7 }: { c?: string; children: ReactNode; sw?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={c ?? "w-4 h-4"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { c?: string };

export const IcBox = ({ c }: P) => (
  <S c={c}>
    <path d="M3.5 8L12 4l8.5 4v9L12 21l-8.5-4z" />
    <path d="M3.5 8L12 12l8.5-4M12 12v9" />
    <path d="M7.75 6l8.5 4" />
  </S>
);
export const IcPillar = ({ c }: P) => (
  <S c={c}>
    <path d="M5 4.5h14M6.5 4.5v2M17.5 4.5v2M5 19.5h14M6.5 19.5v-2M17.5 19.5v-2" />
    <path d="M8.5 6.5v11M12 6.5v11M15.5 6.5v11" />
  </S>
);
export const IcShield = ({ c }: P) => (
  <S c={c}><path d="M12 2.5l7.5 2.8v5.6c0 4.6-3.2 8-7.5 10.6C7.7 18.9 4.5 15.5 4.5 10.9V5.3z" /><circle cx="12" cy="10.2" r="2.1" /><path d="M12 12.3v3.4" /></S>
);
export const IcPulse = ({ c }: P) => (
  <S c={c}><path d="M3 12h4l2.2-6.5L13 18l2.4-6H21" /></S>
);
export const IcFolder = ({ c }: P) => (
  <S c={c}><path d="M3 7.5V6a1.5 1.5 0 0 1 1.5-1.5h4L11 7h8.5A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" /><path d="M3 11h18" /></S>
);
export const IcChain = ({ c }: P) => (
  <S c={c}><path d="M9.5 14.5l5-5" /><path d="M7.5 12l-2.2 2.2a3.1 3.1 0 0 0 4.4 4.4l2.2-2.2" /><path d="M16.5 12l2.2-2.2a3.1 3.1 0 0 0-4.4-4.4L12.1 7.6" /></S>
);
export const IcKey = ({ c }: P) => (
  <S c={c}><circle cx="8" cy="15.5" r="4" /><path d="M11 12.5L20 3.5M16.5 7l2.5 2.5M13.8 9.7l2 2" /></S>
);
export const IcCheckSeal = ({ c }: P) => (
  <S c={c}><path d="M12 2.8l2 1.7 2.6-.4 1 2.4 2.4 1-.4 2.6 1.7 2-1.7 2 .4 2.6-2.4 1-1 2.4-2.6-.4-2 1.7-2-1.7-2.6.4-1-2.4-2.4-1 .4-2.6-1.7-2 1.7-2-.4-2.6 2.4-1 1-2.4 2.6.4z" /><path d="M8.8 12.1l2.2 2.2 4.2-4.6" /></S>
);
export const IcSearch = ({ c }: P) => (
  <S c={c}><circle cx="10.5" cy="10.5" r="6" /><path d="M15.2 15.2L20.5 20.5" /></S>
);
export const IcUpload = ({ c }: P) => (
  <S c={c}><path d="M12 15V4.5M7.5 8.5L12 4l4.5 4.5" /><path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3" /></S>
);
export const IcDownload = ({ c }: P) => (
  <S c={c}><path d="M12 4v10.5M7.5 10.5L12 15l4.5-4.5" /><path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3" /></S>
);
export const IcLock = ({ c }: P) => (
  <S c={c}><rect x="5" y="10.5" width="14" height="9.5" rx="1.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" /></S>
);
export const IcEye = ({ c }: P) => (
  <S c={c}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.6" /></S>
);
export const IcEyeOff = ({ c }: P) => (
  <S c={c}><path d="M4 4l16 16" /><path d="M9.9 5.2A9.4 9.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17.6 17.6 0 0 1-3.2 4M6.1 6.5A17 17 0 0 0 2.5 12S6 19 12 19c1.5 0 2.8-.4 4-1" /></S>
);
export const IcHash = ({ c }: P) => (
  <S c={c}><path d="M9.5 3.5l-2 17M16.5 3.5l-2 17M4 8.5h16.5M3.5 15.5H20" /></S>
);
export const IcClock = ({ c }: P) => (
  <S c={c}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.4 2" /></S>
);
export const IcUser = ({ c }: P) => (
  <S c={c}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" /></S>
);
export const IcUsers = ({ c }: P) => (
  <S c={c}><circle cx="9" cy="8.5" r="3.2" /><path d="M2.8 19.5c1-3.1 3.4-4.7 6.2-4.7s5.2 1.6 6.2 4.7" /><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.8 14.9c1.9.6 3.2 2.1 3.9 4.6" /></S>
);
export const IcCheck = ({ c }: P) => (
  <S c={c} sw={2.2}><path d="M4.5 12.5l5 5 10-11" /></S>
);
export const IcX = ({ c }: P) => (
  <S c={c} sw={2}><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" /></S>
);
export const IcChevR = ({ c }: P) => (
  <S c={c} sw={2}><path d="M9 5l7 7-7 7" /></S>
);
export const IcChevD = ({ c }: P) => (
  <S c={c} sw={2}><path d="M5 9l7 7 7-7" /></S>
);
export const IcFile = ({ c }: P) => (
  <S c={c}><path d="M6 3.5h8l4 4V20.5a.9.9 0 0 1-.9.9H6a.9.9 0 0 1-.9-.9V4.4a.9.9 0 0 1 .9-.9z" /><path d="M14 3.5v4h4M8.5 12h7M8.5 15.5h7M8.5 8.5H11" /></S>
);
export const IcStamp = ({ c }: P) => (
  <S c={c}><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="6" strokeDasharray="2.6 2.2" /><path d="M9 12.2l2.1 2.1 3.9-4.4" /></S>
);
export const IcAlert = ({ c }: P) => (
  <S c={c}><path d="M12 3.5L2.5 20h19z" /><path d="M12 9.5v5M12 17.4v.2" /></S>
);
export const IcCopy = ({ c }: P) => (
  <S c={c}><rect x="8.5" y="8.5" width="12" height="12" rx="1.5" /><path d="M15.5 8.5V5A1.5 1.5 0 0 0 14 3.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" /></S>
);
export const IcPlus = ({ c }: P) => (
  <S c={c} sw={2}><path d="M12 5v14M5 12h14" /></S>
);
export const IcScale = ({ c }: P) => (
  <S c={c}><path d="M12 4v16M8.5 20h7M12 4l-6 3 6-3 6 3-6-3z" /><path d="M6 7l-2.8 6.2a3 3 0 0 0 5.6 0zM18 7l-2.8 6.2a3 3 0 0 0 5.6 0z" /></S>
);
export const IcSign = ({ c }: P) => (
  <S c={c}><path d="M4 20h16M4.5 16.5c2.4 0 3-6.5 5.4-6.5 2.1 0 1 4.2 3.2 4.2 1.7 0 2.2-2.2 3.6-2.2 1.1 0 1.6 1.2 2.8 1.5" /></S>
);
export const IcGavel = ({ c }: P) => (
  <S c={c}><path d="M13.5 5.5l5 5M11 8l5 5M12.2 6.8L5 14l3 3 7.2-7.2" /><path d="M3.5 20.5H13M14.5 4.5l5 5 1-1-5-5z" /></S>
);
export const IcFinger = ({ c }: P) => (
  <S c={c}><path d="M12 4.5a7.5 7.5 0 0 0-7.5 7.5c0 2.8.5 5 1.5 7" /><path d="M19.5 12a7.5 7.5 0 0 0-4.5-6.8M12 8a4 4 0 0 0-4 4c0 2.8.4 5.4 1.3 7.5" /><path d="M16 12c0 2.9.4 5.3 1.1 7.3M12 12c0 2.7.5 5.2 1.4 7.5" /></S>
);
export const IcBell = ({ c }: P) => (
  <S c={c}><path d="M12 4a5.5 5.5 0 0 1 5.5 5.5c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5A5.5 5.5 0 0 1 12 4z" /><path d="M10 18.5a2 2 0 0 0 4 0" /></S>
);
export const IcFilter = ({ c }: P) => (
  <S c={c}><path d="M4 5.5h16l-6.2 7.2v5.1l-3.6 1.7v-6.8z" /></S>
);
export const IcUndo = ({ c }: P) => (
  <S c={c}><path d="M8 5L4 9l4 4" /><path d="M4 9h10a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6h-3" /></S>
);
export const IcCourt = ({ c }: P) => (
  <S c={c}><path d="M3 21h18M4.5 18h15M6 10.5v7M10 10.5v7M14 10.5v7M18 10.5v7M3.5 8.5L12 3.5l8.5 5z" /></S>
);
export const IcMenu = ({ c }: P) => (
  <S c={c} sw={2}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></S>
);
export const IcLogout = ({ c }: P) => (
  <S c={c}><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" /><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" /></S>
);
export const IcRefresh = ({ c }: P) => (
  <S c={c}><path d="M4.5 12a7.5 7.5 0 0 1 13-5.2L20 9.5M20 4.5v5h-5" /><path d="M19.5 12a7.5 7.5 0 0 1-13 5.2L4 14.5M4 19.5v-5h5" /></S>
);
export const IcSend = ({ c }: P) => (
  <S c={c}><path d="M20.5 3.5L3.5 10l6.5 2.5L12.5 19z" /><path d="M20.5 3.5L10 12.5" /></S>
);
export const IcCalendar = ({ c }: P) => (
  <S c={c}><rect x="4" y="5.5" width="16" height="15" rx="1.5" /><path d="M8 3.5v4M16 3.5v4M4 10.5h16" /></S>
);
export const IcInbox = ({ c }: P) => (
  <S c={c}><path d="M4 5h16v14H4z" /><path d="M4 13h4.5l1.5 2.5h4L15.5 13H20" /></S>
);
export const IcHistory = ({ c }: P) => (
  <S c={c}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.2l2.8 1.8" /><path d="M3.5 12H1.8M4.6 7l-1.4-.9" /></S>
);
export const IcPen = ({ c }: P) => (
  <S c={c}><path d="M14.5 5l4.5 4.5L8.5 20H4v-4.5z" /><path d="M12.5 7l4.5 4.5" /></S>
);
export const IcArchive = ({ c }: P) => (
  <S c={c}><rect x="3.5" y="4.5" width="17" height="4.5" rx="1" /><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" /></S>
);
export const IcScan = ({ c }: P) => (
  <S c={c}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M3.5 12h17" /></S>
);
export const IcSun = ({ c }: P) => (
  <S c={c}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" /></S>
);
export const IcMoon = ({ c }: P) => (
  <S c={c}><path d="M20 13.5A8.5 8.5 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5z" /></S>
);
export const IcTextSize = ({ c }: P) => (
  <S c={c}><path d="M4 18.5L9 5.5l5 13M5.8 14h6.4" /><path d="M14.5 18.5l3-7 3 7M15.8 16h3.4" /></S>
);
export const IcLang = ({ c }: P) => (
  <S c={c}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5S14.6 18.1 12 20.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z" /></S>
);
