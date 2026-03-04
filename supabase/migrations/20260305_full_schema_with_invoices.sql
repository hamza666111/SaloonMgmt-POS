-- ==========================================
-- Full Schema Refresh + Invoices + Demo Users
-- Date: 2026-03-04
-- ==========================================

BEGIN;

-- ------------------------------------------
-- Extensions
-- ------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------
-- Enum Types
-- ------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM ('admin', 'manager', 'receptionist', 'barber');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('confirmed', 'completed', 'in-progress', 'pending', 'no-show', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'partial');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'tap', 'gift');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_status') THEN
    CREATE TYPE payroll_status AS ENUM ('pending', 'approved', 'paid');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_type') THEN
    CREATE TYPE campaign_type AS ENUM ('sms', 'email');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'sent', 'completed', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
    CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_type') THEN
    CREATE TYPE membership_type AS ENUM ('none', 'basic', 'premium', 'vip');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'refunded', 'void');
  END IF;
END
$$;

-- ------------------------------------------
-- Core Configuration
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name role_type NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  UNIQUE (module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

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

-- ------------------------------------------
-- Users & Clients
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  branch_id UUID REFERENCES branches(id),
  role_id UUID REFERENCES roles(id),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  commission_percent DECIMAL(5, 2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_plaintext TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_plaintext'
  ) THEN
    ALTER TABLE users ADD COLUMN password_plaintext TEXT;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  loyalty_tier loyalty_tier NOT NULL DEFAULT 'bronze',
  membership_type membership_type NOT NULL DEFAULT 'none',
  preferred_barber_id UUID REFERENCES users(id),
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------
-- Services & Products
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  category_id UUID REFERENCES service_categories(id),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  category_id UUID REFERENCES product_categories(id),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  supplier VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------
-- Operations
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  client_id UUID REFERENCES clients(id),
  barber_id UUID REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'confirmed',
  deposit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id),
  staff_id UUID REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tip DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('service', 'product')),
  item_id UUID NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_ref VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  client_id UUID REFERENCES clients(id),
  staff_id UUID REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tip DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'issued',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------
-- Payroll & Marketing
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  service_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tips DECIMAL(10, 2) NOT NULL DEFAULT 0,
  product_commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
  booth_rent DECIMAL(10, 2) NOT NULL DEFAULT 0,
  deductions DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_payout DECIMAL(10, 2) NOT NULL,
  status payroll_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  name VARCHAR(255) NOT NULL,
  type campaign_type NOT NULL,
  audience VARCHAR(255),
  audience_filter JSONB,
  message TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  converted_count INTEGER NOT NULL DEFAULT 0,
  revenue_generated DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------
-- Helpers & Triggers
-- ------------------------------------------
CREATE OR REPLACE FUNCTION app_base_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
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

DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW
EXECUTE FUNCTION app_base_touch_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION app_base_touch_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION app_base_touch_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION app_base_touch_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION app_base_touch_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION app_base_touch_updated_at();

