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
      className="fixed inset-0 z-50 flex justify-end bg-black/25"
      role="dialog"
    >
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-[#f7f5ef] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white/95 px-6 py-3">
          <Link className="text-sm font-medium" href={detailProps.backHref ?? "/timeline"}>
            Close
          </Link>
          <a className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white" href={fullPageHref}>
            Open full page
          </a>
        </div>
        <InitiativeDetail {...detailProps} />
      </aside>
    </div>
  );
}
