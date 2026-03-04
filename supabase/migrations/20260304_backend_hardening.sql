-- ==========================================
-- Backend Hardening Migration
-- Date: 2026-03-04
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF to_regclass('public.branches') IS NULL
    OR to_regclass('public.users') IS NULL
    OR to_regclass('public.roles') IS NULL
    OR to_regclass('public.permissions') IS NULL
    OR to_regclass('public.role_permissions') IS NULL
    OR to_regclass('public.clients') IS NULL
    OR to_regclass('public.services') IS NULL
    OR to_regclass('public.products') IS NULL
    OR to_regclass('public.appointments') IS NULL
    OR to_regclass('public.sales') IS NULL
    OR to_regclass('public.sale_items') IS NULL
    OR to_regclass('public.payments') IS NULL
    OR to_regclass('public.refunds') IS NULL
    OR to_regclass('public.campaigns') IS NULL
    OR to_regclass('public.payroll_records') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite core schema. Run migration 20260303_core_schema.sql before 20260304_backend_hardening.sql.';
  END IF;
END
$$;

-- ------------------------------------------
-- Settings + Role Override Tables
-- ------------------------------------------

CREATE TABLE IF NOT EXISTS branch_settings (
  branch_id UUID PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_module_permissions (
  role role_type NOT NULL,
  module TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role, module)
);

CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module
ON role_module_permissions(module);

CREATE INDEX IF NOT EXISTS idx_branch_settings_updated_at
ON branch_settings(updated_at DESC);

-- ------------------------------------------
-- Utility Functions
-- ------------------------------------------

CREATE OR REPLACE FUNCTION app_current_user_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT u.branch_id
  FROM users u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_current_user_role()
RETURNS role_type
LANGUAGE sql
STABLE
AS $$
  SELECT r.name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(app_current_user_role() = 'admin'::role_type, false);
$$;

