import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { MobileNav } from './mobile-nav';

type AppShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-3 pb-24 pt-4 sm:max-w-lg md:max-w-xl">
      <header className="mb-4 overflow-hidden rounded-[30px] bg-slate-900 text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)]">
        <div className="bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.25),transparent_38%)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                Rapid Wrench
              </div>
              <h1 className="mt-3 text-[1.7rem] font-bold leading-tight">{title}</h1>
              {description ? <p className="mt-2 max-w-[26rem] text-sm text-slate-300">{description}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="rounded-2xl bg-white/10 p-3 text-slate-200 transition hover:bg-white/15 active:scale-[0.98]"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <form action={signOutAction}>
                <button
                  className="rounded-2xl bg-white/10 p-3 text-slate-200 transition hover:bg-white/15 active:scale-[0.98]"
                  aria-label="Sign out"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-4">{children}</main>

      <MobileNav />
    </div>
  );
}