DROP TRIGGER IF EXISTS trg_branch_settings_updated_at ON branch_settings;
CREATE TRIGGER trg_branch_settings_updated_at
BEFORE UPDATE ON branch_settings
FOR EACH ROW
EXECUTE FUNCTION app_touch_updated_at();

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
-- Transactional POS Checkout (creates invoice)
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
  v_invoice_number TEXT;
  v_invoice_status invoice_status;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Checkout requires at least one item';
  END IF;

  v_invoice_number := COALESCE(NULLIF(p_invoice_number, ''), 'INV-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || left(gen_random_uuid()::text, 6));
  v_invoice_status := CASE WHEN COALESCE(p_total, 0) > 0 THEN 'paid' ELSE 'draft' END;

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
    v_invoice_number,
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
        AND (branch_id = p_branch_id OR branch_id IS NULL)
        AND stock_quantity >= v_quantity;

      GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
      IF v_updated_rows = 0 THEN
        RAISE EXCEPTION 'Insufficient stock for product id %', v_item_id;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO payments (sale_id, method, amount)
  VALUES (v_sale_id, p_payment_method, COALESCE(p_total, 0));

  INSERT INTO invoices (
    sale_id,
    branch_id,
    client_id,
    staff_id,
    appointment_id,
    invoice_number,
    issue_date,
    due_date,
    subtotal,
    discount,
    tax,
    tip,
    total,
    status,
    notes
  )
  VALUES (
    v_sale_id,
    p_branch_id,
    p_client_id,
    p_staff_id,
    p_appointment_id,
    v_invoice_number,
    NOW(),
    NULL,
    COALESCE(p_subtotal, 0),
    COALESCE(p_discount, 0),
    COALESCE(p_tax, 0),
    COALESCE(p_tip, 0),
    COALESCE(p_total, 0),
    v_invoice_status,
    NULL
  )
  ON CONFLICT (invoice_number) DO UPDATE SET
    sale_id = EXCLUDED.sale_id,
    branch_id = EXCLUDED.branch_id,
    client_id = EXCLUDED.client_id,
    staff_id = EXCLUDED.staff_id,
    appointment_id = EXCLUDED.appointment_id,
    subtotal = EXCLUDED.subtotal,
    discount = EXCLUDED.discount,
    tax = EXCLUDED.tax,
    tip = EXCLUDED.tip,
    total = EXCLUDED.total,
    status = EXCLUDED.status,
    updated_at = NOW();

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
-- Performance Indexes
-- ------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_barber_time ON appointments(barber_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_branch_time ON appointments(branch_id, start_time);
CREATE INDEX IF NOT EXISTS idx_sales_branch_created ON sales(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_staff ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_clients_branch ON clients(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_branch ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON invoices(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module ON role_module_permissions(module);
CREATE INDEX IF NOT EXISTS idx_branch_settings_updated_at ON branch_settings(updated_at DESC);

-- ------------------------------------------
-- RLS Enablement
-- ------------------------------------------
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- RLS Policies
-- ------------------------------------------
DROP POLICY IF EXISTS branches_branch_access ON branches;
CREATE POLICY branches_branch_access ON branches
FOR ALL
USING (app_is_admin() OR app_has_branch_access(id))
WITH CHECK (app_is_admin() OR app_has_branch_access(id));

DROP POLICY IF EXISTS roles_read ON roles;
CREATE POLICY roles_read ON roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS roles_admin_write ON roles;
CREATE POLICY roles_admin_write ON roles
FOR ALL
USING (app_is_admin())
WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS permissions_read ON permissions;
CREATE POLICY permissions_read ON permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS permissions_admin_write ON permissions;
CREATE POLICY permissions_admin_write ON permissions
FOR ALL
USING (app_is_admin())
WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS role_permissions_read ON role_permissions;
CREATE POLICY role_permissions_read ON role_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS role_permissions_admin_write ON role_permissions;
CREATE POLICY role_permissions_admin_write ON role_permissions
FOR ALL
USING (app_is_admin())
WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS users_branch_access ON users;
CREATE POLICY users_branch_access ON users
FOR ALL
USING (app_is_admin() OR id = auth.uid() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR id = auth.uid() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS clients_branch_access ON clients;
CREATE POLICY clients_branch_access ON clients
FOR ALL
USING (app_is_admin() OR app_has_branch_access(branch_id))
WITH CHECK (app_is_admin() OR app_has_branch_access(branch_id));

DROP POLICY IF EXISTS service_categories_read ON service_categories;
CREATE POLICY service_categories_read ON service_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS service_categories_write ON service_categories;
CREATE POLICY service_categories_write ON service_categories
FOR ALL
USING (app_is_manager_or_admin())
WITH CHECK (app_is_manager_or_admin());

DROP POLICY IF EXISTS services_read ON services;
CREATE POLICY services_read ON services
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);

DROP POLICY IF EXISTS services_write ON services;
CREATE POLICY services_write ON services
FOR ALL
USING (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
)
WITH CHECK (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);

DROP POLICY IF EXISTS product_categories_read ON product_categories;
CREATE POLICY product_categories_read ON product_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS product_categories_write ON product_categories;
CREATE POLICY product_categories_write ON product_categories
FOR ALL
USING (app_is_manager_or_admin())
WITH CHECK (app_is_manager_or_admin());

DROP POLICY IF EXISTS products_read ON products;
CREATE POLICY products_read ON products
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);

DROP POLICY IF EXISTS products_write ON products;
CREATE POLICY products_write ON products
FOR ALL
USING (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
)
WITH CHECK (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);

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

DROP POLICY IF EXISTS invoices_branch_access ON invoices;
CREATE POLICY invoices_branch_access ON invoices
FOR ALL
USING (
  app_is_admin()
  OR app_has_branch_access(COALESCE(branch_id, app_current_user_branch_id()))
)
WITH CHECK (
  app_is_admin()
  OR app_has_branch_access(COALESCE(branch_id, app_current_user_branch_id()))
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

DROP POLICY IF EXISTS audit_logs_admin_only ON audit_logs;
CREATE POLICY audit_logs_admin_only ON audit_logs
FOR ALL
USING (app_is_admin())
WITH CHECK (app_is_admin());

-- ------------------------------------------
-- Seed Baseline Data
-- ------------------------------------------
INSERT INTO branches (id, name, address, phone, email, is_active)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Downtown', '123 Main St, New York, NY 10001', '+1 (555) 100-0001', 'downtown@saloon.com', TRUE),
  ('b2222222-2222-2222-2222-222222222222', 'Midtown', '456 Park Ave, New York, NY 10022', '+1 (555) 100-0002', 'midtown@saloon.com', TRUE),
  ('b3333333-3333-3333-3333-333333333333', 'Brooklyn', '789 Atlantic Ave, Brooklyn, NY 11217', '+1 (555) 100-0003', 'brooklyn@saloon.com', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (name)
VALUES
  ('admin'::role_type),
  ('manager'::role_type),
  ('receptionist'::role_type),
  ('barber'::role_type)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('dashboard', 'read', 'View dashboard metrics'),
  ('appointments', 'read', 'View appointments'),
  ('appointments', 'write', 'Create/update/delete appointments'),
  ('pos', 'read', 'View POS data'),
  ('pos', 'write', 'Checkout sales'),
  ('invoices', 'read', 'View invoices'),
  ('invoices', 'write', 'Create/update invoices'),
  ('clients', 'read', 'View clients'),
  ('clients', 'write', 'Manage clients'),
  ('staff', 'read', 'View staff'),
  ('staff', 'write', 'Manage staff'),
  ('payroll', 'read', 'View payroll records'),
  ('payroll', 'write', 'Manage payroll records'),
  ('inventory', 'read', 'View inventory'),
  ('inventory', 'write', 'Manage products and services'),
  ('marketing', 'read', 'View campaigns'),
  ('marketing', 'write', 'Manage campaigns'),
  ('reports', 'read', 'View reports'),
  ('settings', 'read', 'View settings'),
  ('settings', 'write', 'Manage settings')
ON CONFLICT (module, action) DO NOTHING;

-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets read everything, write on ops/inventory/marketing/staff/clients/invoices/pos/appointments
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  (p.module IN ('appointments','pos','invoices','clients','staff','inventory','marketing') AND p.action IN ('read','write'))
  OR (p.module IN ('dashboard','reports','payroll','settings') AND p.action = 'read')
)
WHERE r.name = 'manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Receptionist: read/write appointments, pos, invoices, clients; read staff and inventory
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  (p.module IN ('appointments','pos','invoices','clients') AND p.action IN ('read','write'))
  OR (p.module IN ('staff','inventory','dashboard') AND p.action = 'read')
)
WHERE r.name = 'receptionist'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Barber: read appointments, clients, inventory; read reports; no writes by default
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  (p.module IN ('appointments','clients','inventory','reports') AND p.action = 'read')
)
WHERE r.name = 'barber'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Role-module flags (mirrors UI toggles)
INSERT INTO role_module_permissions (role, module, enabled) VALUES
  ('admin', 'dashboard', TRUE),
  ('admin', 'appointments', TRUE),
  ('admin', 'pos', TRUE),
  ('admin', 'invoices', TRUE),
  ('admin', 'clients', TRUE),
  ('admin', 'staff', TRUE),
  ('admin', 'payroll', TRUE),
  ('admin', 'inventory', TRUE),
  ('admin', 'marketing', TRUE),
  ('admin', 'reports', TRUE),
  ('admin', 'settings', TRUE),
  ('manager', 'dashboard', TRUE),
  ('manager', 'appointments', TRUE),
  ('manager', 'pos', TRUE),
  ('manager', 'invoices', TRUE),
  ('manager', 'clients', TRUE),
  ('manager', 'staff', TRUE),
  ('manager', 'payroll', FALSE),
  ('manager', 'inventory', TRUE),
  ('manager', 'marketing', TRUE),
  ('manager', 'reports', TRUE),
  ('manager', 'settings', FALSE),
  ('receptionist', 'dashboard', FALSE),
  ('receptionist', 'appointments', TRUE),
  ('receptionist', 'pos', TRUE),
  ('receptionist', 'invoices', TRUE),
  ('receptionist', 'clients', TRUE),
  ('receptionist', 'staff', TRUE),
  ('receptionist', 'payroll', FALSE),
  ('receptionist', 'inventory', TRUE),
  ('receptionist', 'marketing', FALSE),
  ('receptionist', 'reports', FALSE),
  ('receptionist', 'settings', FALSE),
  ('barber', 'dashboard', FALSE),
  ('barber', 'appointments', TRUE),
  ('barber', 'pos', FALSE),
  ('barber', 'invoices', FALSE),
  ('barber', 'clients', TRUE),
  ('barber', 'staff', FALSE),
  ('barber', 'payroll', FALSE),
  ('barber', 'inventory', FALSE),
  ('barber', 'marketing', FALSE),
  ('barber', 'reports', FALSE),
  ('barber', 'settings', FALSE)
ON CONFLICT (role, module) DO NOTHING;

-- Demo users with plaintext passwords for easy editing (create matching auth.users with same IDs to log in)
INSERT INTO users (id, branch_id, role_id, full_name, email, phone, commission_percent, is_active, password_plaintext)
SELECT '00000000-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111', r.id, 'Alice Admin', 'admin.demo@gmail.com', '+1 (555) 900-0001', 0, TRUE, 'AdminPass123!'
FROM roles r WHERE r.name = 'admin'
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, branch_id, role_id, full_name, email, phone, commission_percent, is_active, password_plaintext)
SELECT '00000000-0000-0000-0000-000000000002', 'b2222222-2222-2222-2222-222222222222', r.id, 'Manny Manager', 'manager.demo@gmail.com', '+1 (555) 900-0002', 5, TRUE, 'ManagerPass123!'
FROM roles r WHERE r.name = 'manager'
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, branch_id, role_id, full_name, email, phone, commission_percent, is_active, password_plaintext)
SELECT '00000000-0000-0000-0000-000000000003', 'b1111111-1111-1111-1111-111111111111', r.id, 'Rita Reception', 'reception.demo@gmail.com', '+1 (555) 900-0003', 0, TRUE, 'ReceptionPass123!'
FROM roles r WHERE r.name = 'receptionist'
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, branch_id, role_id, full_name, email, phone, commission_percent, is_active, password_plaintext)
SELECT '00000000-0000-0000-0000-000000000004', 'b3333333-3333-3333-3333-333333333333', r.id, 'Benny Barber', 'barber.demo@gmail.com', '+1 (555) 900-0004', 50, TRUE, 'BarberPass123!'
FROM roles r WHERE r.name = 'barber'
ON CONFLICT (id) DO NOTHING;

