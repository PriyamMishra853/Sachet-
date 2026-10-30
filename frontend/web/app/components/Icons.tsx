// Simple line icons drawn in the current text colour, used instead of emoji
// so the site looks the same on every phone.
import type { ReactNode } from "react";

function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** The Sachet mark: a shield with an alert line. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M16 2.5 4.5 7v8.2c0 7 4.9 12.3 11.5 14.3 6.6-2 11.5-7.3 11.5-14.3V7L16 2.5Z"
        fill="var(--brand)"
      />
      <path d="M16 9v8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="22" r="1.9" fill="#fff" />
    </svg>
  );
}

export const AlertTriangle = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);

export const AlertCircle = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </Svg>
);

export const Info = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
);

export const Phone = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
  </Svg>
);

export const Check = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const Flag = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4 22V4M4 4h13l-2 4 2 4H4" />
  </Svg>
);
