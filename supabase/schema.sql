-- ==========================================
-- SALOON POS & MANAGEMENT - COMPLETE SCHEMA WITH SAMPLE DATA
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing types if they exist
DROP TYPE IF EXISTS role_type CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payroll_status CASCADE;
DROP TYPE IF EXISTS campaign_type CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS loyalty_tier CASCADE;
DROP TYPE IF EXISTS membership_type CASCADE;

-- ENUMS
CREATE TYPE role_type AS ENUM ('admin', 'manager', 'receptionist', 'barber');
CREATE TYPE appointment_status AS ENUM ('confirmed', 'completed', 'in-progress', 'pending', 'no-show', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'partial');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'tap', 'gift');
CREATE TYPE payroll_status AS ENUM ('pending', 'approved', 'paid');
CREATE TYPE campaign_type AS ENUM ('sms', 'email');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'sent', 'completed', 'cancelled');
CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE membership_type AS ENUM ('none', 'basic', 'premium', 'vip');

-- ==========================================
-- 1. CORE CONFIGURATION & AUTH
-- ==========================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name role_type NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(module, action)
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

-- 2. USERS & STAFF
CREATE TABLE users (
    id UUID PRIMARY KEY,
    branch_id UUID REFERENCES branches(id),
    role_id UUID REFERENCES roles(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    commission_percent DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEMBERSHIPS & CLIENTS
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name membership_type NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    benefits JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    loyalty_tier loyalty_tier DEFAULT 'bronze',
    loyalty_points INTEGER DEFAULT 0,
    membership_type membership_type DEFAULT 'none',
    membership_expires_at TIMESTAMPTZ,
    preferred_barber_id UUID REFERENCES users(id),
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SERVICES & PRODUCTS
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    category_id UUID REFERENCES service_categories(id),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    commission_percent DECIMAL(5, 2) DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    category_id UUID REFERENCES product_categories(id),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    supplier VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APPOINTMENTS
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    client_id UUID REFERENCES clients(id),
    barber_id UUID REFERENCES users(id),
    service_id UUID REFERENCES services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status DEFAULT 'confirmed',
    deposit_amount DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SALES & POS
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    staff_id UUID REFERENCES users(id),
    appointment_id UUID REFERENCES appointments(id),
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    tip DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    status payment_status DEFAULT 'paid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    item_type VARCHAR(50) CHECK (item_type IN ('service', 'product')),
    item_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
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

-- 7. PAYROLL
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    service_revenue DECIMAL(10, 2) DEFAULT 0,
    commission_earned DECIMAL(10, 2) DEFAULT 0,
    tips DECIMAL(10, 2) DEFAULT 0,
    product_commission DECIMAL(10, 2) DEFAULT 0,
    booth_rent DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_payout DECIMAL(10, 2) NOT NULL,
    status payroll_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id)
);

-- 8. MARKETING
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    type campaign_type NOT NULL,
    audience VARCHAR(255),
    audience_filter JSONB,
    message TEXT NOT NULL,
    status campaign_status DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    converted_count INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT & LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SAMPLE DATA
-- ==========================================

-- Insert Branches
INSERT INTO branches (id, name, address, phone, email) VALUES
('b1111111-1111-1111-1111-111111111111', 'Downtown', '123 Main St, New York, NY 10001', '+1 (555) 100-0001', 'downtown@saloon.com'),
('b2222222-2222-2222-2222-222222222222', 'Midtown', '456 Park Ave, New York, NY 10022', '+1 (555) 100-0002', 'midtown@saloon.com'),
('b3333333-3333-3333-3333-333333333333', 'Brooklyn', '789 Atlantic Ave, Brooklyn, NY 11217', '+1 (555) 100-0003', 'brooklyn@saloon.com');

-- Insert Roles
INSERT INTO roles (name) VALUES
('admin'),
('manager'),
('receptionist'),
('barber');

-- Insert Permissions
INSERT INTO permissions (module, action, description) VALUES
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
('settings', 'edit', 'Edit settings');

