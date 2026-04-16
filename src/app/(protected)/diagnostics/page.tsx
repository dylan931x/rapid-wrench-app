import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Search, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import {
  createDiagnosticEntry,
  deleteDiagnosticEntry,
  updateDiagnosticEntry,
} from '@/lib/actions/diagnostics';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const symptomKnowledge = {
  'battery light on': {
    causes: [
      'Weak alternator output',
      'Loose or slipping belt',
      'Bad battery connection',
      'Poor ground or voltage drop',
      'Damaged alternator connector',
    ],
    tests: [
      'Check resting battery voltage',
      'Check charging voltage at idle and with load',
      'Inspect belt condition and tension',
      'Perform voltage drop test on main positive and grounds',
      'Inspect alternator plug and output cable',
    ],
  },
  "cranks but won't start": {
    causes: [
      'No fuel pressure',
      'No spark',
      'No injector pulse',
      'Crank sensor issue',
      'Security / immobilizer issue',
      'Low compression or timing issue',
    ],
    tests: [
      'Verify battery voltage while cranking',
      'Check fuel pressure',
      'Check spark on multiple cylinders',
      'Check injector pulse with a noid light',
      'Scan for codes and live RPM while cranking',
    ],
  },
  'rough idle': {
    causes: ['Vacuum leak', 'Ignition misfire', 'Dirty throttle body', 'Fuel trim issue', 'EGR problem'],
    tests: [
      'Check fuel trims',
      'Inspect for vacuum leaks',
      'Check ignition components',
      'Inspect throttle body and intake',
      'Check related codes',
    ],
  },
  overheating: {
    causes: ['Low coolant level', 'Thermostat stuck closed', 'Cooling fan issue', 'Water pump problem', 'Air trapped in system'],
    tests: [
      'Inspect coolant level and leaks',
      'Verify fan operation',
      'Check hose temperature difference',
      'Pressure test cooling system',
      'Confirm thermostat and pump operation',
    ],
  },
  misfire: {
    causes: ['Bad spark plug or coil', 'Injector issue', 'Vacuum leak', 'Low compression', 'Fuel delivery issue'],
    tests: [
      'Check misfire counters',
      'Inspect plugs and coils',
      'Swap ignition components if needed',
      'Check injector operation',
      'Run compression test if needed',
    ],
  },
} as const;

const codeKnowledge = {
  P0300: {
    title: 'Random / Multiple Cylinder Misfire',
    causes: ['Ignition components', 'Vacuum leak', 'Fuel delivery issue', 'Low compression', 'Airflow / sensor issue'],
    tests: ['Check freeze frame', 'Inspect plugs and coils', 'Check fuel pressure and trims', 'Inspect intake leaks', 'Compression test if needed'],
  },
  P0171: {
    title: 'System Too Lean Bank 1',
    causes: ['Vacuum leak', 'Dirty MAF sensor', 'Low fuel pressure', 'Unmetered air leak', 'Exhaust leak near sensor'],
    tests: ['Check trims at idle and cruise', 'Inspect intake and PCV', 'Clean or test MAF', 'Check fuel pressure', 'Inspect upstream exhaust'],
  },
  P0401: {
    title: 'Insufficient EGR Flow',
    causes: ['Clogged EGR passage', 'Faulty EGR valve', 'Vacuum issue', 'Bad related sensor', 'Carbon blockage'],
    tests: ['Inspect vacuum supply or command', 'Check EGR passage', 'Verify valve movement', 'Check related sensor data', 'Confirm before replacing parts'],
  },
  P0420: {
    title: 'Catalyst System Efficiency Below Threshold',
    causes: ['Weak catalytic converter', 'Exhaust leak', 'Aging O2 sensors', 'Underlying rich / misfire issue'],
    tests: ['Check for misfires first', 'Inspect for exhaust leaks', 'Review O2 sensor behavior', 'Confirm converter efficiency with data'],
  },
} as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type JobOption = {
  id: string;
  title: string | null;
  complaint: string;
  customer: { full_name: string } | null;
  vehicle: { year: number; make: string; model: string } | null;
};

