-- =============================================
-- AUTOMARKET — Script SQL para Supabase
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
  -- Datos del vendedor
  seller_name  text,
  whatsapp     text,
  phone        text,
  email        text,
  -- Contenido
  description  text,
  images       text[] default '{}',   -- Array de URLs de Supabase Storage
  -- Metadata
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. ACTUALIZAR updated_at automáticamente
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on vehicles
for each row execute procedure update_updated_at();

-- 3. POLÍTICA DE SEGURIDAD (Row Level Security)
-- ─────────────────────────────────────────────
alter table vehicles enable row level security;

-- Cualquiera puede VER los vehículos (vista pública)
create policy "Lectura pública"
  on vehicles for select
  using (true);

-- Solo usuarios autenticados pueden INSERTAR, ACTUALIZAR, ELIMINAR
create policy "Escritura solo admins"
  on vehicles for insert
  with check (auth.role() = 'authenticated');

create policy "Actualizar solo admins"
  on vehicles for update
  using (auth.role() = 'authenticated');

create policy "Eliminar solo admins"
  on vehicles for delete
  using (auth.role() = 'authenticated');

-- 4. STORAGE — Bucket para fotos de vehículos
-- ─────────────────────────────────────────────
-- Ejecuta esto DESPUÉS de crear el bucket manualmente en:
-- Supabase → Storage → New bucket → nombre: "vehicle-images" → Public: ON

-- Política: cualquiera puede ver las fotos
create policy "Fotos públicas"
  on storage.objects for select
  using ( bucket_id = 'vehicle-images' );

-- Solo admins pueden subir fotos
create policy "Subir fotos solo admins"
  on storage.objects for insert
  with check (
    bucket_id = 'vehicle-images'
    and auth.role() = 'authenticated'
  );

-- Solo admins pueden eliminar fotos
create policy "Eliminar fotos solo admins"
  on storage.objects for delete
  using (
    bucket_id = 'vehicle-images'
    and auth.role() = 'authenticated'
  );

-- 5. DATOS DE EJEMPLO (opcional — puedes borrar esto)
-- ─────────────────────────────────────────────
insert into vehicles (brand, model, year, price, type, condition, km, fuel, trans, color, engine, city, seller_name, whatsapp, email, description) values
('Toyota',    'Corolla',   2022, 72000000,  'Sedán',    'Usado',  28000, 'Gasolina', 'Automática', 'Blanco',     '2.0L',         'Bogotá',       'Carlos Martínez',        '3001234567', 'carlos@email.com',     'Excelente estado, único dueño. Mantenimientos al día.'),
('Chevrolet', 'Spark GT',  2023, 52000000,  'Sedán',    'Nuevo',  0,     'Gasolina', 'Manual',     'Rojo',       '1.2L',         'Medellín',     'AutoCenter Medellín',    '3109876543', 'ventas@autocenter.com','0 kilómetros directo de agencia. Garantía 3 años.'),
('BMW',       '320i',      2021, 145000000, 'Sedán',    'Usado',  42000, 'Gasolina', 'Automática', 'Negro',      '2.0L Turbo',   'Bogotá',       'Premium Cars',           '3152223344', 'premium@bmwcars.co',   'BMW Serie 3. Cuero, techo panorámico, GPS.'),
('Renault',   'Duster',    2022, 68000000,  'SUV',      'Usado',  35000, 'Gasolina', 'Automática', 'Gris',       '1.6L',         'Cali',         'Juan Pablo Rivera',      '3223344556', 'juanp@correo.com',     'Duster 4x2. Cámara de reversa, pantalla táctil.'),
('Honda',     'CB500F',    2023, 28000000,  'Moto',     'Nuevo',  500,   'Gasolina', 'Manual',     'Azul',       '471cc',        'Barranquilla', 'Moto Honda Caribe',      '3004455667', 'motos@hondacaribe.com','Naked de media cilindrada. ABS de serie.'),
('Mazda',     'CX-5',      2022, 112000000, 'SUV',      'Usado',  22000, 'Gasolina', 'Automática', 'Azul Marino','2.5L Skyactiv','Bogotá',       'Diego Rodríguez',        '3156677889', 'diego.r@gmail.com',    'Grand Touring. Cuero, AWD. Primer dueño.'),
('Kia',       'Sportage',  2023, 118000000, 'SUV',      'Nuevo',  0,     'Gasolina', 'Automática', 'Plata',      '1.6L Turbo',   'Bogotá',       'Kia Motors Bogotá',      '3001122334', 'kia@motorsbogota.com', 'GT-Line 0km. Techo panorámico. Garantía 5 años.'),
('Ford',      'Escape',    2021, 95000000,  'SUV',      'Usado',  38000, 'Híbrido',  'Automática', 'Blanco',     '2.5L Híbrido', 'Pereira',      'AutoFord Eje Cafetero',  '3168899001', 'autoford@eje.com',     'Ford Escape Híbrido. Apple CarPlay, cámara 360°.');
