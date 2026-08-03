import Link from "next/link";

import { InitiativeDetail } from "@/components/initiatives/InitiativeDetail";

export function InitiativeDrawer(
  props: Parameters<typeof InitiativeDetail>[0] & {
    fullPageHref: string;
  },
) {
  const { fullPageHref, ...detailProps } = props;
  return (
    <div
      aria-label="Initiative details"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-[var(--color-ocean)]/20"
      role="dialog"
    >
      <aside
        className="h-full w-full max-w-[560px] overflow-y-auto bg-white shadow-[-20px_0_60px_rgba(6,47,51,0.16)]"
        data-testid="initiative-drawer"
      >
        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-black/10 bg-white/95 px-6 backdrop-blur">
          <Link
            className="grid min-h-10 place-items-center text-sm font-semibold text-[var(--color-ocean)]"
            href={detailProps.backHref ?? "/timeline"}
          >
            ← Close
          </Link>
          <Link
            className="grid min-h-10 place-items-center rounded-full bg-[var(--color-ocean)] px-5 text-xs font-semibold text-white"
            href={fullPageHref}
          >
            Open full page ↗
          </Link>
        </div>
        <InitiativeDetail {...detailProps} mode="drawer" />
      </aside>
    </div>
  );
}