-- Sample data for categories, services, products, clients, appointments, sales, invoices, campaigns, payroll
INSERT INTO service_categories (id, name)
VALUES
  ('41111111-1111-1111-1111-111111111111', 'Haircut'),
  ('42222222-2222-2222-2222-222222222222', 'Color'),
  ('43333333-3333-3333-3333-333333333333', 'Grooming')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_categories (id, name)
VALUES
  ('61111111-1111-1111-1111-111111111111', 'Shampoo'),
  ('62222222-2222-2222-2222-222222222222', 'Styling')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, branch_id, category_id, name, price, duration_minutes, commission_percent, is_active)
VALUES
  ('51111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', 'Classic Haircut', 35, 30, 50, TRUE),
  ('52222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', '43333333-3333-3333-3333-333333333333', 'Beard Trim', 20, 20, 50, TRUE),
  ('53333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', '42222222-2222-2222-2222-222222222222', 'Deluxe Color', 120, 75, 45, TRUE),
  ('54444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', 'Kids Cut', 25, 25, 40, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, branch_id, category_id, name, sku, price, cost, stock_quantity, low_stock_threshold, supplier, is_active)
VALUES
  ('71111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '61111111-1111-1111-1111-111111111111', 'Mint Shampoo', 'SH-001', 18, 6, 40, 8, 'FreshCare Supply', TRUE),
  ('72222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', '62222222-2222-2222-2222-222222222222', 'Matte Clay', 'ST-001', 22, 8, 30, 6, 'StyleWorks', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, branch_id, full_name, phone, email, loyalty_tier, membership_type, preferred_barber_id, total_visits, total_spent, last_visit_at, notes)
VALUES
  ('81111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'John Carter', '+1 (555) 700-0001', 'john.carter@example.com', 'silver', 'basic', NULL, 3, 210.00, NOW() - INTERVAL '5 days', 'Prefers evening slots'),
  ('82222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'Priya Singh', '+1 (555) 700-0002', 'priya.singh@example.com', 'gold', 'premium', NULL, 5, 640.00, NOW() - INTERVAL '2 days', 'Color loyalist'),
  ('83333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'Liam Brooks', '+1 (555) 700-0003', 'liam.brooks@example.com', 'bronze', 'none', '00000000-0000-0000-0000-000000000004', 1, 48.20, NOW() - INTERVAL '1 day', 'Walk-in regular')
ON CONFLICT (id) DO NOTHING;

INSERT INTO appointments (id, branch_id, client_id, barber_id, service_id, start_time, end_time, status, deposit_amount, notes)
VALUES
  ('91111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333333', '83333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000004', '52222222-2222-2222-2222-222222222222', '2026-03-04T15:00:00Z', '2026-03-04T15:30:00Z', 'confirmed', 0, 'Walk-in beard trim'),
  ('92222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '82222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', '53333333-3333-3333-3333-333333333333', '2026-03-05T14:00:00Z', '2026-03-05T15:15:00Z', 'pending', 20, 'Full color service consult'),
  ('93333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', '81111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', '51111111-1111-1111-1111-111111111111', '2026-03-04T16:00:00Z', '2026-03-04T16:30:00Z', 'confirmed', 0, 'Prefers low fade')
ON CONFLICT (id) DO NOTHING;

INSERT INTO branch_settings (branch_id, settings_json)
VALUES
  ('b1111111-1111-1111-1111-111111111111', '{"timezone": "America/New_York", "open_hours": {"mon": "09:00-18:00", "sun": "11:00-17:00"}}'),
  ('b2222222-2222-2222-2222-222222222222', '{"timezone": "America/New_York", "open_hours": {"mon": "09:00-19:00"}}'),
  ('b3333333-3333-3333-3333-333333333333', '{"timezone": "America/New_York", "open_hours": {"sat": "09:00-17:00"}}')
ON CONFLICT (branch_id) DO NOTHING;

INSERT INTO sales (id, branch_id, invoice_number, client_id, staff_id, appointment_id, subtotal, discount, tax, tip, total, payment_method, status, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333333', 'INV-20260305-001', '83333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000004', '91111111-1111-1111-1111-111111111111', 42.00, 2.00, 3.20, 5.00, 48.20, 'card', 'paid', NOW() - INTERVAL '1 day'),
  ('a2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'INV-20260305-002', '81111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', '93333333-3333-3333-3333-333333333333', 53.00, 3.00, 4.00, 6.00, 60.00, 'cash', 'paid', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sale_items (id, sale_id, item_type, item_id, item_name, quantity, price, commission_percent)
VALUES
  ('b1111111-aaaa-1111-aaaa-111111111111', 'a1111111-1111-1111-1111-111111111111', 'service', '52222222-2222-2222-2222-222222222222', 'Beard Trim', 1, 20.00, 50),
  ('b2222222-bbbb-2222-bbbb-222222222222', 'a1111111-1111-1111-1111-111111111111', 'product', '72222222-2222-2222-2222-222222222222', 'Matte Clay', 1, 22.00, 10),
  ('b3333333-cccc-3333-cccc-333333333333', 'a2222222-2222-2222-2222-222222222222', 'service', '51111111-1111-1111-1111-111111111111', 'Classic Haircut', 1, 35.00, 50),
  ('b4444444-dddd-4444-dddd-444444444444', 'a2222222-2222-2222-2222-222222222222', 'product', '71111111-1111-1111-1111-111111111111', 'Mint Shampoo', 1, 18.00, 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, sale_id, method, amount, transaction_ref, created_at)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'card', 48.20, 'TRX-INV-20260305-001', NOW() - INTERVAL '1 day'),
  ('c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'cash', 60.00, 'CASH-INV-20260305-002', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, sale_id, branch_id, client_id, staff_id, appointment_id, invoice_number, issue_date, due_date, subtotal, discount, tax, tip, total, status, notes)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333333', '83333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000004', '91111111-1111-1111-1111-111111111111', 'INV-20260305-001', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 42.00, 2.00, 3.20, 5.00, 48.20, 'paid', 'Sample paid invoice'),
  ('d2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', '81111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', '93333333-3333-3333-3333-333333333333', 'INV-20260305-002', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 53.00, 3.00, 4.00, 6.00, 60.00, 'paid', 'Sample haircut and retail')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaigns (id, branch_id, name, type, audience, audience_filter, message, status, scheduled_at, sent_at, sent_count, opened_count, converted_count, revenue_generated, created_at)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Spring Glow-Up', 'sms', 'Top Clients', '{"tier": "silver+"}', 'Come in this week for 15% off color services!', 'scheduled', NOW() + INTERVAL '1 day', NULL, 0, 0, 0, 0, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO payroll_records (id, staff_id, period_start, period_end, service_revenue, commission_earned, tips, product_commission, booth_rent, deductions, net_payout, status, created_at)
VALUES
  ('f1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004', '2026-02-15', '2026-02-28', 320.00, 160.00, 45.00, 22.00, 0, 15.00, 212.00, 'approved', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, user_id, action, module, record_id, details, ip_address, created_at)
VALUES
  ('f2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'seed', 'migrations', '00000000-0000-0000-0000-000000000001', '{"message": "Sample data seeded"}', '127.0.0.1', NOW())
ON CONFLICT (id) DO NOTHING;

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
    ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
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

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

COMMIT;
