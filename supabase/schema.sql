-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE role_type AS ENUM ('admin', 'manager', 'receptionist', 'barber');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'partial');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'tap', 'giftcard');
CREATE TYPE payroll_status AS ENUM ('pending', 'approved', 'paid');
CREATE TYPE campaign_type AS ENUM ('sms', 'email');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sent', 'cancelled');

-- 1. CORE CONFIGURATION
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name role_type NOT NULL UNIQUE
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL, -- view, create, edit, delete, approve, export, configure
    UNIQUE(module, action)
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

-- 2. USERS & CLIENTS
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    branch_id UUID REFERENCES branches(id),
    role_id UUID REFERENCES roles(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    benefits_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    loyalty_points INTEGER DEFAULT 0,
    membership_id UUID REFERENCES memberships(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SERVICES & INVENTORY
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    commission_percent DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true
);

-- 4. OPERATIONS
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    client_id UUID REFERENCES clients(id),
    barber_id UUID REFERENCES users(id),
    service_id UUID REFERENCES services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    deposit_amount DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    staff_id UUID REFERENCES users(id),
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    tip DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    status payment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    item_type VARCHAR(50) CHECK (item_type IN ('service', 'product')),
    item_id UUID NOT NULL, -- references services.id or products.id logically
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    commission_percent DECIMAL(5, 2) DEFAULT 0
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    method payment_method NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HR & MARKETING
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    service_earnings DECIMAL(10, 2) DEFAULT 0,
    tips DECIMAL(10, 2) DEFAULT 0,
    product_commission DECIMAL(10, 2) DEFAULT 0,
    booth_rent DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    status payroll_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    type campaign_type NOT NULL,
    audience_json JSONB NOT NULL,
    message TEXT NOT NULL,
    status campaign_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access" ON branches FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role_id IN (SELECT id FROM roles WHERE name = 'admin'))
);

-- Users can read their own branch data
CREATE POLICY "Users can read own branch data" ON users FOR SELECT USING (
  branch_id = (SELECT branch_id FROM users WHERE id = auth.uid()) OR 
  id = auth.uid()
);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- 1. Auto Inventory Deduction
CREATE OR REPLACE FUNCTION deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.item_type = 'product' THEN
        UPDATE products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON sale_items
FOR EACH ROW EXECUTE FUNCTION deduct_inventory();

-- 2. Audit Logging Function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, module, record_id, details)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sales_audit
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trigger_refunds_audit
AFTER INSERT ON refunds
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Prevent Deletion of Sales (Immutable Records)
CREATE OR REPLACE FUNCTION prevent_sale_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Sales records are immutable. Use refunds instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_delete_sales
BEFORE DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION prevent_sale_deletion();
