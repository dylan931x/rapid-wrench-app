import { Mail, MessageSquare, Phone } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CustomerOverview = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  area: string | null;
  vehicles: {
    id: string;
    year: number;
    make: string;
    model: string;
    engine: string | null;
    vin: string | null;
  }[];
};

async function getPeopleData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [] as CustomerOverview[];
  }

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, area, vehicles(id, year, make, model, engine, vin)')
    .eq('user_id', user.id)
    .order('full_name');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CustomerOverview[];
}

export default async function PeoplePage() {
  const customers = await getPeopleData();

  return (
    <AppShell title="People" description="Customer profiles with their linked vehicles and contact shortcuts.">
      {customers.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No customers yet. Add a customer first, then attach vehicles on the Vehicles page.</p>
        </Card>
      ) : null}

      {customers.map((customer) => (
        <Card key={customer.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{customer.full_name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {customer.phone}
                {customer.area ? ` • ${customer.area}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${customer.phone}`} className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={`sms:${customer.phone}?body=${encodeURIComponent(`Hi ${customer.full_name}, this is Rapid Wrench.`)}`}
                className="rounded-2xl bg-slate-100 p-3 text-slate-700"
              >
                <MessageSquare className="h-4 w-4" />
              </a>
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <Mail className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {customer.vehicles.length > 0 ? (
              customer.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                    {vehicle.engine ? ` • ${vehicle.engine}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">VIN: {vehicle.vin ?? 'Not entered'}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">No vehicles linked yet.</div>
            )}
          </div>
        </Card>
      ))}
    </AppShell>
  );
}
