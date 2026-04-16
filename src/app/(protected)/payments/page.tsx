import { CreditCard, Link as LinkIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { createPayment, deletePayment, updatePayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils';
import { paymentMethodOptions } from '@/lib/validators/job';

export const dynamic = 'force-dynamic';

type JobOption = {
  id: string;
  title: string | null;
  balance_amount: number;
  customer: { full_name: string } | null;
  vehicle: { year: number; make: string; model: string } | null;
};

type PaymentRow = {
  id: string;
  job_id: string;
  amount: number;
  payment_method: (typeof paymentMethodOptions)[number];
  note: string | null;
  paid_at: string;
  created_at: string;
  job: {
    title: string | null;
    balance_amount: number;
    customer: { full_name: string } | null;
    vehicle: { year: number; make: string; model: string } | null;
  } | null;
};

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
      className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
    />
  );
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function describeJob(job: JobOption | PaymentRow['job']) {
  const title = job?.title?.trim();
  if (title) return title;
  if (job?.vehicle) return `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}`;
  return 'Untitled job';
}

function PaymentForm({
  action,
  submitLabel,
  jobs,
  payment,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  jobs: JobOption[];
  payment?: PaymentRow;
}) {
  const defaultJobId = payment?.job_id ?? jobs[0]?.id ?? '';

  return (
    <form action={action} className="grid gap-3">
      {payment ? <input type="hidden" name="id" value={payment.id} /> : null}

      <Field label="Job">
        <Select name="job_id" defaultValue={defaultJobId} required>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {describeJob(job)} • {job.customer?.full_name ?? 'Unknown customer'} • Balance {formatMoney(job.balance_amount)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payment amount">
          <Input type="number" name="amount" min="0.01" step="0.01" defaultValue={payment?.amount ?? ''} required />
        </Field>
        <Field label="Method">
          <Select name="payment_method" defaultValue={payment?.payment_method ?? 'other'}>
            {paymentMethodOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Paid at">
        <Input type="datetime-local" name="paid_at" defaultValue={formatDateTimeLocal(payment?.paid_at ?? null)} />
      </Field>

      <Field label="Note">
        <Textarea name="note" defaultValue={payment?.note ?? ''} placeholder="Partial payment, card on file, cash on arrival, etc." />
      </Field>

      <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}

async function getPaymentsPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      jobs: [] as JobOption[],
      payments: [] as PaymentRow[],
      totals: { collected: 0, stillOwed: 0, openJobs: 0 },
    };
  }

  const [jobsResult, paymentsResult] = await Promise.all([
    supabase
      .from('jobs')
      .select(
        `
          id,
          title,
          balance_amount,
          customer:customers!jobs_customer_id_fkey(full_name),
          vehicle:vehicles!jobs_vehicle_id_fkey(year, make, model)
        `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select(
        `
          id,
          job_id,
          amount,
          payment_method,
          note,
          paid_at,
          created_at,
          job:jobs!payments_job_id_fkey(
            title,
            balance_amount,
            customer:customers!jobs_customer_id_fkey(full_name),
            vehicle:vehicles!jobs_vehicle_id_fkey(year, make, model)
          )
        `,
      )
      .eq('user_id', user.id)
      .order('paid_at', { ascending: false }),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (paymentsResult.error) throw new Error(paymentsResult.error.message);

  const jobs = (jobsResult.data ?? []) as JobOption[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];

  const collected = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const stillOwed = jobs.reduce((sum, job) => sum + Number(job.balance_amount || 0), 0);
  const openJobs = jobs.filter((job) => Number(job.balance_amount || 0) > 0).length;

  return {
    jobs,
    payments,
    totals: { collected, stillOwed, openJobs },
  };
}

export default async function PaymentsPage() {
  const { jobs, payments, totals } = await getPaymentsPageData();

  return (
    <AppShell title="Payments" description="Record follow-up payments and keep balances in sync with jobs.">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-slate-500">Collected</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(totals.collected)}</p>
          <p className="mt-1 text-xs text-slate-500">All recorded payments</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Still owed</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(totals.stillOwed)}</p>
          <p className="mt-1 text-xs text-slate-500">Across current jobs</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Record payment</h2>
            <p className="mt-1 text-sm text-slate-600">Each payment writes to Supabase and job balances update from the database trigger.</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
            <p className="text-xs text-slate-500">Open balances</p>
            <p className="text-lg font-semibold text-slate-900">{totals.openJobs}</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Create at least one job before recording a payment.</div>
        ) : (
          <PaymentForm action={createPayment} submitLabel="Save payment" jobs={jobs} />
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Payment history</h2>
        <p className="mt-1 text-sm text-slate-600">Edit or delete payments here. Job balances will recalculate automatically.</p>
      </Card>

      {payments.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No payments yet. Record your first payment above.</p>
        </Card>
      ) : null}

      {payments.map((payment) => (
        <Card key={payment.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <h3 className="text-lg font-semibold text-slate-900">{formatMoney(payment.amount)}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {describeJob(payment.job)} • {payment.job?.customer?.full_name ?? 'Unknown customer'}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 capitalize">{payment.payment_method}</span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Paid: {new Date(payment.paid_at).toLocaleString()}</div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Job balance: {formatMoney(payment.job?.balance_amount ?? 0)}</div>
          </div>

          {payment.note ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{payment.note}</div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/jobs" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              <LinkIcon className="h-4 w-4" /> View jobs
            </Link>
          </div>

          <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">Edit payment</summary>
            <div className="mt-4">
              <PaymentForm action={updatePayment} submitLabel="Update payment" jobs={jobs} payment={payment} />
            </div>
          </details>

          <form action={deletePayment} className="mt-3">
            <input type="hidden" name="id" value={payment.id} />
            <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <Trash2 className="h-4 w-4" /> Delete payment
            </button>
          </form>
        </Card>
      ))}
    </AppShell>
  );
}
