-- ==========================================
-- Core Schema Bootstrap Migration
-- Date: 2026-03-03
-- ==========================================

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ------------------------------------------
-- Performance Indexes
-- ------------------------------------------

CREATE INDEX IF NOT EXISTS idx_appointments_barber_time
ON appointments(barber_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_appointments_branch_time
ON appointments(branch_id, start_time);

CREATE INDEX IF NOT EXISTS idx_sales_branch_created
ON sales(branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_staff
ON sales(staff_id);

CREATE INDEX IF NOT EXISTS idx_clients_branch
ON clients(branch_id);

CREATE INDEX IF NOT EXISTS idx_products_branch
ON products(branch_id);

CREATE INDEX IF NOT EXISTS idx_users_branch
ON users(branch_id);

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

INSERT INTO permissions (module, action, description)
VALUES
  ('dashboard', 'view', 'View dashboard metrics'),
  ('appointments', 'view', 'View appointments'),
  ('appointments', 'create', 'Create appointments'),
  ('appointments', 'edit', 'Edit appointments'),
  ('appointments', 'delete', 'Delete appointments'),
  ('pos', 'view', 'Access POS'),
  ('pos', 'process', 'Process sales'),
  ('pos', 'refund', 'Process refunds'),
  ('invoices', 'view', 'View invoices'),
  ('invoices', 'export', 'Export invoices'),
  ('clients', 'view', 'View clients'),
  ('clients', 'create', 'Create clients'),
  ('clients', 'edit', 'Edit clients'),
  ('staff', 'view', 'View staff'),
  ('staff', 'create', 'Create staff'),
  ('staff', 'edit', 'Edit staff'),
  ('payroll', 'view', 'View payroll'),
  ('payroll', 'approve', 'Approve payroll'),
  ('inventory', 'view', 'View inventory'),
  ('inventory', 'edit', 'Edit inventory'),
  ('marketing', 'view', 'View campaigns'),
  ('marketing', 'create', 'Create campaigns'),
  ('reports', 'view', 'View reports'),
  ('reports', 'export', 'Export reports'),
  ('settings', 'view', 'View settings'),
  ('settings', 'edit', 'Edit settings')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'::role_type
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'::role_type
  AND p.module <> 'settings'
ON CONFLICT DO NOTHING;

INSERT INTO service_categories (name)
VALUES ('Haircut'), ('Beard'), ('Combo'), ('Shave'), ('Treatment')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name)
VALUES ('Styling'), ('Beard Care'), ('Hair Care'), ('Shave'), ('Treatment')
ON CONFLICT (name) DO NOTHING;
