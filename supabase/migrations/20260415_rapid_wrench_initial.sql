-- Rapid Wrench Supabase schema
-- Phone-first MVP backend for customers, vehicles, jobs, payments, photos, docs, and signatures.
--
-- Notes:
-- 1) Run this in the Supabase SQL editor or as a migration.
-- 2) This schema assumes you are using Supabase Auth.
-- 3) If you collect an initial deposit when creating a job, the app should also create a payment row.
-- 4) Storage object rows are managed by the Storage API, not by direct inserts into storage.objects.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    business_name,
    owner_name,
    email,
    service_area,
    booking_slug,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'business_name', 'Rapid Wrench'),
    coalesce(new.raw_user_meta_data ->> 'owner_name', new.raw_user_meta_data ->> 'full_name'),
    new.email,
    null,
    concat('rw-', substring(new.id::text from 1 for 8)),
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into public.business_settings (
    user_id,
    default_warranty_text,
    default_policy_text,
    invoice_footer_text,
    require_deposit,
    created_at,
    updated_at
  )
  values (
    new.id,
    '2 years workmanship',
    '1. A deposit may be required before parts are ordered.
2. Final price may change if additional problems are found during diagnosis or repair.
3. Customer-supplied parts are not covered unless otherwise stated.
4. Workmanship warranty applies to labor performed by Rapid Wrench only.
5. Payment is due at completion unless a written payment plan is agreed to.',
    'Thank you for choosing Rapid Wrench.',
    false,
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  insert into public.service_types (user_id, name, description, duration_minutes, requires_approval, public_booking_enabled)
  values
    (new.id, 'Diagnostics', 'Basic diagnostic visit and scan', 60, false, true),
    (new.id, 'Battery / charging check', 'Battery, alternator, and charging system visit', 60, false, true),
    (new.id, 'Brake inspection', 'Brake noise or brake system inspection', 90, true, true)
  on conflict do nothing;

  insert into public.availability_rules (user_id, day_of_week, start_time, end_time, is_available)
  values
    (new.id, 1, '08:00', '17:00', true),
    (new.id, 2, '08:00', '17:00', true),
    (new.id, 3, '08:00', '17:00', true),
    (new.id, 4, '08:00', '17:00', true),
    (new.id, 5, '08:00', '17:00', true)
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.set_job_balance_from_row()
returns trigger
language plpgsql
as $$
begin
  new.labor_amount := coalesce(new.labor_amount, 0);
  new.parts_amount := coalesce(new.parts_amount, 0);
  new.deposit_amount := coalesce(new.deposit_amount, 0);
  new.balance_amount := greatest((new.labor_amount + new.parts_amount) - new.deposit_amount, 0);
  return new;
end;
$$;

create or replace function public.recalculate_job_totals(p_job_id uuid)
returns void
language plpgsql
as $$
declare
  v_payments_total numeric(10,2);
begin
  select coalesce(sum(amount), 0)
  into v_payments_total
  from public.payments
  where job_id = p_job_id;

  update public.jobs
  set
    deposit_amount = v_payments_total,
    balance_amount = greatest((coalesce(labor_amount, 0) + coalesce(parts_amount, 0)) - v_payments_total, 0),
    updated_at = now()
  where id = p_job_id;
end;
$$;

create or replace function public.on_payment_changed()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_job_totals(old.job_id);
    return old;
  else
    perform public.recalculate_job_totals(new.job_id);
    return new;
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'Rapid Wrench',
  owner_name text,
  phone text,
  email text,
  service_area text,
  booking_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  default_warranty_text text not null default '2 years workmanship',
  default_policy_text text not null,
  invoice_footer_text text,
  require_deposit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  area text,
  preferred_contact text not null default 'text'
    check (preferred_contact in ('text', 'call', 'email', 'either')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  year integer not null check (year between 1900 and 2100),
  make text not null,
  model text not null,
  engine text,
  vin text,
  mileage integer check (mileage is null or mileage >= 0),
  license_plate text,
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  title text,
  complaint text not null,
  diagnosis_notes text,
  recommended_tests text,
  repair_performed text,
  status text not null default 'new lead'
    check (status in (
      'new lead',
      'scheduled',
      'waiting on deposit',
      'waiting on parts',
      'in progress',
      'completed',
      'payment pending'
    )),
  labor_amount numeric(10,2) not null default 0 check (labor_amount >= 0),
  parts_amount numeric(10,2) not null default 0 check (parts_amount >= 0),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  balance_amount numeric(10,2) not null default 0 check (balance_amount >= 0),
  next_step text,
  warranty_text text,
  scheduled_for timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  payment_method text not null default 'other'
    check (payment_method in ('cash', 'card', 'cashapp', 'venmo', 'other')),
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'agreement')),
  pdf_storage_path text,
  policy_text_snapshot text not null,
  warranty_text_snapshot text,
  signer_name text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_user_job_type_unique unique (user_id, job_id, document_type)
);

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null unique references public.documents(id) on delete cascade,
  storage_path text not null,
  signer_name text,
  created_at timestamptz not null default now()
);



