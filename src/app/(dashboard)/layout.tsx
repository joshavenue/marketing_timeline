import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 bg-[#f7f5ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <Link className="text-sm font-semibold tracking-tight" href="/timeline">
            Marketing Timeline
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium text-black/55">
            <Link href="/timeline">History</Link>
            <Link href="/analytics/x/post">X Analytics</Link>
            <Link href="/notifications">Notifications</Link>
            <Link href="/settings/notion">Settings</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
