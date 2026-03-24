-- =============================================
-- AUTOMARKET — Migración v2 (solo columnas nuevas)
-- Ejecuta esto en: Supabase → SQL Editor → New query
-- NO borra ni modifica datos existentes
-- =============================================

-- Agrega columnas nuevas solo si no existen
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sellers      jsonb    DEFAULT '[]'::jsonb;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sold         boolean  DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sold_at      timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS delete_after timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS video_url    text;

-- Tabla de leads de seguros (nueva)
CREATE TABLE IF NOT EXISTS insurance_leads (
  id             uuid primary key DEFAULT gen_random_uuid(),
  insurance_type text NOT NULL,
  plan_name      text,
  client_name    text NOT NULL,
  client_phone   text NOT NULL,
  client_email   text NOT NULL,
  vehicle_info   text,
  message        text,
  created_at     timestamptz DEFAULT now()
);

-- RLS para insurance_leads
ALTER TABLE insurance_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insertar leads seguros" ON insurance_leads;
CREATE POLICY "Insertar leads seguros" ON insurance_leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Leer leads seguros" ON insurance_leads;
CREATE POLICY "Leer leads seguros" ON insurance_leads FOR SELECT USING (auth.role() = 'authenticated');

-- Listo. Los datos existentes no se tocan.
