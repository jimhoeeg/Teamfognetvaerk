const PATHS = {
  ball: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8" /></>,
  ticket: <path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  pulse: <path d="M2 12h4l3-8 6 16 3-8h4" />,
  dunk: <><circle cx="12" cy="9" r="6" /><path d="M8 21h8M12 15v6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  back: <path d="M15 18l-6-6 6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12l5 5L20 7" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  scan: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><path d="M4 12h16" /></>,
  share: <><path d="M4 12v8h16v-8" /><path d="M12 3v13M7 8l5-5 5 5" /></>,
  arrow: <path d="M4 12h14M12 6l6 6-6 6" />,
  parking: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></>,
  food: <><path d="M6 2v8a3 3 0 0 0 6 0V2" /><path d="M9 10v12" /><path d="M17 2c-2 2-2 6 0 8v12" /></>,
  map: <><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" /><path d="M9 3v15M15 6v15" /></>,
  access: <><circle cx="12" cy="4" r="2" /><path d="M12 7v6h5l2 6" /><path d="M9 11a6 6 0 1 0 6 8" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  gift: <><rect x="3" y="8" width="18" height="13" /><path d="M3 12h18M12 8v13M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  lock: <><rect x="5" y="11" width="14" height="10" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  )
}

/** Banestreger som baggrundsmotiv. */
export function CourtLines({ size = 260, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" className="court-lines" width={size} height={size} viewBox="0 0 260 260" style={style}>
      <circle cx="130" cy="130" r="120" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="130" cy="130" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="0" y1="130" x2="260" y2="130" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