type DiagnosticEntry = {
  id: string;
  job_id: string;
  symptom: string | null;
  obd_code: string | null;
  likely_causes: unknown;
  suggested_tests: unknown;
  tech_notes: string | null;
  created_at: string;
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

function formatLines(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter(Boolean)
    .join('\n');
}

function jobLabel(job: JobOption) {
  const vehicle = job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'Unknown vehicle';
  const customer = job.customer?.full_name ?? 'Unknown customer';
  return `${vehicle} • ${customer}`;
}

function DiagnosticForm({
  action,
  submitLabel,
  jobs,
  entry,
  defaultSymptom,
  defaultCode,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  jobs: JobOption[];
  entry?: DiagnosticEntry;
  defaultSymptom?: string;
  defaultCode?: string;
}) {
  const selectedSymptom = (entry?.symptom || defaultSymptom || '') as keyof typeof symptomKnowledge | '';
  const selectedCode = (entry?.obd_code || defaultCode || '') as keyof typeof codeKnowledge | '';

  const presetCauses = selectedSymptom
    ? symptomKnowledge[selectedSymptom].causes
    : selectedCode
      ? codeKnowledge[selectedCode].causes
      : [];

  const presetTests = selectedSymptom
    ? symptomKnowledge[selectedSymptom].tests
    : selectedCode
      ? codeKnowledge[selectedCode].tests
      : [];

  return (
    <form action={action} className="grid gap-3">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}

      <Field label="Job">
        <Select name="job_id" defaultValue={entry?.job_id ?? jobs[0]?.id} required>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {jobLabel(job)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Symptom">
          <Select name="symptom" defaultValue={entry?.symptom ?? defaultSymptom ?? ''}>
            <option value="">Select symptom</option>
            {Object.keys(symptomKnowledge).map((symptom) => (
              <option key={symptom} value={symptom}>
                {symptom}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="OBD2 code">
          <Select name="obd_code" defaultValue={entry?.obd_code ?? defaultCode ?? ''}>
            <option value="">Select code</option>
            {Object.keys(codeKnowledge).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Likely causes (one per line or comma separated)">
        <Textarea
          name="likely_causes"
          defaultValue={entry ? formatLines(entry.likely_causes) : presetCauses.join('\n')}
          placeholder="Weak alternator output&#10;Loose or slipping belt"
        />
      </Field>

      <Field label="Suggested tests (one per line or comma separated)">
        <Textarea
          name="suggested_tests"
          defaultValue={entry ? formatLines(entry.suggested_tests) : presetTests.join('\n')}
          placeholder="Check charging voltage&#10;Inspect belt condition"
        />
      </Field>

      <Field label="Technician notes">
        <Textarea
          name="tech_notes"
          defaultValue={entry?.tech_notes ?? ''}
          placeholder="Verified concern, scanned codes, and noted next diagnostic step."
        />
      </Field>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function ReferenceCard({
  title,
  causes,
  tests,
  href,
}: {
  title: string;
  causes: string[];
  tests: string[];
  href: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">Tap to prefill the create form.</p>
        </div>
        <Link href={href} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          <Search className="h-4 w-4" /> Use
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-900">Likely causes</p>
          <div className="space-y-2">
            {causes.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-900">Suggested tests</p>
          <div className="space-y-2">
            {tests.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default async function DiagnosticsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const symptom = typeof params.symptom === 'string' ? params.symptom : '';
  const code = typeof params.code === 'string' ? params.code.toUpperCase() : '';

  const supabase = await createClient();

  const [{ data: jobs, error: jobsError }, { data: entries, error: entriesError }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, title, complaint, customer:customers(full_name), vehicle:vehicles(year, make, model)')
      .order('created_at', { ascending: false }),
    supabase.from('diagnostic_entries').select('*').order('created_at', { ascending: false }),
  ]);

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const jobsList = (jobs ?? []) as JobOption[];
  const entryList = (entries ?? []) as DiagnosticEntry[];
  const jobMap = new Map(jobsList.map((job) => [job.id, job]));

  return (
    <AppShell
      title="Diagnostics"
      description="Save real symptom, code, cause, and test notes against jobs while keeping quick field references handy."
    >
      <Card>
        <h2 className="text-base font-semibold">Create diagnostic entry</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pick a job, then save the symptom, code, likely causes, suggested tests, and your technician notes.
        </p>
        <div className="mt-4">
          <DiagnosticForm
            action={createDiagnosticEntry}
            submitLabel="Save diagnostic entry"
            jobs={jobsList}
            defaultSymptom={symptom}
            defaultCode={code}
          />
        </div>
      </Card>

      <div className="grid gap-4">
        {Object.entries(symptomKnowledge).map(([key, value]) => (
          <ReferenceCard key={key} title={key} causes={[...value.causes]} tests={[...value.tests]} href={`/diagnostics?symptom=${encodeURIComponent(key)}`} />
        ))}

        {Object.entries(codeKnowledge).map(([key, value]) => (
          <ReferenceCard
            key={key}
            title={`${key} — ${value.title}`}
            causes={[...value.causes]}
            tests={[...value.tests]}
            href={`/diagnostics?code=${encodeURIComponent(key)}`}
          />
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Saved diagnostic history</h2>
            <p className="mt-1 text-sm text-slate-600">Stored against jobs so you can refer back to what you found and tested.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{entryList.length} entries</span>
        </div>
      </Card>

      {entryList.map((entry) => {
        const job = jobMap.get(entry.job_id);
        return (
          <Card key={entry.id}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {job ? jobLabel(job) : 'Unknown job'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Saved {new Date(entry.created_at).toLocaleString()}</p>
              </div>
              <form action={deleteDiagnosticEntry}>
                <input type="hidden" name="id" value={entry.id} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </form>
            </div>

            <DiagnosticForm action={updateDiagnosticEntry} submitLabel="Update diagnostic entry" jobs={jobsList} entry={entry} />
          </Card>
        );
      })}
    </AppShell>
  );
}
