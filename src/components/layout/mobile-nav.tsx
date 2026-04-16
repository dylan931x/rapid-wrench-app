'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { CalendarClock, Car, ClipboardList, CreditCard, FileText, Search, Wrench } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: ClipboardList },
  { href: '/jobs', label: 'Jobs', icon: Wrench },
  { href: '/appointments', label: 'Appt', icon: CalendarClock },
  { href: '/payments', label: 'Pay', icon: CreditCard },
  { href: '/diagnostics', label: 'Diag', icon: Search },
  { href: '/vehicles', label: 'Cars', icon: Car },
  { href: '/docs', label: 'Docs', icon: FileText },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.25rem)]">
      <div className="mx-auto grid max-w-md grid-cols-7 gap-1 px-2 py-2 text-[10px] sm:max-w-lg md:max-w-xl">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === href : pathname?.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'rounded-2xl px-1 py-3 text-center transition active:scale-[0.98]',
                isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              <Icon className="mx-auto h-5 w-5" />
              <p className="mt-1 text-[11px] font-medium">{label}</p>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
