import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";
import { SidebarNav, MobileNav } from "@/components/AppNav";
import { logoutAction } from "@/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single auth gate for every page nested under (app).
  const user = await requireUser();

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center px-6">
          <Link href="/dashboard">
            <Wordmark />
          </Link>
        </div>
        <div className="flex-1 px-4">
          <SidebarNav />
        </div>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate px-1 text-xs text-slate-500">Signed in as</p>
          <p className="truncate px-1 text-sm font-medium text-slate-800">
            {user.name || user.email}
          </p>
          <form action={logoutAction} className="mt-2">
            <button className="btn-ghost w-full justify-start px-1 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col md:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
          <Link href="/dashboard">
            <Wordmark />
          </Link>
          <form action={logoutAction}>
            <button className="btn-ghost px-2 py-1 text-sm">Sign out</button>
          </form>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
