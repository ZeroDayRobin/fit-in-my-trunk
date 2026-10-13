import type { SVGProps } from "react";
import type { BodyType } from "@/lib/cars";
import type { LuggageType } from "@/lib/luggage";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const IconRotate = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 1 0-2.34 5.66" />
    <path d="M20 4v7h-7" />
  </svg>
);

export const IconTip = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="12" width="13" height="8" rx="1.5" />
    <path d="M14 4a6 6 0 0 1 6 6" />
    <path d="M20 6v4h-4" />
  </svg>
);

export const IconTipSide = (p: P) => (
  <svg {...base(p)}>
    <rect x="8" y="10" width="8" height="11" rx="1.5" />
    <path d="M4 9a8 8 0 0 1 9-6" />
    <path d="M4 5v4h4" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

export const IconSparkle = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);

export const IconReset = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.34-5.66" />
    <path d="M4 4v5h5" />
  </svg>
);

export const IconXray = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconSun = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconMoon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);

export const IconSeat = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4v9a2 2 0 0 0 2 2h8" />
    <path d="M7 15l-1 5M17 15v5M10 15l1 5" />
  </svg>
);

export function CarSilhouette({ style, className }: { style: BodyType; className?: string }) {
  const shapes: Record<BodyType, { body: string; wheels: [number, number]; r: number }> = {
    hatchback: {
      body: "M8 34 C8 28.5 10.5 26.5 17 25.5 L31 23.5 L44 14 C47 12 50 11 54 11 L82 11 C86 11 88.5 12 90.5 15 L101 24.5 C108 25.5 112 27.5 112 31.5 L112 34 Z",
      wheels: [31, 91],
      r: 6.5,
    },
    wagon: {
      body: "M4 34 C4 28.5 6.5 26.5 13 25.5 L27 23.5 L40 14 C43 12 46 11 50 11 L106 11 C109 11 111 12.5 112 15.5 L114 25 L115 34 Z",
      wheels: [27, 97],
      r: 6.5,
    },
    suv: {
      body: "M7 34 C7 26.5 9.5 24 16 23 L28 21 L40 9.5 C43 7.5 46 6.5 50 6.5 L98 6.5 C101 6.5 103 8 104.5 11 L110 21 C113 22 114 25 114 30 L114 34 Z",
      wheels: [30, 92],
      r: 7.5,
    },
    "suv-coupe": {
      body: "M7 34 C7 26.5 9.5 24 16 23 L28 21 L40 9.5 C43 7.5 46 6.5 50 6.5 L84 6.5 C90 6.5 96 10 104 17 L110 21.5 C113 22.5 114 25 114 30 L114 34 Z",
      wheels: [30, 92],
      r: 7.5,
    },
    sedan: {
      body: "M6 34 C6 28.5 8.5 26.5 15 25.5 L29 23.5 L42 13 C45 11 48 10 52 10 L76 10 C80 10 83 11.5 86 14 L96 22 L110 23.5 C113 24 114 27 114 30 L114 34 Z",
      wheels: [29, 93],
      r: 6.5,
    },
    coupe: {
      body: "M6 34 C6 29 8.5 27 15 26 L32 24 L46 15 C50 13 54 12.5 58 12.5 L74 12.5 C80 12.5 86 15 92 19.5 L108 23.5 C112 24.5 114 27 114 30.5 L114 34 Z",
      wheels: [29, 93],
      r: 6.5,
    },
    convertible: {
      body: "M6 34 C6 29 8.5 27 15 26 L34 24 L44 17 L46 17 L46 21 L88 21 C92 21 96 22 100 23 L108 24 C112 25 114 27.5 114 30.5 L114 34 Z",
      wheels: [29, 93],
      r: 6.5,
    },
    van: {
      body: "M6 34 L6 22 C6 18 8 16 12 14 L26 6 C28 5 30 4.5 33 4.5 L108 4.5 C111 4.5 113 6 113 9 L114 34 Z",
      wheels: [27, 95],
      r: 7,
    },
  };
  const s = shapes[style];
  return (
    <svg viewBox="0 0 120 44" className={className} aria-hidden>
      <path d={s.body} fill="currentColor" opacity={0.9} />
      {s.wheels.map((x) => (
        <g key={x}>
          <circle cx={x} cy={34} r={s.r + 1.6} className="fill-white dark:fill-neutral-900" />
          <circle cx={x} cy={34} r={s.r} fill="currentColor" />
          <circle cx={x} cy={34} r={s.r * 0.45} className="fill-white/70 dark:fill-neutral-900/70" />
        </g>
      ))}
    </svg>
  );
}

export function LuggageGlyph({ type, color }: { type: LuggageType; color: string }) {
  if (type === "small") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <path d="M13 6.5a3 3 0 0 1 6 0" stroke={color} strokeWidth="2" fill="none" />
        <rect x="8" y="7" width="16" height="21" rx="6" fill={color} />
        <rect x="11" y="17" width="10" height="8" rx="3" fill="#000" opacity="0.18" />
      </svg>
    );
  }
  const tall = type === "large";
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <path d={tall ? "M13 4h6v3" : "M13 7h6v3"} stroke="#334155" strokeWidth="1.8" fill="none" />
      <rect x={tall ? 8 : 9} y={tall ? 7 : 10} width={tall ? 16 : 14} height={tall ? 20 : 17} rx="3" fill={color} />
      {(tall ? [12, 16, 20] : [13, 19]).map((x) => (
        <rect key={x} x={x - 0.6} y={tall ? 9.5 : 12.5} width="1.2" height={tall ? 15 : 12} rx="0.6" fill="#000" opacity="0.15" />
      ))}
      <circle cx={tall ? 11 : 12} cy="29" r="1.6" fill="#334155" />
      <circle cx={tall ? 21 : 20} cy="29" r="1.6" fill="#334155" />
    </svg>
  );
}
