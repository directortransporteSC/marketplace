-- =============================================
-- AUTOMARKET — Script SQL para Supabase (v2)
-- Ejecuta esto en: Supabase → SQL Editor → New query
-- =============================================

-- 1. TABLA DE VEHÍCULOS
-- ─────────────────────────────────────────────
create table if not exists vehicles (
  id           uuid primary key default gen_random_uuid(),
  brand        text not null,
  model        text not null,
  year         integer not null,
  price        bigint not null,
  type         text,
  condition    text default 'Usado',
  km           integer default 0,
  fuel         text,
  trans        text,
  color        text,
  engine       text,
  city         text,
  seller_name  text,
  whatsapp     text,
  phone        text,
  email        text,
  sellers      jsonb default '[]'::jsonb,
  description  text,
  images       text[] default '{}',
  video_url    text,
  sold         boolean default false,
  sold_at      timestamptz,
  delete_after timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. TABLA DE LEADS SEGUROS
-- ─────────────────────────────────────────────
create table if not exists insurance_leads (
  id             uuid primary key default gen_random_uuid(),
  insurance_type text not null,
  plan_name      text,
  client_name    text not null,
  client_phone   text not null,
  client_email   text not null,
  vehicle_info   text,
  message        text,
  created_at     timestamptz default now()
);

-- 3. TRIGGER updated_at
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists set_updated_at on vehicles;
create trigger set_updated_at
before update on vehicles
for each row execute procedure update_updated_at();

-- 4. RLS VEHICLES
-- ─────────────────────────────────────────────
alter table vehicles enable row level security;

drop policy if exists "Lectura publica" on vehicles;
create policy "Lectura publica" on vehicles for select using (true);

drop policy if exists "Escritura solo admins" on vehicles;
create policy "Escritura solo admins" on vehicles for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Actualizar solo admins" on vehicles;
create policy "Actualizar solo admins" on vehicles for update
  using (auth.role() = 'authenticated');

drop policy if exists "Eliminar solo admins" on vehicles;
create policy "Eliminar solo admins" on vehicles for delete
  using (auth.role() = 'authenticated');

-- 5. RLS INSURANCE LEADS
-- ─────────────────────────────────────────────
alter table insurance_leads enable row level security;

drop policy if exists "Insertar leads seguros" on insurance_leads;
create policy "Insertar leads seguros" on insurance_leads for insert
  with check (true);

drop policy if exists "Leer leads seguros" on insurance_leads;
create policy "Leer leads seguros" on insurance_leads for select
  using (auth.role() = 'authenticated');

-- 6. STORAGE
-- ─────────────────────────────────────────────
drop policy if exists "Fotos publicas" on storage.objects;
create policy "Fotos publicas" on storage.objects for select
  using (bucket_id = 'vehicle-images');

drop policy if exists "Subir fotos solo admins" on storage.objects;
create policy "Subir fotos solo admins" on storage.objects for insert
  with check (bucket_id = 'vehicle-images' and auth.role() = 'authenticated');

drop policy if exists "Eliminar fotos solo admins" on storage.objects;
create policy "Eliminar fotos solo admins" on storage.objects for delete
  using (bucket_id = 'vehicle-images' and auth.role() = 'authenticated');

-- 7. Columnas nuevas en tabla existente (si ya existe la tabla)
-- ─────────────────────────────────────────────
-- Ejecuta estas líneas si ya tienes la tabla creada:
-- alter table vehicles add column if not exists sellers jsonb default '[]'::jsonb;
-- alter table vehicles add column if not exists sold boolean default false;
-- alter table vehicles add column if not exists sold_at timestamptz;
-- alter table vehicles add column if not exists delete_after timestamptz;
-- alter table vehicles add column if not exists video_url text;
