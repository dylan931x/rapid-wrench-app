import Link from 'next/link';
import { SignalZero, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:max-w-lg">
      <div className="w-full space-y-4">
        <div className="overflow-hidden rounded-[32px] bg-slate-900 text-white shadow-[0_18px_48px_rgba(15,23,42,0.24)]">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.28),transparent_40%)] p-6">
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
              Rapid Wrench
            </div>
            <div className="mt-4 inline-flex rounded-2xl bg-white/10 p-3 text-slate-100">
              <SignalZero className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">No signal right now</h1>
            <p className="mt-2 text-sm text-slate-300">
              This page is available offline. When your connection comes back, uploads, new records, and live sync will work again.
            </p>
          </div>
        </div>

        <Card>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">What still works</h2>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                <li>• Opening pages the app has already cached</li>
                <li>• Reviewing saved paperwork and recent screens</li>
                <li>• Getting back to the login or home shell once cached</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              Try home again
            </Link>
            <Link href="/login" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
              Open login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
