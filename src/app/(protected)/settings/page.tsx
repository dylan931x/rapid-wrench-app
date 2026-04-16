import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { updateBusinessSettings, updateProfileSettings } from '@/lib/actions/settings';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
    />
  );
}

async function getSettingsPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      profile: null,
      settings: null,
    };
  }

  const [profileResult, settingsResult] = await Promise.all([
    supabase.from('profiles').select('business_name, owner_name, phone, email, service_area').eq('id', user.id).maybeSingle(),
    supabase
      .from('business_settings')
      .select('default_warranty_text, default_policy_text, invoice_footer_text, require_deposit')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (settingsResult.error) throw new Error(settingsResult.error.message);

  return {
    profile: profileResult.data,
    settings: settingsResult.data,
  };
}

export default async function SettingsPage() {
  const { profile, settings } = await getSettingsPageData();

  return (
    <AppShell title="Settings" description="Business info, warranty defaults, paperwork policies, and deposit behavior.">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Business profile</h2>
            <p className="mt-1 text-sm text-slate-600">These values feed the home dashboard and your paperwork flow.</p>
          </div>
        </div>

        <form action={updateProfileSettings} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name">
              <Input name="business_name" defaultValue={profile?.business_name ?? 'Rapid Wrench'} required />
            </Field>
            <Field label="Owner name">
              <Input name="owner_name" defaultValue={profile?.owner_name ?? ''} placeholder="Dylan Hughes" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business phone">
              <Input name="phone" defaultValue={profile?.phone ?? ''} placeholder="931-300-3043" />
            </Field>
            <Field label="Business email">
              <Input name="email" type="email" defaultValue={profile?.email ?? ''} placeholder="you@example.com" />
            </Field>
          </div>

          <Field label="Service area">
            <Input name="service_area" defaultValue={profile?.service_area ?? ''} placeholder="Lawrence County, TN and surrounding areas" />
          </Field>

          <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
            Save business profile
          </button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Paperwork defaults</h2>
            <p className="mt-1 text-sm text-slate-600">These settings are used as defaults when new jobs and documents are created.</p>
          </div>
        </div>

        <form action={updateBusinessSettings} className="grid gap-3">
          <Field label="Default warranty text">
            <Input name="default_warranty_text" defaultValue={settings?.default_warranty_text ?? '2 years workmanship'} required />
          </Field>

          <Field label="Default policy text">
            <Textarea
              name="default_policy_text"
              defaultValue={
                settings?.default_policy_text ??
                '1. A deposit may be required before parts are ordered.\n2. Final price may change if additional problems are found during diagnosis or repair.\n3. Customer-supplied parts are not covered unless otherwise stated.\n4. Workmanship warranty applies to labor performed by Rapid Wrench only.\n5. Payment is due at completion unless a written payment plan is agreed to.'
              }
              required
            />
          </Field>

          <Field label="Invoice footer text">
            <Textarea name="invoice_footer_text" defaultValue={settings?.invoice_footer_text ?? ''} placeholder="Thank you for choosing Rapid Wrench." />
          </Field>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="require_deposit" defaultChecked={settings?.require_deposit ?? false} className="h-4 w-4 rounded border-slate-300" />
            Require a deposit by default before parts are ordered
          </label>

          <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
            Save paperwork defaults
          </button>
        </form>
      </Card>
    </AppShell>
  );
}
