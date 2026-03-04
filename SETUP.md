# Saloon POS & Management - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Supabase Database

1. **Create a Supabase account** at https://supabase.com
2. **Create a new project** (takes ~2 minutes)
3. **Get your credentials** from Project Settings > API:
   - Project URL
   - anon/public key

4. **Update .env file**:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

5. **Run the database schema**:
   - Open Supabase SQL Editor
   - Copy content from `supabase/schema.sql`
   - Paste and run
   - ✅ Done! You now have a complete database with sample data

📖 **Detailed guide**: See `supabase/README.md`

### Step 3: Run the Application

```bash
npm run dev
```

Open http://localhost:5173

### Step 4: Login

Use the branch selector to choose a location. The app works with or without Supabase:

- **With Supabase configured**: Uses real database
- **Without Supabase**: Uses mock data

## 📊 What's Included

### Database (Supabase)
- ✅ Complete schema with 15+ tables
- ✅ Sample data (8 clients, 7 staff, 9 appointments, 10 products)
- ✅ Row Level Security (RLS)
- ✅ Automatic inventory tracking
- ✅ Audit logging
- ✅ Performance indexes

### Sample Data Includes
- 3 Branches (Downtown, Midtown, Brooklyn)
- 7 Staff members with different roles & commissions
- 8 Clients with loyalty tiers and memberships
- 12 Services (haircuts, beard care, combos, treatments)
- 10 Products with stock levels
- 9 Pre-scheduled appointments
- 5 Completed sales/invoices
- 4 Marketing campaigns

### Features
- 📅 **Appointments**: Full calendar system with barber scheduling
- 💰 **POS**: Complete point of sale with inventory tracking
- 👥 **Clients**: CRM with loyalty tiers and memberships
- 👨‍💼 **Staff**: Team management with roles & permissions
- 💵 **Payroll**: Commission tracking and payment processing
- 📦 **Inventory**: Stock management with low-stock alerts
- 📧 **Marketing**: SMS/Email campaigns
- 📊 **Reports**: Revenue and performance analytics
- 🧾 **Invoices**: Complete invoice generation and management
- ⚙️ **Settings**: Business configuration

## 🔑 Key Files

- `supabase/schema.sql` - Complete database schema with sample data
- `supabase/README.md` - Detailed database documentation
- `src/app/lib/supabaseData.ts` - Data access layer
- `src/app/lib/supabase.ts` - Supabase client configuration
- `.env.example` - Environment variables template

## 🎯 Using the App

### Testing with Sample Data

The app comes with realistic sample data:

1. **Clients**: 8 clients with various loyalty tiers
2. **Appointments**: 9 scheduled for "today" (March 3, 2026)
3. **Products**: 10 products, some with low stock
4. **Sales**: 5 recent transactions with details

### Creating New Records

You can create new:
- Clients
- Appointments  
- Sales (POS transactions)
- Products
- Staff members
- Marketing campaigns

All are automatically saved to Supabase!

## 📱 Pages Overview

1. **Dashboard** - KPIs, revenue charts, today's schedule
2. **Appointments** - Calendar view, booking system
3. **POS** - Point of sale with cart and payment processing
4. **Invoices** - View and manage all transactions
5. **Clients** - Customer database with profiles
6. **Staff** - Team management and permissions
7. **Payroll** - Commission tracking and approval
8. **Inventory** - Product management and stock alerts
9. **Marketing** - Campaign builder and tracking
10. **Reports** - Analytics and insights
11. **Settings** - Business configuration

## 🔐 Roles & Permissions

The system includes 4 roles:

- **Admin**: Full access to everything
- **Manager**: Most features except system settings
- **Receptionist**: Appointments, POS, clients
- **Barber**: Own appointments, POS, client view

## 🚢 Deployment to Vercel

1. Push your code to GitHub
2. Connect GitHub repo to Vercel
3. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

Your app will be live with a full working database.

## 🛠 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Tech Stack

- **Frontend**: React + TypeScript  
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Build Tool**: Vite
- **Charts**: Recharts

## ❓ Troubleshooting

### App not showing data?

1. Check `.env` file has correct Supabase credentials
2. Verify schema was run successfully in Supabase
3. Check browser console for errors

### "Supabase not configured" warning?

- App will use mock data if Supabase is not set up
- This is normal and the app will work fine
- To use real database, complete Step 2 above

### Low stock not showing?

- Check `low_stock_threshold` values in products table
- Default threshold is 10-20 units

### Can't access certain pages?

- Check your user role and permissions
- Admin role required for payroll, settings

## 📚 Learn More

- [Supabase Documentation](https://supabase.com/docs)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

See LICENSE file for details.

---

**Need Help?** Check `supabase/README.md` for detailed database documentation.

**Ready to go?** Run `npm run dev` and start building! 🎉
