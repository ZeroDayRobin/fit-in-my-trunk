"use client";

import { luggageInfo } from "@/lib/luggage";
import { orientedSize, type ItemStatus } from "@/lib/packing";
import { useSim, useStatuses } from "@/lib/store";
import { IconRotate, IconTip, IconTipSide, IconTrash } from "./icons";
import { cx, panel } from "./styles";

const STATUS_LABEL: Record<ItemStatus, { text: string; dot: string }> = {
  packed: { text: "Passt", dot: "bg-emerald-500" },
  outside: { text: "Ragt heraus", dot: "bg-red-500" },
  collision: { text: "Kollision", dot: "bg-red-500" },
  idle: { text: "Außerhalb", dot: "bg-neutral-400" },
};

/** Aktionen für das ausgewählte Gepäckstück (auch für Touch-Geräte ohne Tastatur). */
export function SelectionBar() {
  const selected = useSim((s) => s.items.find((i) => i.id === s.selectedId));
  const rotate = useSim((s) => s.rotateSelected);
  const remove = useSim((s) => s.removeSelected);
  const statuses = useStatuses();

  if (!selected) return null;
  const spec = luggageInfo(selected.type, selected.custom);
  const [w, h, d] = orientedSize(selected, selected.quaternion).map((v) => Math.round(v * 100));
  const status = STATUS_LABEL[statuses[selected.id] ?? "idle"];

  return (
    <div className={cx(panel, "pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl p-2 sm:pl-4")}>
      <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: spec.color }} />
      <div className="mr-1 min-w-0 flex-1 basis-[160px]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-semibold text-neutral-900 dark:text-white">
          <span className="break-words [overflow-wrap:anywhere]">{spec.name}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span className={cx("h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.text}
          </span>
        </div>
        <div className="text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
          B {w} × H {h} × T {d} cm
        </div>
      </div>
      <div className="flex w-full justify-end gap-1 sm:w-auto">
      <ActionButton label="Drehen" kbd="R" onClick={() => rotate("yaw")}>
        <IconRotate className="h-4 w-4" />
      </ActionButton>
      <ActionButton label="Kippen" kbd="T" onClick={() => rotate("tip")}>
        <IconTip className="h-4 w-4" />
      </ActionButton>
      <ActionButton label="Seitlich" kbd="S" onClick={() => rotate("roll")}>
        <IconTipSide className="h-4 w-4" />
      </ActionButton>
      <ActionButton label="Löschen" kbd="Entf" onClick={remove} danger>
        <IconTrash className="h-4 w-4" />
      </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  kbd,
  onClick,
  danger,
  children,
}: {
  label: string;
  kbd: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={`${label} (${kbd})`}
      aria-label={`${label} (${kbd})`}
      className={cx(
        "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-sky-500",
        danger
          ? "text-red-600 hover:bg-red-500/10 dark:text-red-400"
          : "text-neutral-700 hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/[0.08]",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
