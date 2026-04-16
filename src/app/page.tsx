import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarClock, CreditCard, Download, Settings, Users, Wrench } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { StatCard } from '@/components/ui/stat-card';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils';

const quickActions = [
  { label: 'New job', href: '/jobs', hint: 'Create a new field job' },
  { label: 'New appointment', href: '/appointments', hint: 'Plan work at a specific time' },
  { label: 'Add customer', href: '/customers', hint: 'Save a customer record' },
  { label: 'Record payment', href: '/payments', hint: 'Save a follow-up payment' },
] as const;

const managementLinks = [
  { label: 'Appointments', href: '/appointments', icon: CalendarClock, hint: 'Availability, blocked time, and customer booking link' },
  { label: 'People', href: '/people', icon: Users, hint: 'Customers and vehicles together' },
  { label: 'Settings', href: '/settings', icon: Settings, hint: 'Business defaults and policies' },
  { label: 'Install', href: '/install', icon: Download, hint: 'How to add the app on iPhone and Android' },
] as const;

type RecentJob = {
  id: string;
  title: string | null;
  status: string;
  balance_amount: number;
  next_step: string | null;
  scheduled_for: string | null;
  customer: { full_name: string; phone: string } | null;
  vehicle: { year: number; make: string; model: string } | null;
};

type RecentPayment = {
  id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
  job: {
    id: string;
    title: string | null;
    customer: { full_name: string } | null;
    vehicle: { year: number; make: string; model: string } | null;
  } | null;
};

function describeVehicle(year?: number, make?: string, model?: string) {
  if (!year || !make || !model) return 'Vehicle not linked';
  return `${year} ${make} ${model}`;
}

function describeJob(job: RecentJob) {
  if (job.title?.trim()) return job.title;
  if (job.vehicle) return describeVehicle(job.vehicle.year, job.vehicle.make, job.vehicle.model);
  return 'Untitled job';
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function getHomeData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileResult, customersCountResult, vehiclesCountResult, appointmentsCountResult, paymentsResult, jobsSummaryResult, jobsResult, recentPaymentsResult] =
    await Promise.all([
      supabase.from('profiles').select('business_name, service_area').eq('id', user.id).maybeSingle(),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['requested', 'confirmed']),
      supabase.from('payments').select('amount').eq('user_id', user.id),
      supabase.from('jobs').select('status, balance_amount').eq('user_id', user.id),
      supabase
        .from('jobs')
        .select(
          `
            id,
            title,
            status,
            balance_amount,
            next_step,
            scheduled_for,
            customer:customers!jobs_customer_id_fkey(full_name, phone),
            vehicle:vehicles!jobs_vehicle_id_fkey(year, make, model)
          `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('payments')
        .select(
          `
            id,
            amount,
            payment_method,
            paid_at,
            job:jobs!payments_job_id_fkey(
              id,
              title,
              customer:customers!jobs_customer_id_fkey(full_name),
              vehicle:vehicles!jobs_vehicle_id_fkey(year, make, model)
            )
          `,
        )
        .eq('user_id', user.id)
        .order('paid_at', { ascending: false })
        .limit(5),
    ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (customersCountResult.error) throw new Error(customersCountResult.error.message);
  if (vehiclesCountResult.error) throw new Error(vehiclesCountResult.error.message);
  if (appointmentsCountResult.error) throw new Error(appointmentsCountResult.error.message);
  if (paymentsResult.error) throw new Error(paymentsResult.error.message);
  if (jobsSummaryResult.error) throw new Error(jobsSummaryResult.error.message);
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (recentPaymentsResult.error) throw new Error(recentPaymentsResult.error.message);

  const collected = (paymentsResult.data ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const jobSummaries = jobsSummaryResult.data ?? [];
  const recentJobs = (jobsResult.data ?? []) as RecentJob[];
  const stillOwed = jobSummaries.reduce((sum, job) => sum + Number(job.balance_amount || 0), 0);
  const activeJobCount = jobSummaries.filter((job) => job.status !== 'completed').length;

  return {
    businessName: profileResult.data?.business_name ?? 'Rapid Wrench',
    serviceArea: profileResult.data?.service_area ?? null,
    collected,
    stillOwed,
    activeJobCount,
    customerCount: customersCountResult.count ?? 0,
    vehicleCount: vehiclesCountResult.count ?? 0,
    appointmentCount: appointmentsCountResult.count ?? 0,
    recentJobs,
    recentPayments: (recentPaymentsResult.data ?? []) as RecentPayment[],
  };
}

export default async function HomePage() {
  const { businessName, serviceArea, collected, stillOwed, activeJobCount, customerCount, vehicleCount, appointmentCount, recentJobs, recentPayments } =
    await getHomeData();

  return (
    <AppShell title="Field App" description={`${businessName}${serviceArea ? ` • ${serviceArea}` : ''}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={CreditCard} label="Collected" value={formatMoney(collected)} hint="All recorded payments" />
        <StatCard icon={CalendarClock} label="Still owed" value={formatMoney(stillOwed)} hint="Open balances across jobs" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Active jobs</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{activeJobCount}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Customers</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{customerCount}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Vehicles</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{vehicleCount}</p>
        </Card>
        <Card className="p-3.5 col-span-3 sm:col-span-1">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Appointments</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{appointmentCount}</p>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Quick actions" description="Jump straight into the most common field tasks." />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100 active:scale-[0.99]"
            >
              <p className="text-sm font-semibold text-slate-900">{action.label}</p>
              <p className="mt-1 text-xs text-slate-500">{action.hint}</p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {managementLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:bg-slate-50 active:scale-[0.99]">
              <div className="mb-3 inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 text-slate-400" />
              </div>
            </Link>
          );
        })}
      </div>

      <Card>
        <SectionTitle
          title="Recent jobs"
          description="See status, balance, and next steps without opening each record."
          action={<Link href="/jobs" className="text-sm font-medium text-slate-900">All jobs</Link>}
        />
      </Card>

      {recentJobs.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No jobs saved yet.</p>
        </Card>
      ) : (
        recentJobs.map((job) => (
          <Card key={job.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{describeJob(job)}</h3>
                <p className="mt-1 text-sm text-slate-600">{job.customer?.full_name ?? 'Unknown customer'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">{job.status}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span className="font-medium">Balance:</span> {formatMoney(job.balance_amount)}
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span className="font-medium">Scheduled:</span> {formatDateTime(job.scheduled_for)}
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium">Next step:</span> {job.next_step || 'No next step saved'}
            </div>
          </Card>
        ))
      )}

      <Card>
        <SectionTitle
          title="Recent payments"
          description="Last recorded payments across all jobs."
          action={<Link href="/payments" className="text-sm font-medium text-slate-900">All payments</Link>}
        />
        <div className="mt-4 space-y-3">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-slate-600">No payments recorded yet.</p>
          ) : (
            recentPayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(payment.amount)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {payment.job?.customer?.full_name ?? 'Unknown customer'} •{' '}
                      {payment.job?.vehicle
                        ? describeVehicle(payment.job.vehicle.year, payment.job.vehicle.make, payment.job.vehicle.model)
                        : 'Vehicle not linked'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-slate-600 shadow-sm">
                    {payment.payment_method}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Paid {formatDateTime(payment.paid_at)}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </AppShell>
  );
}
