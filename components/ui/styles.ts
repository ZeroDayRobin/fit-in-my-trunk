export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export const panel =
  "rounded-3xl border border-black/[0.06] bg-white/80 shadow-[0_12px_40px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl " +
  "dark:border-white/10 dark:bg-neutral-900/75 dark:shadow-black/50";

export const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400";
