"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/timeline", label: "History", match: "/timeline" },
  { href: "/analytics/x/post", label: "X Analytics", match: "/analytics" },
  { href: "/notifications", label: "Notifications", match: "/notifications" },
  { href: "/settings/notion", label: "Settings", match: "/settings" },
];

export function DashboardHeader({
  workspaceName,
  memberEmail,
}: {
  workspaceName: string;
  memberEmail: string;
}) {
  const pathname = usePathname();
  const initials = memberEmail
    .split("@", 1)[0]!
    .split(/[._-]+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto grid min-h-[72px] max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 xl:px-12">
        <Link
          className="flex min-h-10 items-center gap-3 text-sm font-semibold text-[var(--color-ocean)]"
          href="/timeline"
        >
          <span className="grid size-9 place-items-center rounded-[10px] bg-[var(--color-ocean)] font-bold text-[var(--color-signal)]">
            M
          </span>
          <span>Marketing Timeline</span>
        </Link>
        <nav aria-label="Primary" className="flex h-full items-stretch gap-8">
          {navigation.map((item) => {
            const active = pathname.startsWith(item.match);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`relative grid min-h-10 place-items-center text-sm font-medium transition ${
                  active
                    ? "text-[var(--color-ink)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--color-signal)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-end gap-3 text-sm text-[var(--color-muted)]">
          <span className="max-w-48 truncate border-l border-black/10 pl-4">
            {workspaceName}
          </span>
          <span
            aria-label={memberEmail}
            className="grid size-9 place-items-center rounded-full bg-[var(--color-fog)] font-semibold text-[var(--color-ocean)]"
            title={memberEmail}
          >
            {initials}
          </span>
        </div>
      </div>
    </header>
  );
}
