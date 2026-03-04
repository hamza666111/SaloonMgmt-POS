/**
 * Supabase Data Access Layer
 * Provides functions to fetch and manipulate data from Supabase
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { mockClients, mockStaff, mockAppointments, mockServices, mockProducts, mockInvoices, mockPayroll, mockCampaigns } from '../data/mockData';

// ==========================================
// CLIENTS
// ==========================================

export async function getClients(branchId?: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockClients;
  }

  try {
    let query = supabase
      .from('clients')
      .select(`
        *,
        preferred_barber:users!preferred_barber_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform to match mock data format
    return data?.map(client => ({
      id: client.id,
      name: client.full_name,
      phone: client.phone || '',
      email: client.email || '',
      loyalty: client.loyalty_tier || 'bronze',
      membership: client.membership_type || 'none',
      visits: client.total_visits || 0,
      spend: client.total_spent || 0,
      lastVisit: client.last_visit_at ? new Date(client.last_visit_at).toISOString().split('T')[0] : '',
      barber: client.preferred_barber?.full_name || 'Not assigned',
      avatar: client.full_name.split(' ').map(n => n[0]).join('')
    })) || [];
  } catch (error) {
    console.error('Error fetching clients:', error);
    return mockClients;
  }
}

export async function createClient(clientData: {
  full_name: string;
  phone: string;
  email?: string;
  branch_id: string;
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// STAFF
// ==========================================

export async function getStaff(branchId?: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockStaff;
  }

  try {
    let query = supabase
      .from('users')
      .select(`
        *,
        role:roles!role_id(name)
      `)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(staff => ({
      id: staff.id,
      name: staff.full_name,
      role: staff.role?.name || 'barber',
      status: staff.is_active ? 'Active' : 'Inactive',
      commission: staff.commission_percent || 0,
      phone: staff.phone || '',
      email: staff.email || '',
      avatar: staff.full_name.split(' ').map((n: string) => n[0]).join(''),
      // Mock values for stats (would need to calculate from sales in production)
      appointments: 0,
      revenue: 0,
      tips: 0,
      rating: 4.8,
      schedule: 'Mon-Sat'
    })) || [];
  } catch (error) {
    console.error('Error fetching staff:', error);
    return mockStaff;
  }
}

// ==========================================
// APPOINTMENTS
// ==========================================

export async function getAppointments(branchId?: string, date?: Date) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockAppointments;
  }

  try {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        client:clients(full_name),
        barber:users!barber_id(full_name),
        service:services(name, price, duration_minutes)
      `)
      .order('start_time', { ascending: true });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      query = query.gte('start_time', `${dateStr}T00:00:00`)
                   .lte('start_time', `${dateStr}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(appt => ({
      id: appt.id,
      client: appt.client?.full_name || 'Walk-in',
      barber: appt.barber?.full_name || '',
      service: appt.service?.name || '',
      time: new Date(appt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: appt.service?.duration_minutes || 30,
      status: appt.status,
      price: appt.service?.price || 0,
      date: new Date(appt.start_time).toISOString().split('T')[0],
      color: getBarberColor(appt.barber?.full_name || '')
    })) || [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return mockAppointments;
  }
}

export async function createAppointment(appointmentData: {
  branch_id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// SERVICES
// ==========================================

export async function getServices(branchId?: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockServices;
  }

  try {
    let query = supabase
      .from('services')
      .select(`
        *,
        category:service_categories(name)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(service => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration_minutes,
      category: service.category?.name || 'Other'
    })) || [];
  } catch (error) {
    console.error('Error fetching services:', error);
    return mockServices;
  }
}

// ==========================================
// PRODUCTS
// ==========================================

export async function getProducts(branchId?: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockProducts;
  }

  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock_quantity,
      category: product.category?.name || 'Other',
      sku: product.sku || '',
      supplier: product.supplier || '',
      reorderLevel: product.low_stock_threshold
    })) || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return mockProducts;
  }
}

// ==========================================
// SALES / INVOICES
// ==========================================

export async function getSales(branchId?: string, limit?: number) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockInvoices;
  }

  try {
    let query = supabase
      .from('sales')
      .select(`
        *,
        client:clients(full_name, phone),
        staff:users!staff_id(full_name, phone),
        sale_items(*)
      `)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(sale => ({
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customerName: sale.client?.full_name || 'Walk-in',
      customerPhone: sale.client?.phone || '',
      barberName: sale.staff?.full_name || '',
      barberPhone: sale.staff?.phone || '',
      services: sale.sale_items?.map((item: any) => ({
        name: item.item_name,
        price: item.price
      })) || [],
      total: sale.total,
      paymentMethod: sale.payment_method,
      date: new Date(sale.created_at).toISOString().split('T')[0]
    })) || [];
  } catch (error) {
    console.error('Error fetching sales:', error);
    return mockInvoices;
  }
}

export async function createSale(saleData: {
  branch_id: string;
  invoice_number: string;
  client_id?: string;
  staff_id: string;
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  payment_method: string;
  items: Array<{
    item_type: 'service' | 'product';
    item_id: string;
    item_name: string;
    quantity: number;
    price: number;
    commission_percent: number;
  }>;
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  // Insert sale
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      branch_id: saleData.branch_id,
      invoice_number: saleData.invoice_number,
      client_id: saleData.client_id,
      staff_id: saleData.staff_id,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      tax: saleData.tax,
      tip: saleData.tip,
      total: saleData.total,
      payment_method: saleData.payment_method,
      status: 'paid'
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // Insert sale items
  const saleItems = saleData.items.map(item => ({
    sale_id: sale.id,
    ...item
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems);

  if (itemsError) throw itemsError;

  return sale;
}

// ==========================================
// PAYROLL
// ==========================================

export async function getPayroll(branchId?: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockPayroll;
  }

  try {
    let query = supabase
      .from('payroll_records')
      .select(`
        *,
        staff:users!staff_id(full_name, commission_percent)
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(record => ({
      id: record.id,
      barber: record.staff?.full_name || '',
      serviceRevenue: record.service_revenue,
      commission: record.staff?.commission_percent || 0,
      commissionEarned: record.commission_earned,
      tips: record.tips,
      productCommission: record.product_commission,
      boothRent: record.booth_rent,
      deductions: record.deductions || 0,
      netPayout: record.net_payout,
      period: `${new Date(record.period_start).toLocaleDateString()} - ${new Date(record.period_end).toLocaleDateString()}`,
      status: record.status
    })) || [];
  } catch (error) {
    console.error('Error fetching payroll:', error);
    return mockPayroll;
  }
}

// ==========================================
// CAMPAIGNS
// ==========================================

export async function getCampaigns(branchId?: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using mock data');
    return mockCampaigns;
  }

  try {
    let query = supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type.toUpperCase(),
      status: campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1),
      sent: campaign.sent_count,
      opened: campaign.opened_count,
      converted: campaign.converted_count,
      revenue: campaign.revenue_generated,
      audience: campaign.audience || '',
      date: new Date(campaign.created_at).toISOString().split('T')[0]
    })) || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return mockCampaigns;
  }
}

// ==========================================
// DASHBOARD STATS
// ==========================================

export async function getDashboardStats(branchId: string) {
  if (!isSupabaseConfigured || !supabase) {
    // Return mock stats
    return {
      todayRevenue: 2340,
      todayAppointments: 24,
      walkInsWaiting: 3,
      weekRevenue: 12330,
      noShowRate: 4.2
    };
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's revenue
    const { data: todaySales } = await supabase
      .from('sales')
      .select('total')
      .eq('branch_id', branchId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .eq('status', 'paid');

    const todayRevenue = todaySales?.reduce((sum, sale) => sum + sale.total, 0) || 0;

    // Today's appointments
    const { count: todayAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`);

    return {
      todayRevenue,
      todayAppointments: todayAppointments || 0,
      walkInsWaiting: 3, // Would need separate tracking
      weekRevenue: 12330, // Would need calculation
      noShowRate: 4.2 // Would need calculation
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      todayRevenue: 0,
      todayAppointments: 0,
      walkInsWaiting: 0,
      weekRevenue: 0,
      noShowRate: 0
    };
  }
}

// ==========================================
// HELPERS
// ==========================================

function getBarberColor(barberName: string): string {
  const colors: Record<string, string> = {
    'Jordan Blake': '#2563EB',
    'Alex Torres': '#8b5cf6',
    'Sam Rivera': '#10b981',
    'Chris Morgan': '#f59e0b',
  };
  return colors[barberName] || '#6b7280';
}

// Generate unique invoice number
export function generateInvoiceNumber(): string {
  return `INV-${Date.now().toString().slice(-6)}`;
}
