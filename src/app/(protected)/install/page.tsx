import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { Download, ExternalLink, Globe, Smartphone } from 'lucide-react';

export default function InstallPage() {
  return (
    <AppShell title="Install app" description="Add Rapid Wrench to your iPhone or Android home screen.">
      <Card>
        <SectionTitle
          title="Best mobile path"
          description="This app is ready to be used as a Progressive Web App. After you deploy it, open the production URL on your phone and install it to the home screen."
        />
        <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">What this gives you</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Opens like an app on iPhone and Android</li>
            <li>Uses the same live Supabase data as the web version</li>
            <li>Supports the current PWA install and offline shell flow already built into this project</li>
          </ul>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="mb-3 inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
            <Smartphone className="h-4 w-4" />
          </div>
          <SectionTitle title="Install on iPhone" description="Open the deployed app in Safari, then use the Share button." />
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Open the production app URL in Safari.</li>
            <li>Tap the Share button.</li>
            <li>Tap <span className="font-medium">Add to Home Screen</span>.</li>
            <li>Tap <span className="font-medium">Add</span>.</li>
          </ol>
        </Card>

        <Card>
          <div className="mb-3 inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
            <Download className="h-4 w-4" />
          </div>
          <SectionTitle title="Install on Android" description="Open the deployed app in Chrome or another supported browser." />
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Open the production app URL in Chrome.</li>
            <li>Use the browser install prompt if shown.</li>
            <li>Or open the browser menu and tap <span className="font-medium">Install app</span> or <span className="font-medium">Add to Home Screen</span>.</li>
            <li>Confirm the install.</li>
          </ol>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Before you install" description="These items need to be finished first so the phone version actually works." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Required</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Run the Supabase migration</li>
              <li>Set your env vars</li>
              <li>Deploy the app to Vercel</li>
              <li>Set the production Auth URLs in Supabase</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Helpful links</p>
            <div className="mt-3 space-y-2">
              <Link href="/settings" className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100">
                <span>Open Settings</span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/docs" className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100">
                <span>Open Docs</span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/jobs" className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100">
                <span>Open Jobs</span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
          <Globe className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
          <div>
            <p className="font-medium text-slate-900">Native app stores are a separate step</p>
            <p className="mt-1">
              This codebase is already suited for iPhone and Android as a deployed PWA. Publishing a native App Store or Play Store wrapper is possible later, but it needs store accounts and native build tools.
            </p>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