CREATE OR REPLACE FUNCTION app_has_branch_access(target_branch UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT app_is_admin() OR app_current_user_branch_id() = target_branch;
$$;

CREATE OR REPLACE FUNCTION app_is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(app_current_user_role() IN ('admin'::role_type, 'manager'::role_type), false);
$$;

CREATE OR REPLACE FUNCTION app_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_settings_updated_at ON branch_settings;
CREATE TRIGGER trg_branch_settings_updated_at
BEFORE UPDATE ON branch_settings
FOR EACH ROW
EXECUTE FUNCTION app_touch_updated_at();

-- ------------------------------------------
-- Appointment Conflict-safe Insert
-- ------------------------------------------

CREATE OR REPLACE FUNCTION create_appointment_safe(
  p_branch_id UUID,
  p_client_id UUID,
  p_barber_id UUID,
  p_service_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_status appointment_status DEFAULT 'confirmed',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Invalid appointment range: end_time must be after start_time';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.barber_id = p_barber_id
      AND a.status IN ('confirmed', 'pending', 'in-progress')
      AND p_start_time < a.end_time
      AND p_end_time > a.start_time
      AND a.branch_id = p_branch_id
  ) THEN
    RAISE EXCEPTION 'Appointment conflict detected for selected barber';
  END IF;

  INSERT INTO appointments (
    branch_id,
    client_id,
    barber_id,
    service_id,
    start_time,
    end_time,
    status,
    notes
  )
  VALUES (
    p_branch_id,
    p_client_id,
    p_barber_id,
    p_service_id,
    p_start_time,
    p_end_time,
    p_status,
    p_notes
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ------------------------------------------
-- Transactional POS Checkout RPC
-- ------------------------------------------

CREATE OR REPLACE FUNCTION process_sale_checkout(
  p_branch_id UUID,
  p_client_id UUID,
  p_staff_id UUID,
  p_appointment_id UUID,
  p_invoice_number TEXT,
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_tax NUMERIC,
  p_tip NUMERIC,
  p_total NUMERIC,
  p_payment_method payment_method,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_item_type TEXT;
  v_item_id UUID;
  v_item_name TEXT;
  v_quantity INTEGER;
  v_price NUMERIC;
  v_commission NUMERIC;
  v_updated_rows INTEGER;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Checkout requires at least one item';
  END IF;

  INSERT INTO sales (
    branch_id,
    invoice_number,
    client_id,
    staff_id,
    appointment_id,
    subtotal,
    discount,
    tax,
    tip,
    total,
    payment_method,
    status
  )
  VALUES (
    p_branch_id,
    p_invoice_number,
    p_client_id,
    p_staff_id,
    p_appointment_id,
    COALESCE(p_subtotal, 0),
    COALESCE(p_discount, 0),
    COALESCE(p_tax, 0),
    COALESCE(p_tip, 0),
    COALESCE(p_total, 0),
    p_payment_method,
    'paid'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_type := COALESCE(v_item->>'item_type', 'service');
    v_item_id := NULLIF(v_item->>'item_id', '')::UUID;
    v_item_name := COALESCE(v_item->>'item_name', 'Item');
    v_quantity := GREATEST(COALESCE((v_item->>'quantity')::INTEGER, 1), 1);
    v_price := COALESCE((v_item->>'price')::NUMERIC, 0);
    v_commission := COALESCE((v_item->>'commission_percent')::NUMERIC, CASE WHEN v_item_type = 'product' THEN 10 ELSE 50 END);

    INSERT INTO sale_items (
      sale_id,
      item_type,
      item_id,
      item_name,
      quantity,
      price,
      commission_percent
    )
    VALUES (
      v_sale_id,
      v_item_type,
      COALESCE(v_item_id, gen_random_uuid()),
      v_item_name,
      v_quantity,
      v_price,
      v_commission
    );

    IF v_item_type = 'product' AND v_item_id IS NOT NULL THEN
      UPDATE products
      SET stock_quantity = stock_quantity - v_quantity
      WHERE id = v_item_id
        AND branch_id = p_branch_id
        AND stock_quantity >= v_quantity;

      GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
      IF v_updated_rows = 0 THEN
        RAISE EXCEPTION 'Insufficient stock for product id %', v_item_id;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO payments (sale_id, method, amount)
  VALUES (v_sale_id, p_payment_method, COALESCE(p_total, 0));

  IF p_client_id IS NOT NULL THEN
    UPDATE clients
    SET
      total_visits = COALESCE(total_visits, 0) + 1,
      total_spent = COALESCE(total_spent, 0) + COALESCE(p_total, 0),
      last_visit_at = NOW()
    WHERE id = p_client_id;
  END IF;

  IF p_appointment_id IS NOT NULL THEN
    UPDATE appointments
    SET status = 'completed'
    WHERE id = p_appointment_id;
  END IF;

  RETURN v_sale_id;
END;
$$;

-- ------------------------------------------
-- RLS Enablement
-- ------------------------------------------

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- RLS Policies
-- ------------------------------------------

DROP POLICY IF EXISTS branches_branch_access ON branches;
CREATE POLICY branches_branch_access ON branches
FOR ALL
USING (app_is_admin() OR app_has_branch_access(id))
WITH CHECK (app_is_admin() OR app_has_branch_access(id));

DROP POLICY IF EXISTS users_branch_access ON users;
CREATE POLICY users_branch_access ON users
FOR ALL
USING (app_is_admin() OR id = auth.uid() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS clients_branch_access ON clients;
CREATE POLICY clients_branch_access ON clients
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS services_branch_access ON services;
CREATE POLICY services_branch_access ON services
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS products_branch_access ON products;
CREATE POLICY products_branch_access ON products
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS appointments_branch_access ON appointments;
CREATE POLICY appointments_branch_access ON appointments
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS sales_branch_access ON sales;
CREATE POLICY sales_branch_access ON sales
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS sale_items_through_sale ON sale_items;
CREATE POLICY sale_items_through_sale ON sale_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM sales s
    WHERE s.id = sale_items.sale_id
      AND (app_is_admin() OR app_has_branch_access(s.branch_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM sales s
    WHERE s.id = sale_items.sale_id
      AND (app_is_admin() OR app_has_branch_access(s.branch_id))
  )
);

DROP POLICY IF EXISTS payments_through_sale ON payments;
CREATE POLICY payments_through_sale ON payments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM sales s
    WHERE s.id = payments.sale_id
      AND (app_is_admin() OR app_has_branch_access(s.branch_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM sales s
    WHERE s.id = payments.sale_id
      AND (app_is_admin() OR app_has_branch_access(s.branch_id))
  )
);

DROP POLICY IF EXISTS refunds_through_sale ON refunds;
CREATE POLICY refunds_through_sale ON refunds
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM sales s
    WHERE s.id = refunds.sale_id
      AND (app_is_admin() OR app_has_branch_access(s.branch_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM sales s
    WHERE s.id = refunds.sale_id
      AND (app_is_admin() OR app_has_branch_access(s.branch_id))
  )
);

DROP POLICY IF EXISTS campaigns_branch_access ON campaigns;
CREATE POLICY campaigns_branch_access ON campaigns
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS payroll_branch_access ON payroll_records;
CREATE POLICY payroll_branch_access ON payroll_records
FOR ALL
USING (
  app_is_admin()
  OR EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = payroll_records.staff_id
      AND app_has_branch_access(u.branch_id)
  )
)
WITH CHECK (
  app_is_admin()
  OR EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = payroll_records.staff_id
      AND app_has_branch_access(u.branch_id)
  )
);

DROP POLICY IF EXISTS branch_settings_access ON branch_settings;
CREATE POLICY branch_settings_access ON branch_settings
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS role_module_permissions_read ON role_module_permissions;
CREATE POLICY role_module_permissions_read ON role_module_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS role_module_permissions_write ON role_module_permissions;
CREATE POLICY role_module_permissions_write ON role_module_permissions
FOR ALL
USING (app_is_manager_or_admin())
WITH CHECK (app_is_manager_or_admin());

-- ------------------------------------------
-- Seed role-module overrides from permissions
-- ------------------------------------------

INSERT INTO role_module_permissions (role, module, enabled)
SELECT DISTINCT r.name, p.module, TRUE
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
ON CONFLICT (role, module) DO NOTHING;

-- ------------------------------------------
-- Realtime Publication
-- ------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE sales;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE clients;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE payroll_records;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;
