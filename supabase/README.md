# Supabase Setup Guide

## Overview

This document explains how to set up and use the Supabase database for the Saloon POS & Management system.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Environment variables configured (.env file)

## Setup Instructions

### 1. Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter project details:
   - Name: `Saloon POS`
   - Database Password: (choose a strong password)
   - Region: (select closest to your location)
4. Wait for project to be created (~2 minutes)

### 2. Get Your Credentials

1. Go to Project Settings > API
2. Copy the following values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)

### 3. Configure Environment Variables

1. Open your `.env` file in the project root
2. Update with your credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire content of `supabase/schema.sql`
5. Paste it into the SQL editor
6. Click "Run" (or press Ctrl/Cmd + Enter)
7. Wait for execution to complete (~30 seconds)

This will:
- Create all tables (branches, users, clients, appointments, etc.)
- Set up relationships and constraints
- Insert sample data
- Create indexes for performance
- Set up triggers and functions
- Enable Row Level Security (RLS)

### 5. Verify Installation

Run these queries in the SQL Editor to verify:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check sample data
SELECT COUNT(*) as client_count FROM clients;
SELECT COUNT(*) as staff_count FROM users;
SELECT COUNT(*) as appointment_count FROM appointments;
SELECT COUNT(*) as sale_count FROM sales;
SELECT COUNT(*) as product_count FROM products;
```

You should see:
- 8 clients
- 7 staff members
- 9 appointments
- 5 sales
- 10 products

## Database Schema

### Core Tables

#### branches
Stores information about different saloon locations.

#### roles & permissions
Role-based access control system.

#### users
Staff members with roles and commission rates.

#### clients
Customer information with loyalty tiers and membership types.

#### services
Available services with pricing and duration.

#### products
Inventory items with stock tracking.

#### appointments
Scheduled appointments with barbers and services.

#### sales
Point of sale transactions.

#### sale_items
Line items for each sale.

#### payroll_records
Staff earnings and commissions.

#### campaigns
Marketing campaigns (SMS/Email).

### Key Features

#### 1. Automatic Inventory Deduction
When a product is sold, inventory is automatically reduced.

#### 2. Client Stats Updates
When a sale is completed, client's total visits and spending are updated.

#### 3. Audit Logging
All sales and refunds are automatically logged.

#### 4. Row Level Security (RLS)
Users can only access data from their branch (except admins).

#### 5. Performance Indexes
Optimized queries for common operations.

## Sample Data Included

### Branches
- Downtown
- Midtown  
- Brooklyn

### Staff (All at Downtown branch)
- Admin User (Admin)
- Jordan Blake (Barber, 55% commission)
- Alex Torres (Barber, 60% commission)
- Sam Rivera (Barber, 50% commission)
- Chris Morgan (Barber, 40% commission)

### Clients
- Marcus Williams (Gold, Premium)
- DeShawn Carter (Platinum, VIP)
- Tyler Johnson (Silver, Basic)
- Jordan Mitchell (Bronze, None)
- Elijah Washington (Gold, Premium)
- Noah Thompson (Silver, Basic)
- Aiden Brooks (Platinum, VIP)
- Caleb Rogers (Bronze, None)

### Services
12 services including:
- Classic Cut ($45, 30min)
- Master Fade ($65, 45min)
- Premium Cut ($75, 60min)
- Beard services
- Combo services
- Treatments

### Products
10 products including:
- Pomade - Strong Hold ($24)
- Beard Oil - Cedar ($32)
- Clay Wax - Matte ($28)
- After Shave Balm ($36)
- Shampoo - Premium ($22)
- And more...

## Using the Data in Your App

The app automatically detects if Supabase is configured:

1. **If configured**: Uses real Supabase data
2. **If not configured**: Falls back to mock data

### Data Access Layer

All database operations are handled through `src/app/lib/supabaseData.ts`:

```typescript
import { getClients, getAppointments, createSale } from '@/app/lib/supabaseData';

// Fetch clients
const clients = await getClients(branchId);

// Fetch appointments
const appointments = await getAppointments(branchId, new Date());

// Create a sale
const sale = await createSale({
  branch_id: branchId,
  invoice_number: 'INV-123456',
  staff_id: staffId,
  subtotal: 100,
  total: 115,
  payment_method: 'card',
  items: [...]
});
```

## Common Operations

### Add a New Client

```sql
INSERT INTO clients (branch_id, full_name, phone, email)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  'John Doe',
  '+1 (555) 123-4567',
  'john@email.com'
);
```

### Add a New Service

```sql
INSERT INTO services (branch_id, category_id, name, price, duration_minutes)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  (SELECT id FROM service_categories WHERE name = 'Haircut'),
  'Executive Cut',
  95,
  75
);
```

### Add a New Product

```sql
INSERT INTO products (
  branch_id, 
  category_id, 
  name, 
  sku, 
  price, 
  cost, 
  stock_quantity,
  low_stock_threshold,
  supplier
)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  (SELECT id FROM product_categories WHERE name = 'Styling'),
  'Hair Gel - Ultra Hold',
  'STYLE-004',
  26,
  13,
  50,
  10,
  'BarberCo'
);
```

### View Low Stock Products

```sql
SELECT * FROM low_stock_products;
```

### View Daily Revenue

```sql
SELECT * FROM daily_revenue
WHERE branch_id = 'b1111111-1111-1111-1111-111111111111'
ORDER BY date DESC
LIMIT 7;
```

### View Staff Performance

```sql
SELECT * FROM staff_performance
WHERE branch_id = 'b1111111-1111-1111-1111-111111111111'
ORDER BY total_revenue DESC;
```

## Security

### Row Level Security (RLS)

RLS is enabled for sensitive tables. Policies ensure:

1. **Admins**: Full access to all data
2. **Branch Staff**: Access only to their branch data
3. **Users**: Can view their own profile

### Authentication

Supabase Auth is used for user authentication.  To set up authentication:

1. Enable Email/Password authentication in Supabase dashboard
2. Add user emails in the Authentication section
3. Send magic links or set passwords

## Troubleshooting

### Error: "relation does not exist"

**Solution**: Run the schema.sql file again to create all tables.

### Error: "permission denied for table"

**Solution**: Check RLS policies or disable RLS temporarily:
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### No data showing in app

**Solution**: 
1. Check `.env` file has correct credentials
2. Verify tables have data: `SELECT COUNT(*) FROM clients;`
3. Check browser console for errors

### Low stock items not showing

**Solution**: Products with stock > low_stock_threshold won't show. Lower threshold or stock quantity.

## Deployment

When deploying to Vercel:

1. Go to your Vercel project settings
2. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Redeploy your application

## Backup & Restore

### Backup

```bash
# From Supabase dashboard
Project Settings > Database > Backup Settings
```

Or export tables:

```sql
COPY (SELECT * FROM clients) TO '/path/to/clients.csv' WITH CSV HEADER;
```

### Restore

Upload backup via Supabase dashboard or run SQL:

```sql
COPY clients FROM '/path/to/clients.csv' WITH CSV HEADER;
```

## Support

For issues:
1. Check Supabase logs in the dashboard
2. Review browser console errors
3. Check this README
4. Contact support

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run schema.sql
3. ✅ Configure .env
4. 📝 Customize sample data for your business
5. 🚀 Deploy to production
6. 📊 Monitor usage in Supabase dashboard

---

**Last Updated**: March 2026
**Version**: 1.0
