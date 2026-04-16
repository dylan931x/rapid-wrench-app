import { Car, PlusCircle, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { createVehicle, deleteVehicle, updateVehicle } from '@/lib/actions/vehicles';
import { createClient } from '@/lib/supabase/server';

type CustomerOption = {
  id: string;
  full_name: string;
};

type VehicleRow = {
  id: string;
  customer_id: string;
  year: number;
  make: string;
  model: string;
  engine: string | null;
  vin: string | null;
  mileage: number | null;
  license_plate: string | null;
  color: string | null;
  notes: string | null;
  created_at: string;
  customer: { full_name: string } | null;
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

function VehicleForm({
  action,
  submitLabel,
  customers,
  vehicle,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  customers: CustomerOption[];
  vehicle?: VehicleRow;
}) {
  const defaultCustomerId = vehicle?.customer_id ?? customers[0]?.id ?? '';

  return (
    <form action={action} className="grid gap-3">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}

      <Field label="Customer">
        <Select name="customer_id" defaultValue={defaultCustomerId} required>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.full_name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Year">
          <Input name="year" type="number" defaultValue={vehicle?.year} placeholder="2014" required />
        </Field>
        <Field label="Engine">
          <Input name="engine" defaultValue={vehicle?.engine ?? ''} placeholder="3.6L" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Make">
          <Input name="make" defaultValue={vehicle?.make} placeholder="Chevrolet" required />
        </Field>
        <Field label="Model">
          <Input name="model" defaultValue={vehicle?.model} placeholder="Traverse LT" required />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="VIN">
          <Input name="vin" defaultValue={vehicle?.vin ?? ''} placeholder="1GNEVGKW0EJ123456" maxLength={17} />
        </Field>
        <Field label="Mileage">
          <Input name="mileage" type="number" defaultValue={vehicle?.mileage ?? ''} placeholder="162400" min={0} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="License plate">
          <Input name="license_plate" defaultValue={vehicle?.license_plate ?? ''} placeholder="ABC-1234" />
        </Field>
        <Field label="Color">
          <Input name="color" defaultValue={vehicle?.color ?? ''} placeholder="Black" />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea
          name="notes"
          defaultValue={vehicle?.notes ?? ''}
          placeholder="Trim details, customer-supplied parts, repeat issue notes, or special instructions"
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

async function getVehiclePageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { customers: [] as CustomerOption[], vehicles: [] as VehicleRow[] };
  }

  const [{ data: customers, error: customersError }, { data: vehicles, error: vehiclesError }] = await Promise.all([
    supabase.from('customers').select('id, full_name').eq('user_id', user.id).order('full_name'),
    supabase
      .from('vehicles')
      .select(
        'id, customer_id, year, make, model, engine, vin, mileage, license_plate, color, notes, created_at, customer:customers(full_name)',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  if (customersError) {
    throw new Error(customersError.message);
  }

  if (vehiclesError) {
    throw new Error(vehiclesError.message);
  }

  return {
    customers: (customers ?? []) satisfies CustomerOption[],
    vehicles: (vehicles ?? []) as VehicleRow[],
  };
}

export default async function VehiclesPage() {
  const { customers, vehicles } = await getVehiclePageData();

  return (
    <AppShell title="Vehicles" description="Attach vehicles to customers and keep VINs, mileage, and notes ready.">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Add vehicle</h2>
            <p className="mt-1 text-sm text-slate-600">Vehicles are linked directly to customer records in Supabase.</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
            <p className="text-xs text-slate-500">Saved</p>
            <p className="text-lg font-semibold text-slate-900">{vehicles.length}</p>
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add at least one customer before creating a vehicle.
          </div>
        ) : (
          <VehicleForm action={createVehicle} submitLabel="Save vehicle" customers={customers} />
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Vehicle list</h2>
            <p className="mt-1 text-sm text-slate-600">Edit ownership, VIN, mileage, and notes inline.</p>
          </div>
        </div>
      </Card>

      {vehicles.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No vehicles yet. Add your first vehicle above.</p>
        </Card>
      ) : null}

      {vehicles.map((vehicle) => (
        <Card key={vehicle.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-slate-500" />
                <h3 className="text-lg font-semibold text-slate-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">Owner: {vehicle.customer?.full_name ?? 'Unknown customer'}</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {vehicle.engine ?? 'Engine not set'}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium">VIN:</span> {vehicle.vin ?? 'Not entered'}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium">Mileage:</span>{' '}
              {typeof vehicle.mileage === 'number' ? vehicle.mileage.toLocaleString() : 'Not entered'}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium">Plate:</span> {vehicle.license_plate ?? 'Not entered'}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium">Color:</span> {vehicle.color ?? 'Not entered'}
            </div>
          </div>

          {vehicle.notes ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {vehicle.notes}
            </div>
          ) : null}

          <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">Edit vehicle</summary>
            <div className="mt-4">
              <VehicleForm action={updateVehicle} submitLabel="Update vehicle" customers={customers} vehicle={vehicle} />
            </div>
          </details>

          <form action={deleteVehicle} className="mt-3">
            <input type="hidden" name="id" value={vehicle.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              <Trash2 className="h-4 w-4" /> Delete vehicle
            </button>
          </form>
        </Card>
      ))}
    </AppShell>
  );
}
