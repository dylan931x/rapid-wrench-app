import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/forms';
import { createClient } from '@/lib/supabase/server';
import { signInAction, signUpAction } from '@/lib/actions/auth';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:max-w-lg">
      <div className="w-full space-y-4">
        <div className="overflow-hidden rounded-[32px] bg-slate-900 text-white shadow-[0_18px_48px_rgba(15,23,42,0.24)]">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.28),transparent_40%)] p-6">
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
              Rapid Wrench
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Field app access</h1>
            <p className="mt-2 text-sm text-slate-300">
              Sign in to open your protected mobile mechanic workspace, or create the owner account for a new setup.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <Wrench className="h-4 w-4 text-slate-100" />
                <p className="mt-2 text-sm font-medium">Jobs, payments, docs</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4 text-slate-100" />
                <p className="mt-2 text-sm font-medium">Private, signed-in access</p>
              </div>
            </div>
          </div>
        </div>

        {params.error ? (
          <Card className="border-red-200 bg-red-50 text-red-700">
            <p className="text-sm font-medium">{params.error}</p>
          </Card>
        ) : null}

        {params.message ? (
          <Card className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <p className="text-sm font-medium">{params.message}</p>
          </Card>
        ) : null}

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Use your existing Rapid Wrench account to open the app.</p>

          <form className="mt-5 grid gap-3" action={signInAction}>
            <Input type="email" name="email" placeholder="Email" required />
            <Input type="password" name="password" placeholder="Password" required />
            <Button type="submit" size="lg" fullWidth>
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Create owner account</h2>
          <p className="mt-1 text-sm text-slate-600">Set up the business owner login for this workspace.</p>

          <form className="mt-5 grid gap-3" action={signUpAction}>
            <Input type="text" name="owner_name" placeholder="Owner name" />
            <Input type="text" name="business_name" placeholder="Business name" defaultValue="Rapid Wrench" />
            <Input type="email" name="email" placeholder="Email" required />
            <Input type="password" name="password" placeholder="Password" minLength={6} required />
            <Button type="submit" variant="secondary" size="lg" fullWidth>
              Create account
            </Button>
          </form>
        </Card>

        <div className="text-center text-sm text-slate-600">
          <Link className="font-medium text-slate-900" href="https://supabase.com/docs/guides/auth/quickstarts/nextjs">
            Supabase auth setup guide
          </Link>
        </div>
      </div>
    </div>
  );
}
