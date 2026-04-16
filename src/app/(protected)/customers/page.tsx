import { Mail, MessageSquare, Phone, Trash2, UserPlus } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select, Textarea } from '@/components/ui/forms';
import { SectionTitle } from '@/components/ui/section-title';
import { createCustomer, deleteCustomer, updateCustomer } from '@/lib/actions/customers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  area: string | null;
  preferred_contact: 'text' | 'call' | 'email' | 'either';
  notes: string | null;
  created_at: string;
};

const contactOptions = [
  { value: 'text', label: 'Text' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'either', label: 'Either' },
] as const;

function CustomerForm({
  action,
  submitLabel,
  customer,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  customer?: CustomerRow;
}) {
  return (
    <form action={action} className="grid gap-3">
      {customer ? <input type="hidden" name="id" value={customer.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="full_name" defaultValue={customer?.full_name} placeholder="Sarah Jones" required />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={customer?.phone} placeholder="931-555-0182" required />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email">
          <Input name="email" type="email" defaultValue={customer?.email ?? ''} placeholder="name@example.com" />
        </Field>
        <Field label="Area">
          <Input name="area" defaultValue={customer?.area ?? ''} placeholder="Lawrenceburg" />
        </Field>
      </div>

      <Field label="Preferred contact">
        <Select name="preferred_contact" defaultValue={customer?.preferred_contact ?? 'text'}>
          {contactOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Notes">
        <Textarea
          name="notes"
          defaultValue={customer?.notes ?? ''}
          placeholder="Gate code, preferred time, vehicle notes, or billing notes"
        />
      </Field>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

function QuickActions({ customer }: { customer: CustomerRow }) {
  const smsMessage = `Hi ${customer.full_name}, this is Rapid Wrench.`;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`tel:${customer.phone}`}
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
      >
        <Phone className="h-4 w-4" /> Call
      </a>
      <a
        href={`sms:${customer.phone}?body=${encodeURIComponent(smsMessage)}`}
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
      >
        <MessageSquare className="h-4 w-4" /> Text
      </a>
      {customer.email ? (
        <a
          href={`mailto:${customer.email}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Mail className="h-4 w-4" /> Email
        </a>
      ) : null}
    </div>
  );
}

async function getCustomers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [] as CustomerRow[];

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, area, preferred_contact, notes, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data satisfies CustomerRow[];
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <AppShell title="Customers" description="Save contact details, quick actions, and notes you need in the field.">
      <Card>
        <SectionTitle
          title="Add customer"
          description="Create a customer record you can call, text, invoice, and reuse on future jobs."
          action={
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Saved</p>
              <p className="text-lg font-semibold text-slate-950">{customers.length}</p>
            </div>
          }
        />
        <div className="mt-4">
          <CustomerForm action={createCustomer} submitLabel="Save customer" />
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Customer list"
          description="Open a record, fire off a call or text, or edit the details inline."
        />
      </Card>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer above so you can link vehicles, jobs, and paperwork."
        />
      ) : null}

      {customers.map((customer) => (
        <Card key={customer.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{customer.full_name}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {customer.phone}
                {customer.area ? ` • ${customer.area}` : ''}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
              {customer.preferred_contact}
            </span>
          </div>

          <div className="mt-4">
            <QuickActions customer={customer} />
          </div>

          {customer.notes ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium">Notes:</span> {customer.notes}
            </div>
          ) : null}

          <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-800">Edit customer</summary>
            <div className="mt-4">
              <CustomerForm action={updateCustomer} submitLabel="Update customer" customer={customer} />
            </div>
          </details>

          <form action={deleteCustomer} className="mt-3">
            <input type="hidden" name="id" value={customer.id} />
            <Button type="submit" variant="danger">
              <Trash2 className="h-4 w-4" /> Delete customer
            </Button>
          </form>
        </Card>
      ))}
    </AppShell>
  );
}