create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  requires_approval boolean not null default false,
  public_booking_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time text not null,
  end_time text not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  service_type_id uuid not null references public.service_types(id) on delete restrict,
  title text,
  notes text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'no-show')),
  source text not null default 'owner' check (source in ('owner', 'customer')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  vehicle_year integer,
  vehicle_make text,
  vehicle_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists public.diagnostic_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  symptom text,
  obd_code text,
  likely_causes jsonb,
  suggested_tests jsonb,
  tech_notes text,
  created_at timestamptz not null default now()
);

create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists customers_full_name_idx on public.customers(full_name);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists vehicles_user_id_idx on public.vehicles(user_id);
create index if not exists vehicles_customer_id_idx on public.vehicles(customer_id);
create index if not exists vehicles_vin_idx on public.vehicles(vin);
create index if not exists vehicles_make_model_idx on public.vehicles(make, model);
create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_vehicle_id_idx on public.jobs(vehicle_id);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_job_id_idx on public.payments(job_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at desc);
create index if not exists job_photos_user_id_idx on public.job_photos(user_id);
create index if not exists job_photos_job_id_idx on public.job_photos(job_id);
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_job_id_idx on public.documents(job_id);
create index if not exists documents_document_type_idx on public.documents(document_type);
create index if not exists signatures_user_id_idx on public.signatures(user_id);
create index if not exists signatures_document_id_idx on public.signatures(document_id);

create index if not exists service_types_user_id_idx on public.service_types(user_id);
create index if not exists availability_rules_user_id_idx on public.availability_rules(user_id);
create index if not exists blocked_times_user_id_idx on public.blocked_times(user_id);
create index if not exists blocked_times_start_at_idx on public.blocked_times(start_at);
create index if not exists appointments_user_id_idx on public.appointments(user_id);
create index if not exists appointments_start_at_idx on public.appointments(start_at);
create index if not exists appointments_status_idx on public.appointments(status);
create index if not exists diagnostic_entries_user_id_idx on public.diagnostic_entries(user_id);
create index if not exists diagnostic_entries_job_id_idx on public.diagnostic_entries(job_id);
create index if not exists diagnostic_entries_obd_code_idx on public.diagnostic_entries(obd_code);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute procedure public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute procedure public.set_updated_at();

drop trigger if exists jobs_set_balance_from_row on public.jobs;
create trigger jobs_set_balance_from_row
  before insert or update of labor_amount, parts_amount, deposit_amount on public.jobs
  for each row execute procedure public.set_job_balance_from_row();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute procedure public.set_updated_at();


drop trigger if exists service_types_set_updated_at on public.service_types;
create trigger service_types_set_updated_at
  before update on public.service_types
  for each row execute procedure public.set_updated_at();

drop trigger if exists availability_rules_set_updated_at on public.availability_rules;
create trigger availability_rules_set_updated_at
  before update on public.availability_rules
  for each row execute procedure public.set_updated_at();

drop trigger if exists blocked_times_set_updated_at on public.blocked_times;
create trigger blocked_times_set_updated_at
  before update on public.blocked_times
  for each row execute procedure public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute procedure public.set_updated_at();

drop trigger if exists payments_recalculate_job_totals on public.payments;
create trigger payments_recalculate_job_totals
  after insert or update or delete on public.payments
  for each row execute procedure public.on_payment_changed();

alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.jobs enable row level security;
alter table public.payments enable row level security;
alter table public.job_photos enable row level security;
alter table public.documents enable row level security;
alter table public.signatures enable row level security;
alter table public.service_types enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_times enable row level security;
alter table public.appointments enable row level security;
alter table public.diagnostic_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "business_settings_all_own" on public.business_settings;
create policy "business_settings_all_own"
  on public.business_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "customers_all_own" on public.customers;
create policy "customers_all_own"
  on public.customers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "vehicles_all_own" on public.vehicles;
create policy "vehicles_all_own"
  on public.vehicles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "jobs_all_own" on public.jobs;
create policy "jobs_all_own"
  on public.jobs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "payments_all_own" on public.payments;
create policy "payments_all_own"
  on public.payments
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "job_photos_all_own" on public.job_photos;
create policy "job_photos_all_own"
  on public.job_photos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own"
  on public.documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "signatures_all_own" on public.signatures;
create policy "signatures_all_own"
  on public.signatures
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "diagnostic_entries_all_own" on public.diagnostic_entries;
create policy "diagnostic_entries_all_own"
  on public.diagnostic_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('job-photos', 'job-photos', false),
  ('documents', 'documents', false),
  ('signatures', 'signatures', false)
on conflict (id) do nothing;

drop policy if exists "storage_select_own_files" on storage.objects;
create policy "storage_select_own_files"
  on storage.objects
  for select to authenticated
  using (
    bucket_id in ('job-photos', 'documents', 'signatures')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_insert_own_files" on storage.objects;
create policy "storage_insert_own_files"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('job-photos', 'documents', 'signatures')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_update_own_files" on storage.objects;
create policy "storage_update_own_files"
  on storage.objects
  for update to authenticated
  using (
    bucket_id in ('job-photos', 'documents', 'signatures')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('job-photos', 'documents', 'signatures')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_delete_own_files" on storage.objects;
create policy "storage_delete_own_files"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('job-photos', 'documents', 'signatures')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
