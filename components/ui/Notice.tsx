"use client";

import { useSim } from "@/lib/store";
import { cx, panel } from "./styles";

/** Kurzer Hinweis (Toast), z. B. nach „Automatisch packen“. Blendet sich per CSS-Animation aus. */
export function Notice() {
  const notice = useSim((s) => s.notice);
  if (!notice) return null;
  return (
    <div
      key={notice.nonce}
      role="status"
      className={cx(panel, "animate-toast rounded-full px-4 py-2 text-[13px] font-medium text-neutral-800 dark:text-neutral-100")}
    >
      {notice.text}
    </div>
  );
}
