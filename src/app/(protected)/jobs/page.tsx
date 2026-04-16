import Link from 'next/link';
import { Camera, CreditCard, MessageSquare, Phone, Trash2, Upload, Wrench } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { StatusBadge } from '@/components/jobs/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select, Textarea } from '@/components/ui/forms';
import { SectionTitle } from '@/components/ui/section-title';
import { deleteJobPhoto, uploadJobPhoto } from '@/lib/actions/photos';
import { createJob, deleteJob, updateJob } from '@/lib/actions/jobs';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils';
import { jobStatusOptions, paymentMethodOptions } from '@/lib/validators/job';

export const dynamic = 'force-dynamic';

type CustomerOption = {
  id: string;
  full_name: string;
  phone: string;
};

type VehicleOption = {
  id: string;
  customer_id: string;
  year: number;
  make: string;
  model: string;
};

type JobPhoto = {
  id: string;
  file_name: string;
  caption: string | null;
  created_at: string;
  signed_url: string | null;
};

type JobRow = {
  id: string;
  customer_id: string;
  vehicle_id: string;
  title: string | null;
  complaint: string;
  diagnosis_notes: string | null;
  recommended_tests: string | null;
  repair_performed: string | null;
  status: (typeof jobStatusOptions)[number];
  labor_amount: number;
  parts_amount: number;
  deposit_amount: number;
  balance_amount: number;
  next_step: string | null;
  warranty_text: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  created_at: string;
  customer: { full_name: string; phone: string; email: string | null } | null;
  vehicle: { year: number; make: string; model: string; engine: string | null } | null;
  photos: JobPhoto[];
};

function formatDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function JobForm({
  action,
  submitLabel,
  customers,
  vehicles,
  job,
  isCreate = false,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  customers: CustomerOption[];
  vehicles: VehicleOption[];
  job?: JobRow;
  isCreate?: boolean;
}) {
  return (
    <form action={action} className="grid gap-3">
      {job ? <input type="hidden" name="id" value={job.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer">
          <Select name="customer_id" defaultValue={job?.customer_id ?? customers[0]?.id} required>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vehicle">
          <Select name="vehicle_id" defaultValue={job?.vehicle_id ?? vehicles[0]?.id} required>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Job title">
        <Input name="title" defaultValue={job?.title ?? ''} placeholder="Alternator replacement" />
      </Field>

      <Field label="Complaint">
        <Textarea name="complaint" defaultValue={job?.complaint} placeholder="Battery light on and may stall intermittently" required />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select name="status" defaultValue={job?.status ?? 'new lead'}>
            {jobStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Scheduled for">
          <Input type="datetime-local" name="scheduled_for" defaultValue={formatDateTimeLocal(job?.scheduled_for ?? null)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Labor amount">
          <Input type="number" name="labor_amount" min="0" step="0.01" defaultValue={job?.labor_amount ?? 0} required />
        </Field>
        <Field label="Parts amount">
          <Input type="number" name="parts_amount" min="0" step="0.01" defaultValue={job?.parts_amount ?? 0} required />
        </Field>
      </div>

      {isCreate ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Initial deposit">
            <Input type="number" name="initial_deposit" min="0" step="0.01" defaultValue={0} />
          </Field>
          <Field label="Deposit method">
            <Select name="initial_payment_method" defaultValue="other">
              {paymentMethodOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <Field label="Diagnosis notes">
        <Textarea name="diagnosis_notes" defaultValue={job?.diagnosis_notes ?? ''} placeholder="Charging voltage low at idle. Belt and terminals inspected." />
      </Field>

      <Field label="Recommended tests">
        <Textarea name="recommended_tests" defaultValue={job?.recommended_tests ?? ''} placeholder="Voltage drop test, inspect alternator connector, verify belt tension" />
      </Field>

      <Field label="Repair performed">
        <Textarea name="repair_performed" defaultValue={job?.repair_performed ?? ''} placeholder="Replace alternator and confirm charging system output" />
      </Field>

      <Field label="Next step">
        <Textarea name="next_step" defaultValue={job?.next_step ?? ''} placeholder="Order parts, collect remaining balance, schedule follow-up" />
      </Field>

      <Field label="Warranty text">
        <Input name="warranty_text" defaultValue={job?.warranty_text ?? ''} placeholder="2 years workmanship" />
      </Field>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

function JobQuickActions({ job }: { job: JobRow }) {
  if (!job.customer?.phone) return null;

  const smsMessage = `Hi ${job.customer.full_name}, this is Rapid Wrench. Update on your ${job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'vehicle'}: ${job.next_step || job.status}. Current balance: ${formatMoney(job.balance_amount)}.`;

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${job.customer.phone}`} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
        <Phone className="h-4 w-4" /> Call
      </a>
      <a href={`sms:${job.customer.phone}?body=${encodeURIComponent(smsMessage)}`} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
        <MessageSquare className="h-4 w-4" /> Text update
      </a>
      <Link href="/payments" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
        <CreditCard className="h-4 w-4" /> Record payment
      </Link>
    </div>
  );
}

function JobPhotoSection({ job }: { job: JobRow }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-medium text-slate-900">Job photos</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">{job.photos.length} saved</span>
      </div>

      <form action={uploadJobPhoto} className="grid gap-3 sm:grid-cols-[1fr,1fr,auto]" encType="multipart/form-data">
        <input type="hidden" name="job_id" value={job.id} />
        <Input type="file" name="photo" accept="image/*" required className="cursor-pointer file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white" />
        <Input name="caption" placeholder="Caption (optional)" />
        <Button type="submit">
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </form>

      {job.photos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No photos uploaded yet for this job.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {job.photos.map((photo) => (
            <div key={photo.id} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              {photo.signed_url ? (
                <img src={photo.signed_url} alt={photo.caption ?? photo.file_name} className="h-28 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">Preview unavailable</div>
              )}
              <p className="mt-2 truncate text-xs font-medium text-slate-700">{photo.file_name}</p>
              {photo.caption ? <p className="mt-1 text-xs text-slate-500">{photo.caption}</p> : null}
              <form action={deleteJobPhoto} className="mt-2">
                <input type="hidden" name="id" value={photo.id} />
                <Button type="submit" variant="danger" className="rounded-xl px-3 py-2 text-xs">
                  <Trash2 className="h-3.5 w-3.5" /> Delete photo
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function getJobsPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { customers: [] as CustomerOption[], vehicles: [] as VehicleOption[], jobs: [] as JobRow[] };
  }

  const [customersResult, vehiclesResult, jobsResult, photosResult] = await Promise.all([
    supabase.from('customers').select('id, full_name, phone').eq('user_id', user.id).order('full_name'),
    supabase.from('vehicles').select('id, customer_id, year, make, model').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select(
        `
          id,
          customer_id,
          vehicle_id,
          title,
          complaint,
          diagnosis_notes,
          recommended_tests,
          repair_performed,
          status,
          labor_amount,
          parts_amount,
          deposit_amount,
          balance_amount,
          next_step,
          warranty_text,
          scheduled_for,
          completed_at,
          created_at,
          customer:customers!jobs_customer_id_fkey(full_name, phone, email),
          vehicle:vehicles!jobs_vehicle_id_fkey(year, make, model, engine)
        `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('job_photos').select('id, job_id, file_name, caption, created_at, storage_path').eq('user_id', user.id).order('created_at', { ascending: false }),
  ]);

  if (customersResult.error) throw new Error(customersResult.error.message);
  if (vehiclesResult.error) throw new Error(vehiclesResult.error.message);
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (photosResult.error) throw new Error(photosResult.error.message);

  const photoRows = photosResult.data ?? [];
  const signedUrls = await Promise.all(
    photoRows.map(async (photo) => {
      const { data } = await supabase.storage.from('job-photos').createSignedUrl(photo.storage_path, 60 * 60);
      return {
        id: photo.id,
        job_id: photo.job_id,
        file_name: photo.file_name,
        caption: photo.caption,
        created_at: photo.created_at,
        signed_url: data?.signedUrl ?? null,
      };
    }),
  );

  const photosByJobId = new Map<string, JobPhoto[]>();
  for (const photo of signedUrls) {
    const existing = photosByJobId.get(photo.job_id) ?? [];
    existing.push({ id: photo.id, file_name: photo.file_name, caption: photo.caption, created_at: photo.created_at, signed_url: photo.signed_url });
    photosByJobId.set(photo.job_id, existing);
  }

  const jobs = ((jobsResult.data ?? []) as Omit<JobRow, 'photos'>[]).map((job) => ({ ...job, photos: photosByJobId.get(job.id) ?? [] }));

  return {
    customers: (customersResult.data ?? []) satisfies CustomerOption[],
    vehicles: (vehiclesResult.data ?? []) satisfies VehicleOption[],
    jobs,
  };
}

export default async function JobsPage() {
  const { customers, vehicles, jobs } = await getJobsPageData();

  return (
    <AppShell title="Jobs" description="Create jobs, track balances, and save inspection photos from the field.">
      <Card>
        <SectionTitle
          title="Create job"
          description="Tie the work order to a customer, a vehicle, and the opening payment if needed."
          action={
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Saved</p>
              <p className="text-lg font-semibold text-slate-950">{jobs.length}</p>
            </div>
          }
        />

        <div className="mt-4">
          {customers.length === 0 || vehicles.length === 0 ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Add at least one customer and one vehicle before creating a job.</div>
          ) : (
            <JobForm action={createJob} submitLabel="Save job" customers={customers} vehicles={vehicles} isCreate />
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Job list" description="Edit the repair, record the next step, collect payments, or add photos without leaving the page." />
      </Card>

      {jobs.length === 0 ? <EmptyState title="No jobs yet" description="Add your first job above to start tracking work, deposits, photos, and paperwork." /> : null}

      {jobs.map((job) => (
        <Card key={job.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{job.title?.trim() || (job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'Untitled job')}</h3>
              <p className="mt-1 text-sm text-slate-600">{job.customer?.full_name ?? 'Unknown customer'}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><span className="font-medium">Complaint:</span> {job.complaint}</div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><span className="font-medium">Vehicle:</span> {job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'Unknown vehicle'}</div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><span className="font-medium">Total:</span> {formatMoney(Number(job.labor_amount) + Number(job.parts_amount))}</div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><span className="font-medium">Balance:</span> {formatMoney(job.balance_amount)}</div>
          </div>

          {job.next_step ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"><span className="font-medium">Next step:</span> {job.next_step}</div>
          ) : null}

          <div className="mt-3">
            <JobQuickActions job={job} />
          </div>

          <JobPhotoSection job={job} />

          <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-800">Edit job</summary>
            <div className="mt-4">
              <JobForm action={updateJob} submitLabel="Update job" customers={customers} vehicles={vehicles} job={job} />
            </div>
          </details>

          <form action={deleteJob} className="mt-3">
            <input type="hidden" name="id" value={job.id} />
            <Button type="submit" variant="danger">
              <Trash2 className="h-4 w-4" /> Delete job
            </Button>
          </form>
        </Card>
      ))}
    </AppShell>
  );
}