-- Assign permissions to roles (Admin gets all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin';

-- Manager gets most except full settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'manager' AND p.module NOT IN ('settings');

-- Insert Users/Staff
INSERT INTO users (id, branch_id, role_id, full_name, email, phone, commission_percent) VALUES
('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM roles WHERE name = 'admin'), 'Admin User', 'admin@saloon.com', '+1 (555) 999-0001', 0),
('e2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM roles WHERE name = 'barber'), 'Jordan Blake', 'jordan@saloon.com', '+1 (555) 111-2222', 55),
('e3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM roles WHERE name = 'barber'), 'Alex Torres', 'alex@saloon.com', '+1 (555) 222-3333', 60),
('e4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM roles WHERE name = 'barber'), 'Sam Rivera', 'sam@saloon.com', '+1 (555) 333-4444', 50),
('e5555555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM roles WHERE name = 'barber'), 'Chris Morgan', 'chris@saloon.com', '+1 (555) 444-5555', 40),
('e6666666-6666-6666-6666-666666666666', 'b2222222-2222-2222-2222-222222222222', (SELECT id FROM roles WHERE name = 'barber'), 'Taylor Moore', 'taylor@saloon.com', '+1 (555) 555-6666', 55),
('e7777777-7777-7777-7777-777777777777', 'b3333333-3333-3333-3333-333333333333', (SELECT id FROM roles WHERE name = 'barber'), 'Jordan Cruz', 'jordanc@saloon.com', '+1 (555) 666-7777', 50);

-- Insert Memberships
INSERT INTO memberships (name, price, duration_days, benefits) VALUES
('none', 0, 0, '{}'),
('basic', 29.99, 30, '{"discount": "5%", "priority_booking": false}'),
('premium', 59.99, 30, '{"discount": "10%", "priority_booking": true, "free_products": 1}'),
('vip', 99.99, 30, '{"discount": "15%", "priority_booking": true, "free_products": 2, "free_service": 1}');

-- Insert Clients
INSERT INTO clients (id, branch_id, full_name, phone, email, loyalty_tier, membership_type, preferred_barber_id, total_visits, total_spent, last_visit_at) VALUES
('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Marcus Williams', '+1 (555) 234-5678', 'marcus@email.com', 'gold', 'premium', 'e2222222-2222-2222-2222-222222222222', 48, 2840, '2026-03-01'),
('c2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'DeShawn Carter', '+1 (555) 345-6789', 'deshawn@email.com', 'platinum', 'vip', 'e3333333-3333-3333-3333-333333333333', 72, 5120, '2026-03-02'),
('c3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'Tyler Johnson', '+1 (555) 456-7890', 'tyler@email.com', 'silver', 'basic', 'e2222222-2222-2222-2222-222222222222', 24, 1280, '2026-02-28'),
('c4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'Jordan Mitchell', '+1 (555) 567-8901', 'jordan@email.com', 'bronze', 'none', 'e4444444-4444-4444-4444-444444444444', 8, 320, '2026-02-20'),
('c5555555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', 'Elijah Washington', '+1 (555) 678-9012', 'elijah@email.com', 'gold', 'premium', 'e3333333-3333-3333-3333-333333333333', 36, 2160, '2026-03-01'),
('c6666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', 'Noah Thompson', '+1 (555) 789-0123', 'noah@email.com', 'silver', 'basic', 'e2222222-2222-2222-2222-222222222222', 18, 900, '2026-02-25'),
('c7777777-7777-7777-7777-777777777777', 'b1111111-1111-1111-1111-111111111111', 'Aiden Brooks', '+1 (555) 890-1234', 'aiden@email.com', 'platinum', 'vip', 'e4444444-4444-4444-4444-444444444444', 60, 4200, '2026-03-03'),
('c8888888-8888-8888-8888-888888888888', 'b1111111-1111-1111-1111-111111111111', 'Caleb Rogers', '+1 (555) 901-2345', 'caleb@email.com', 'bronze', 'none', 'e3333333-3333-3333-3333-333333333333', 4, 140, '2026-02-10');

-- Insert Service Categories
INSERT INTO service_categories (name) VALUES
('Haircut'),
('Beard'),
('Combo'),
('Shave'),
('Treatment');

-- Insert Services
INSERT INTO services (id, branch_id, category_id, name, price, duration_minutes, commission_percent) VALUES
('51111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Haircut'), 'Classic Cut', 45, 30, 50),
('52222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Haircut'), 'Master Fade', 65, 45, 50),
('53333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Haircut'), 'Premium Cut', 75, 60, 50),
('54444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Beard'), 'Beard Trim', 35, 30, 50),
('55555555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Beard'), 'Beard Sculpt', 50, 45, 50),
('56666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Combo'), 'Premium Cut + Beard', 85, 60, 50),
('57777777-7777-7777-7777-777777777777', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Combo'), 'Full Service', 120, 90, 50),
('58888888-8888-8888-8888-888888888888', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Shave'), 'Hot Towel Shave', 55, 45, 50),
('59999999-9999-9999-9999-999999999999', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Haircut'), 'Kids Cut', 30, 20, 50),
('50000000-AAAA-AAAA-AAAA-000000000000', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Haircut'), 'Line Up', 25, 20, 50),
('50000000-BBBB-BBBB-BBBB-000000000000', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Treatment'), 'Scalp Treatment', 40, 30, 50),
('50000000-CCCC-CCCC-CCCC-000000000000', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM service_categories WHERE name = 'Treatment'), 'Color Treatment', 95, 60, 50);

-- Insert Product Categories
INSERT INTO product_categories (name) VALUES
('Styling'),
('Beard Care'),
('Hair Care'),
('Shave'),
('Treatment');

-- Insert Products
INSERT INTO products (id, branch_id, category_id, name, sku, price, cost, stock_quantity, low_stock_threshold, supplier) VALUES
('f1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Styling'), 'Pomade - Strong Hold', 'STYLE-001', 24, 12, 48, 10, 'BarberCo'),
('f2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Beard Care'), 'Beard Oil - Cedar', 'BEARD-001', 32, 16, 7, 15, 'GroomPro'),
('f3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Styling'), 'Clay Wax - Matte', 'STYLE-002', 28, 14, 35, 10, 'BarberCo'),
('f4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Shave'), 'After Shave Balm', 'SHAVE-001', 36, 18, 4, 20, 'LuxGroom'),
('f5555555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Hair Care'), 'Shampoo - Premium', 'HAIR-001', 22, 11, 62, 15, 'GroomPro'),
('f6666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Hair Care'), 'Conditioner - Repair', 'HAIR-002', 24, 12, 44, 15, 'GroomPro'),
('f7777777-7777-7777-7777-777777777777', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Beard Care'), 'Beard Balm - Mint', 'BEARD-002', 28, 14, 3, 12, 'LuxGroom'),
('f8888888-8888-8888-8888-888888888888', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Styling'), 'Fade Spray', 'STYLE-003', 18, 9, 28, 10, 'BarberCo'),
('f9999999-9999-9999-9999-999999999999', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Treatment'), 'Scalp Serum', 'TREAT-001', 45, 22, 16, 8, 'LuxGroom'),
('f0000000-AAAA-AAAA-AAAA-000000000000', 'b1111111-1111-1111-1111-111111111111', (SELECT id FROM product_categories WHERE name = 'Treatment'), 'Charcoal Scrub', 'TREAT-002', 30, 15, 22, 10, 'LuxGroom');

-- Insert Appointments
INSERT INTO appointments (id, branch_id, client_id, barber_id, service_id, start_time, end_time, status) VALUES
('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', '56666666-6666-6666-6666-666666666666', '2026-03-03 09:00:00', '2026-03-03 10:00:00', 'confirmed'),
('a2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-333333333333', '52222222-2222-2222-2222-222222222222', '2026-03-03 09:30:00', '2026-03-03 10:15:00', 'confirmed'),
('a3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'e4444444-4444-4444-4444-444444444444', '51111111-1111-1111-1111-111111111111', '2026-03-03 10:00:00', '2026-03-03 10:30:00', 'completed'),
('a4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444', 'e2222222-2222-2222-2222-222222222222', '54444444-4444-4444-4444-444444444444', '2026-03-03 11:00:00', '2026-03-03 11:30:00', 'confirmed'),
('a5555555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'e3333333-3333-3333-3333-333333333333', '56666666-6666-6666-6666-666666666666', '2026-03-03 11:30:00', '2026-03-03 12:30:00', 'pending'),
('a6666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'e4444444-4444-4444-4444-444444444444', '51111111-1111-1111-1111-111111111111', '2026-03-03 12:00:00', '2026-03-03 12:30:00', 'in-progress'),
('a7777777-7777-7777-7777-777777777777', 'b1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'e2222222-2222-2222-2222-222222222222', '52222222-2222-2222-2222-222222222222', '2026-03-03 13:00:00', '2026-03-03 13:45:00', 'confirmed'),
('a8888888-8888-8888-8888-888888888888', 'b1111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777', 'e3333333-3333-3333-3333-333333333333', '57777777-7777-7777-7777-777777777777', '2026-03-03 14:00:00', '2026-03-03 15:30:00', 'confirmed'),
('a9999999-9999-9999-9999-999999999999', 'b1111111-1111-1111-1111-111111111111', 'c8888888-8888-8888-8888-888888888888', 'e5555555-5555-5555-5555-555555555555', '51111111-1111-1111-1111-111111111111', '2026-03-03 14:30:00', '2026-03-03 15:00:00', 'no-show');

-- Insert Sales
INSERT INTO sales (id, branch_id, invoice_number, client_id, staff_id, subtotal, discount, tax, tip, total, payment_method, status, created_at) VALUES
('5a1e1111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'INV-100238', 'c1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 110, 0, 8.50, 15, 133.50, 'card', 'paid', '2026-03-04 10:00:00'),
('5a1e2222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'INV-100239', 'c2222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-333333333333', 120, 0, 9.20, 20, 149.20, 'cash', 'paid', '2026-03-04 11:30:00'),
('5a1e3333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'INV-100240', 'c3333333-3333-3333-3333-333333333333', 'e4444444-4444-4444-4444-444444444444', 45, 0, 3.50, 6, 54.50, 'tap', 'paid', '2026-03-03 14:00:00'),
('5a1e4444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'INV-100241', 'c4444444-4444-4444-4444-444444444444', 'e2222222-2222-2222-2222-222222222222', 75, 0, 5.75, 12, 92.75, 'card', 'paid', '2026-03-02 15:30:00'),
('5a1e5555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', 'INV-100242', 'c5555555-5555-5555-5555-555555555555', 'e3333333-3333-3333-3333-333333333333', 120, 0, 9.20, 18, 147.20, 'card', 'paid', '2026-02-28 16:00:00');

-- Insert Sale Items
INSERT INTO sale_items (sale_id, item_type, item_id, item_name, quantity, price, commission_percent) VALUES
('5a1e1111-1111-1111-1111-111111111111', 'service', '53333333-3333-3333-3333-333333333333', 'Premium Cut', 1, 75, 50),
('5a1e1111-1111-1111-1111-111111111111', 'service', '54444444-4444-4444-4444-444444444444', 'Beard Trim', 1, 35, 50),
('5a1e2222-2222-2222-2222-222222222222', 'service', '52222222-2222-2222-2222-222222222222', 'Master Fade', 1, 65, 50),
('5a1e2222-2222-2222-2222-222222222222', 'service', '58888888-8888-8888-8888-888888888888', 'Hot Towel Shave', 1, 55, 50),
('5a1e3333-3333-3333-3333-333333333333', 'service', '51111111-1111-1111-1111-111111111111', 'Classic Cut', 1, 45, 50),
('5a1e4444-4444-4444-4444-444444444444', 'service', '55555555-5555-5555-5555-555555555555', 'Beard Sculpt', 1, 50, 50),
('5a1e4444-4444-4444-4444-444444444444', 'service', '50000000-AAAA-AAAA-AAAA-000000000000', 'Line Up', 1, 25, 50),
('5a1e5555-5555-5555-5555-555555555555', 'service', '57777777-7777-7777-7777-777777777777', 'Full Service', 1, 120, 50);

-- Insert Payments
INSERT INTO payments (sale_id, method, amount, transaction_ref) VALUES
('5a1e1111-1111-1111-1111-111111111111', 'card', 133.50, 'TXN-2026030401'),
('5a1e2222-2222-2222-2222-222222222222', 'cash', 149.20, NULL),
('5a1e3333-3333-3333-3333-333333333333', 'tap', 54.50, 'TXN-2026030302'),
('5a1e4444-4444-4444-4444-444444444444', 'card', 92.75, 'TXN-2026030203'),
('5a1e5555-5555-5555-5555-555555555555', 'card', 147.20, 'TXN-2026022804');

-- Insert Payroll Records
INSERT INTO payroll_records (staff_id, period_start, period_end, service_revenue, commission_earned, tips, product_commission, booth_rent, net_payout, status) VALUES
('e2222222-2222-2222-2222-222222222222', '2026-02-16', '2026-02-28', 4480, 2464, 640, 120, 0, 3224, 'pending'),
('e3333333-3333-3333-3333-333333333333', '2026-02-16', '2026-02-28', 5600, 3360, 840, 180, 0, 4380, 'pending'),
('e4444444-4444-4444-4444-444444444444', '2026-02-16', '2026-02-28', 3360, 1680, 480, 90, 0, 2250, 'approved'),
('e5555555-5555-5555-5555-555555555555', '2026-02-16', '2026-02-28', 1440, 576, 192, 40, 0, 808, 'pending');

-- Insert Marketing Campaigns
INSERT INTO campaigns (branch_id, name, type, audience, status, sent_count, opened_count, converted_count, revenue_generated, created_at) VALUES
('b1111111-1111-1111-1111-111111111111', 'Re-engagement - March', 'sms', 'Inactive 30 days', 'active', 284, 198, 67, 3350, '2026-03-01'),
('b1111111-1111-1111-1111-111111111111', 'VIP Spring Promo', 'email', 'VIP', 'completed', 128, 112, 44, 5280, '2026-02-20'),
('b1111111-1111-1111-1111-111111111111', 'New Service Launch', 'sms', 'All Clients', 'draft', 0, 0, 0, 0, '2026-03-10'),
('b1111111-1111-1111-1111-111111111111', 'Loyalty Points Bonus', 'email', 'Gold+', 'scheduled', 0, 0, 0, 0, '2026-03-05');

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-deduct inventory on sale
CREATE OR REPLACE FUNCTION deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.item_type = 'product' THEN
        UPDATE products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.item_id::UUID;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON sale_items
FOR EACH ROW EXECUTE FUNCTION deduct_inventory();

-- Function to update client stats after sale
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clients
    SET 
        total_visits = total_visits + 1,
        total_spent = total_spent + NEW.total,
        last_visit_at = NEW.created_at
    WHERE id = NEW.client_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_stats
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION update_client_stats();

-- Function for audit logging
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

CREATE TRIGGER trigger_sales_audit AFTER INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER trigger_refunds_audit AFTER INSERT ON refunds FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Dashboard revenue view
CREATE OR REPLACE VIEW daily_revenue AS
SELECT 
    DATE(created_at) as date,
    branch_id,
    COUNT(*) as transaction_count,
    SUM(total) as total_revenue,
    SUM(tip) as total_tips,
    AVG(total) as avg_transaction
FROM sales
WHERE status = 'paid'
GROUP BY DATE(created_at), branch_id;

-- Staff performance view
CREATE OR REPLACE VIEW staff_performance AS
SELECT 
    u.id as staff_id,
    u.full_name,
    u.branch_id,
    COUNT(DISTINCT s.id) as total_sales,
    SUM(s.total) as total_revenue,
    SUM(s.tip) as total_tips,
    AVG(s.total) as avg_sale
FROM users u
LEFT JOIN sales s ON s.staff_id = u.id AND s.status = 'paid'
WHERE u.role_id IN (SELECT id FROM roles WHERE name = 'barber')
GROUP BY u.id, u.full_name, u.branch_id;

-- Low stock products view
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
    p.*,
    pc.name as category_name
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
WHERE p.stock_quantity <= p.low_stock_threshold
  AND p.is_active = true
ORDER BY p.stock_quantity ASC;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Admin policy: full access
CREATE POLICY "admins_all_access" ON branches FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role_id IN (SELECT id FROM roles WHERE name = 'admin')
  )
);

-- Branch-based access for non-admins
CREATE POLICY "users_own_branch" ON users FOR SELECT
USING (
  branch_id = (SELECT branch_id FROM users WHERE id = auth.uid())
  OR id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name = 'admin'))
);

CREATE POLICY "clients_own_branch" ON clients FOR SELECT
USING (
  branch_id = (SELECT branch_id FROM users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name = 'admin'))
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, start_time);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_branch_date ON appointments(branch_id, start_time);
CREATE INDEX idx_sales_branch_date ON sales(branch_id, created_at);
CREATE INDEX idx_sales_staff ON sales(staff_id);
CREATE INDEX idx_sales_invoice ON sales(invoice_number);
CREATE INDEX idx_clients_branch ON clients(branch_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_branch ON products(branch_id);
CREATE INDEX idx_users_branch ON users(branch_id);

-- ==========================================
-- COMPLETE!
-- ==========================================
