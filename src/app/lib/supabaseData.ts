import {
  branches as mockBranchList,
  mockAppointments,
  mockCampaigns,
  mockClients,
  mockInvoices,
  mockPayroll,
  mockProducts,
  mockServices,
  mockStaff,
  revenueData,
  servicePopularityData,
} from '../data/mockData';
import {
  enqueueOfflineMutation,
  getOfflineQueueCount,
  registerOfflineSync,
} from './offlineQueue';
import { handleSupabaseError, isSupabaseConfigured, supabase } from './supabase';

type PaymentMethod = 'cash' | 'card' | 'tap' | 'gift';

type AppointmentStatus =
  | 'confirmed'
  | 'completed'
  | 'in-progress'
  | 'pending'
  | 'no-show'
  | 'cancelled';

export type DashboardStats = {
  todayRevenue: number;
  todayAppointments: number;
  walkInsWaiting: number;
  weekRevenue: number;
  noShowRate: number;
};

export type UiBranch = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  isActive: boolean;
};

export type UiClient = {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyalty: string;
  membership: string;
  visits: number;
  spend: number;
  lastVisit: string;
  barber: string;
  avatar: string;
  branchId?: string;
};

export type UiStaff = {
  id: string;
  name: string;
  fullName: string;
  role: string;
  status: string;
  commission: number;
  commissionPercent: number;
  appointments: number;
  revenue: number;
  tips: number;
  avatar: string;
  rating: number;
  schedule: string;
  phone: string;
  email: string;
  branchId?: string;
};

export type UiService = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  commissionPercent?: number;
};

export type UiProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  supplier: string;
  reorderLevel: number;
  branchId?: string;
};

export type UiAppointment = {
  id: string;
  client: string;
  barber: string;
  service: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  price: number;
  color: string;
  date: string;
  notes?: string;
  branchId?: string;
  clientId?: string;
  barberId?: string;
  serviceId?: string;
};

export type UiInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  barberName: string;
  barberPhone: string;
  services: Array<{ name: string; price: number; quantity?: number }>;
  total: number;
  paymentMethod: string;
  date: string;
};

export type UiCampaign = {
  id: string;
  name: string;
  type: 'SMS' | 'Email';
  status: 'Active' | 'Completed' | 'Draft' | 'Scheduled';
  sent: number;
  opened: number;
  converted: number;
  revenue: number;
  audience: string;
  date: string;
};

export type UiPayroll = {
  id: string;
  barber: string;
  serviceRevenue: number;
  commission: number;
  commissionEarned: number;
  tips: number;
  productCommission: number;
  boothRent: number;
  deductions: number;
  netPayout: number;
  period: string;
  status: string;
};

export type CheckoutItem = {
  item_id?: string;
  id?: string;
  item_type?: 'service' | 'product';
  type?: 'service' | 'product';
  item_name?: string;
  name?: string;
  quantity?: number;
  price: number;
  commission_percent?: number;
};

export type CreateSaleInput = {
  branch_id?: string;
  invoice_number?: string;
  client_id?: string | null;
  customerName?: string;
  customerPhone?: string;
  staff_id?: string | null;
  barberName?: string;
  barberPhone?: string;
  appointment_id?: string | null;
  items?: CheckoutItem[];
  services?: Array<{ name: string; price: number; quantity?: number }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  tip?: number;
  total?: number;
  payment_method: PaymentMethod | 'giftcard';
  date?: string;
};

const STORAGE_KEYS = {
  clients: 'salon_clients',
  staff: 'salon_staff',
  appointments: 'salon_appointments',
  services: 'salon_services',
  products: 'salon_products',
  sales: 'salon_sales',
  campaigns: 'salon_campaigns',
  payroll: 'salon_payroll',
  branches: 'salon_branches',
  settings: 'salon_settings',
  rolePermissions: 'salon_role_permissions',
};

const NETWORK_ERROR_RE = /(network|offline|fetch|timeout|failed to fetch)/i;

const DEFAULT_BRANCHES: UiBranch[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'Downtown',
    address: '123 Main St, New York, NY 10001',
    isActive: true,
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'Midtown',
    address: '456 Park Ave, New York, NY 10022',
    isActive: true,
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    name: 'Brooklyn',
    address: '789 Atlantic Ave, Brooklyn, NY 11217',
    isActive: true,
  },
];

const LOCAL_ROLE_PERMISSIONS = {
  Manager: { dashboard: true, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: false, inventory: true, marketing: true, reports: true, settings: false },
  Admin: { dashboard: true, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: true, inventory: true, marketing: true, reports: true, settings: true },
  Receptionist: { dashboard: false, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: false, inventory: true, marketing: false, reports: false, settings: false },
  Barber: { dashboard: false, appointments: true, pos: true, invoices: false, clients: true, staff: false, payroll: false, inventory: false, marketing: false, reports: false, settings: false },
};

const memoryStore: Record<string, any[]> = {};
let syncInitialized = false;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function loadList<T>(key: string, fallback: T[]): T[] {
  const storage = getStorage();
  if (!storage) {
    if (!memoryStore[key]) {
      memoryStore[key] = clone(fallback as any[]);
    }
    return clone(memoryStore[key]) as T[];
  }

  const raw = storage.getItem(key);
  if (!raw) {
    const seeded = clone(fallback);
    storage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw) as T[];
  } catch {
    storage.setItem(key, JSON.stringify(fallback));
    return clone(fallback);
  }
}

function saveList<T>(key: string, data: T[]) {
  const storage = getStorage();
  if (!storage) {
    memoryStore[key] = clone(data as any[]);
    return;
  }
  storage.setItem(key, JSON.stringify(data));
}

function loadObject<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return clone(fallback);
  const raw = storage.getItem(key);
  if (!raw) {
    storage.setItem(key, JSON.stringify(fallback));
    return clone(fallback);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.setItem(key, JSON.stringify(fallback));
    return clone(fallback);
  }
}

function saveObject<T>(key: string, value: T) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function generateId(prefix = ''): string {
  const core = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}${core}`;
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part.trim()[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTitleCase(value?: string | null) {
  if (!value) return '';
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizePaymentMethod(method: string): PaymentMethod {
  if (method === 'giftcard' || method === 'gift') return 'gift';
  if (method === 'cash' || method === 'card' || method === 'tap') return method;
  return 'cash';
}

function formatTime(dateValue: string) {
  const date = new Date(dateValue);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(dateValue: string) {
  return new Date(dateValue).toISOString().split('T')[0];
}

function withinDays(dateStr: string, days: number) {
  const target = new Date(dateStr);
  const diffDays = (Date.now() - target.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

function isUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getBarberColor(barberName: string) {
  const colors: Record<string, string> = {
    'Jordan Blake': '#2563EB',
    'Alex Torres': '#8b5cf6',
    'Sam Rivera': '#10b981',
    'Chris Morgan': '#f59e0b',
  };
  return colors[barberName] || '#6b7280';
}

function hasRemote() {
  return Boolean(supabase && isSupabaseConfigured);
}

function shouldUseLocalReads() {
  if (!hasRemote()) return true;
  if (typeof navigator === 'undefined') return false;
  return !navigator.onLine;
}

function isNetworkLikeError(error: unknown) {
  const msg = handleSupabaseError(error).message;
  return NETWORK_ERROR_RE.test(msg);
}

async function resolveBranchId(branchId?: string) {
  if (branchId && isUuid(branchId)) return branchId;

  if (!hasRemote() || !supabase) {
    const localBranches = loadList<UiBranch>(
      STORAGE_KEYS.branches,
      DEFAULT_BRANCHES.length ? DEFAULT_BRANCHES : mockBranchList.map((item, index) => ({
        id: `branch-${index + 1}`,
        name: item.name,
        address: `${item.address}, ${item.city}`,
        isActive: true,
      })),
    );
    return localBranches[0]?.id;
  }

  const { data, error } = await supabase
    .from('branches')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(handleSupabaseError(error).message);
  return data?.id;
}

async function runMutationWithFallback<T>(
  action: string,
  payload: unknown,
  remoteFn: () => Promise<T>,
  localFn: () => Promise<T> | T,
) {
  initializeOfflineSync();

  if (!hasRemote()) {
    return await localFn();
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOfflineMutation(action, payload);
    return await localFn();
  }

  try {
    return await remoteFn();
  } catch (error) {
    if (isNetworkLikeError(error)) {
      enqueueOfflineMutation(action, payload);
      return await localFn();
    }
    throw new Error(handleSupabaseError(error).message);
  }
}

export function initializeOfflineSync() {
  if (syncInitialized || !hasRemote()) return;

  registerOfflineSync(
    {
      create_client: async payload => {
        await remoteCreateClient(payload as Parameters<typeof createClient>[0]);
      },
      update_client: async payload => {
        const typed = payload as { id: string; updates: Partial<UiClient> };
        await remoteUpdateClient(typed.id, typed.updates);
      },
      create_staff: async payload => {
        await remoteCreateStaff(payload as Parameters<typeof createStaff>[0]);
      },
      update_staff: async payload => {
        const typed = payload as { id: string; updates: any };
        await remoteUpdateStaff(typed.id, typed.updates);
      },
      delete_staff: async payload => {
        await remoteDeleteStaff(payload as { id: string });
      },
      create_appointment: async payload => {
        await remoteCreateAppointment(payload as Parameters<typeof createAppointment>[0]);
      },
      update_appointment_status: async payload => {
        const typed = payload as { id: string; status: AppointmentStatus };
        await remoteUpdateAppointmentStatus(typed.id, typed.status);
      },
      create_product: async payload => {
        await remoteCreateProduct(payload as Parameters<typeof createProduct>[0]);
      },
      update_product: async payload => {
        const typed = payload as { id: string; updates: Partial<UiProduct> };
        await remoteUpdateProduct(typed.id, typed.updates);
      },
      adjust_product_stock: async payload => {
        const typed = payload as { id: string; delta: number };
        await remoteAdjustProductStock(typed.id, typed.delta);
      },
      create_sale: async payload => {
        await remoteCreateSale(payload as CreateSaleInput);
      },
      process_refund: async payload => {
        await remoteProcessRefund(payload as Parameters<typeof processRefund>[0]);
      },
      create_campaign: async payload => {
        await remoteCreateCampaign(payload as Parameters<typeof createCampaign>[0]);
      },
      approve_payroll: async payload => {
        await remoteApprovePayroll(payload as { id: string });
      },
      upsert_settings: async payload => {
        const typed = payload as { branchId: string; settings: Record<string, any> };
        await remoteSaveSettings(typed.branchId, typed.settings);
      },
      upsert_role_permissions: async payload => {
        await remoteUpsertRolePermissions(payload as Parameters<typeof upsertRolePermissions>[0]);
      },
      create_branch: async payload => {
        await remoteCreateBranch(payload as Parameters<typeof createBranch>[0]);
      },
      update_branch: async payload => {
        const typed = payload as { id: string; updates: Partial<UiBranch> };
        await remoteUpdateBranch(typed.id, typed.updates);
      },
    },
    () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('saloon:offline-sync'));
      }
    },
  );

  syncInitialized = true;
}

export function getPendingSyncCount() {
  return getOfflineQueueCount();
}

function seedBranches() {
  return mockBranchList.map((item, index) => ({
    id: DEFAULT_BRANCHES[index]?.id || `branch-${index + 1}`,
    name: item.name,
    address: `${item.address}, ${item.city}`,
    isActive: true,
  })) as UiBranch[];
}

function seedStaff(): UiStaff[] {
  return mockStaff.map((staff, index) => ({
    id: staff.id,
    name: staff.name,
    fullName: staff.name,
    role: staff.role.toLowerCase().includes('admin')
      ? 'admin'
      : staff.role.toLowerCase().includes('manager')
        ? 'manager'
        : staff.role.toLowerCase().includes('reception')
          ? 'receptionist'
          : 'barber',
    status: staff.status,
    commission: staff.commission,
    commissionPercent: staff.commission,
    appointments: staff.appointments,
    revenue: staff.revenue,
    tips: staff.tips,
    avatar: staff.avatar,
    rating: staff.rating,
    schedule: staff.schedule,
    phone: staff.phone,
    email: staff.email,
    branchId: DEFAULT_BRANCHES[index % DEFAULT_BRANCHES.length]?.id,
  }));
}

function seedClients(): UiClient[] {
  return mockClients.map(client => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    loyalty: client.loyalty,
    membership: client.membership,
    visits: client.visits,
    spend: client.spend,
    lastVisit: client.lastVisit,
    barber: client.barber,
    avatar: client.avatar,
    branchId: DEFAULT_BRANCHES[0]?.id,
  }));
}

function seedAppointments(): UiAppointment[] {
  return mockAppointments.map(appointment => ({
    ...appointment,
    status: appointment.status as AppointmentStatus,
    branchId: DEFAULT_BRANCHES[0]?.id,
  }));
}

function seedServices(): UiService[] {
  return mockServices.map(service => ({
    ...service,
    duration: service.duration,
  }));
}

function seedProducts(): UiProduct[] {
  return mockProducts.map(product => ({
    ...product,
    reorderLevel: product.reorderLevel,
    branchId: DEFAULT_BRANCHES[0]?.id,
  }));
}

function seedInvoices(): UiInvoice[] {
  return mockInvoices.map(invoice => ({
    ...invoice,
  }));
}

function seedCampaigns(): UiCampaign[] {
  return mockCampaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    type: String(campaign.type).toUpperCase() === 'SMS' ? 'SMS' : 'Email',
    status: (['Active', 'Completed', 'Draft', 'Scheduled'].includes(campaign.status)
      ? campaign.status
      : 'Draft') as UiCampaign['status'],
    sent: safeNumber(campaign.sent),
    opened: safeNumber(campaign.opened),
    converted: safeNumber(campaign.converted),
    revenue: safeNumber(campaign.revenue),
    audience: campaign.audience,
    date: campaign.date,
  }));
}

function seedPayroll(): UiPayroll[] {
  return mockPayroll.map(row => ({
    ...row,
    status: row.status,
  }));
}

function mapClientRow(row: any, barberMap: Record<string, string>): UiClient {
  const barber = row.preferred_barber_id ? barberMap[row.preferred_barber_id] : '';
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone || '',
    email: row.email || '',
    loyalty: toTitleCase(row.loyalty_tier || 'bronze'),
    membership: toTitleCase(row.membership_type || 'none'),
    visits: safeNumber(row.total_visits),
    spend: safeNumber(row.total_spent),
    lastVisit: row.last_visit_at ? formatDate(row.last_visit_at) : todayIso(),
    barber: barber || 'Not assigned',
    avatar: getInitials(row.full_name || ''),
    branchId: row.branch_id,
  };
}

function mapServiceRow(row: any, categoryMap: Record<string, string>): UiService {
  return {
    id: row.id,
    name: row.name,
    price: safeNumber(row.price),
    duration: safeNumber(row.duration_minutes, 30),
    category: categoryMap[row.category_id] || 'General',
    commissionPercent: safeNumber(row.commission_percent, 50),
  };
}

function mapProductRow(row: any, categoryMap: Record<string, string>): UiProduct {
  return {
    id: row.id,
    name: row.name,
    price: safeNumber(row.price),
    stock: safeNumber(row.stock_quantity),
    category: categoryMap[row.category_id] || 'General',
    sku: row.sku || '',
    supplier: row.supplier || '',
    reorderLevel: safeNumber(row.low_stock_threshold, 10),
    branchId: row.branch_id,
  };
}

function mapAppointmentRow(
  row: any,
  clientMap: Record<string, string>,
  barberMap: Record<string, string>,
  serviceMap: Record<string, UiService>,
): UiAppointment {
  const service = serviceMap[row.service_id];
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  const duration = Math.max(5, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
  const barber = barberMap[row.barber_id] || 'Unassigned';

  return {
    id: row.id,
    client: clientMap[row.client_id] || 'Walk-in',
    barber,
    service: service?.name || 'Service',
    time: formatTime(row.start_time),
    duration,
    status: (row.status || 'confirmed') as AppointmentStatus,
    price: service?.price || 0,
    color: getBarberColor(barber),
    date: formatDate(row.start_time),
    notes: row.notes || '',
    branchId: row.branch_id,
    clientId: row.client_id,
    barberId: row.barber_id,
    serviceId: row.service_id,
  };
}

function aggregateAppointmentsByDay(appointments: UiAppointment[]) {
  const dayMap = new Map<string, { revenue: number; appointments: number }>();

  for (const item of appointments) {
    const key = item.date;
    const existing = dayMap.get(key) || { revenue: 0, appointments: 0 };
    existing.revenue += safeNumber(item.price);
    existing.appointments += 1;
    dayMap.set(key, existing);
  }

  return dayMap;
}

function defaultRoleName(roleLabel: string) {
  const normalized = roleLabel.toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'manager') return 'Manager';
  if (normalized === 'receptionist') return 'Receptionist';
  return 'Barber';
}

async function getRoleMapById() {
  if (!supabase) return {} as Record<string, string>;
  const { data, error } = await supabase.from('roles').select('id,name');
  if (error) throw new Error(handleSupabaseError(error).message);

  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.id] = String(row.name);
  }
  return map;
}

async function getRoleMapByName() {
  if (!supabase) return {} as Record<string, string>;
  const { data, error } = await supabase.from('roles').select('id,name');
  if (error) throw new Error(handleSupabaseError(error).message);

  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[String(row.name)] = row.id;
  }
  return map;
}

async function getServiceCategoryMap() {
  if (!supabase) return {} as Record<string, string>;
  const { data, error } = await supabase.from('service_categories').select('id,name');
  if (error) throw new Error(handleSupabaseError(error).message);
  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.id] = row.name;
  }
  return map;
}

async function getProductCategoryMap() {
  if (!supabase) return {} as Record<string, string>;
  const { data, error } = await supabase.from('product_categories').select('id,name');
  if (error) throw new Error(handleSupabaseError(error).message);
  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.id] = row.name;
  }
  return map;
}

async function ensureProductCategoryId(name: string) {
  if (!supabase) return null;
  const normalized = name.trim();
  const { data: existing, error: findError } = await supabase
    .from('product_categories')
    .select('id,name')
    .ilike('name', normalized)
    .maybeSingle();
  if (findError) throw new Error(handleSupabaseError(findError).message);
  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('product_categories')
    .insert({ name: normalized })
    .select('id')
    .single();
  if (createError) throw new Error(handleSupabaseError(createError).message);
  return created.id;
}

async function resolveClientId(clientId?: string | null, clientName?: string, branchId?: string) {
  if (!supabase) return null;
  if (clientId && isUuid(clientId)) return clientId;
  if (!clientName?.trim()) return null;

  let query = supabase
    .from('clients')
    .select('id')
    .ilike('full_name', clientName.trim())
    .limit(1);

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(handleSupabaseError(error).message);
  return data?.id || null;
}

async function resolveBarberId(barberId?: string | null, barberName?: string, branchId?: string) {
  if (!supabase) return null;
  if (barberId && isUuid(barberId)) return barberId;
  if (!barberName?.trim()) return null;

  let query = supabase
    .from('users')
    .select('id')
    .ilike('full_name', barberName.trim())
    .limit(1);

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(handleSupabaseError(error).message);
  return data?.id || null;
}

async function resolveServiceId(serviceId?: string | null, serviceName?: string, branchId?: string) {
  if (!supabase) return null;
  if (serviceId && isUuid(serviceId)) return serviceId;
  if (!serviceName?.trim()) return null;

  let query = supabase
    .from('services')
    .select('id')
    .ilike('name', serviceName.trim())
    .eq('is_active', true)
    .limit(1);

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(handleSupabaseError(error).message);
  return data?.id || null;
}

async function remoteGetBranches() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('branches')
    .select('id,name,address,phone,email,is_active')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    address: row.address || '',
    phone: row.phone || undefined,
    email: row.email || undefined,
    isActive: Boolean(row.is_active),
  })) as UiBranch[];
}

async function remoteCreateBranch(input: Omit<UiBranch, 'id'>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('branches')
    .insert({
      name: input.name.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      is_active: input.isActive,
    })
    .select('id,name,address,phone,email,is_active')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    address: data.address || '',
    phone: data.phone || undefined,
    email: data.email || undefined,
    isActive: Boolean(data.is_active),
  } as UiBranch;
}

async function remoteUpdateBranch(id: string, updates: Partial<UiBranch>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('branches')
    .update({
      name: updates.name,
      address: updates.address,
      phone: updates.phone,
      email: updates.email,
      is_active: updates.isActive,
    })
    .eq('id', id)
    .select('id,name,address,phone,email,is_active')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    address: data.address || '',
    phone: data.phone || undefined,
    email: data.email || undefined,
    isActive: Boolean(data.is_active),
  } as UiBranch;
}

async function remoteGetClients(branchId?: string) {
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase
    .from('clients')
    .select('id,branch_id,full_name,phone,email,loyalty_tier,membership_type,total_visits,total_spent,last_visit_at,preferred_barber_id')
    .order('created_at', { ascending: false });

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const barberIds = [...new Set((data || []).map(row => row.preferred_barber_id).filter(Boolean))] as string[];
  const barberMap: Record<string, string> = {};
  if (barberIds.length > 0) {
    const { data: barbers, error: barberError } = await supabase
      .from('users')
      .select('id,full_name')
      .in('id', barberIds);
    if (barberError) throw barberError;
    for (const row of barbers || []) {
      barberMap[row.id] = row.full_name;
    }
  }

  return (data || []).map(row => mapClientRow(row, barberMap));
}

async function remoteCreateClient(input: {
  name: string;
  phone: string;
  email?: string;
  branch_id?: string;
  branchId?: string;
  loyalty?: string;
  membership?: string;
  barberId?: string;
}) {
  if (!supabase) throw new Error('Supabase not configured');
  const branchId = await resolveBranchId(input.branch_id || input.branchId);

  const payload = {
    branch_id: branchId || null,
    full_name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    loyalty_tier: (input.loyalty || 'bronze').toLowerCase(),
    membership_type: (input.membership || 'none').toLowerCase(),
    preferred_barber_id: input.barberId || null,
  };

  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select('id,branch_id,full_name,phone,email,loyalty_tier,membership_type,total_visits,total_spent,last_visit_at,preferred_barber_id')
    .single();

  if (error) throw error;

  return mapClientRow(data, {});
}

async function remoteUpdateClient(id: string, updates: Partial<UiClient>) {
  if (!supabase) throw new Error('Supabase not configured');

  const payload: Record<string, any> = {};
  if (typeof updates.name === 'string') payload.full_name = updates.name;
  if (typeof updates.phone === 'string') payload.phone = updates.phone;
  if (typeof updates.email === 'string') payload.email = updates.email;
  if (typeof updates.loyalty === 'string') payload.loyalty_tier = updates.loyalty.toLowerCase();
  if (typeof updates.membership === 'string') payload.membership_type = updates.membership.toLowerCase();
  if (typeof updates.visits === 'number') payload.total_visits = updates.visits;
  if (typeof updates.spend === 'number') payload.total_spent = updates.spend;

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select('id,branch_id,full_name,phone,email,loyalty_tier,membership_type,total_visits,total_spent,last_visit_at,preferred_barber_id')
    .single();

  if (error) throw error;
  return mapClientRow(data, {});
}

async function remoteGetStaff(branchId?: string) {
  if (!supabase) throw new Error('Supabase not configured');

  const roleMap = await getRoleMapById();

  let query = supabase
    .from('users')
    .select('id,branch_id,role_id,full_name,email,phone,commission_percent,is_active')
    .order('created_at', { ascending: false });

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data: users, error: userError } = await query;
  if (userError) throw userError;

  const staffIds = (users || []).map(row => row.id);

  let salesRows: any[] = [];
  if (staffIds.length > 0) {
    let salesQuery = supabase
      .from('sales')
      .select('staff_id,total,tip,status,branch_id')
      .in('staff_id', staffIds)
      .eq('status', 'paid');

    if (branchId && isUuid(branchId)) {
      salesQuery = salesQuery.eq('branch_id', branchId);
    }

    const { data, error } = await salesQuery;
    if (error) throw error;
    salesRows = data || [];
  }

  let appointmentRows: any[] = [];
  if (staffIds.length > 0) {
    let appointmentQuery = supabase
      .from('appointments')
      .select('barber_id,branch_id')
      .in('barber_id', staffIds);

    if (branchId && isUuid(branchId)) {
      appointmentQuery = appointmentQuery.eq('branch_id', branchId);
    }

    const { data, error } = await appointmentQuery;
    if (error) throw error;
    appointmentRows = data || [];
  }

  const salesByStaff = new Map<string, { revenue: number; tips: number }>();
  for (const sale of salesRows) {
    const stats = salesByStaff.get(sale.staff_id) || { revenue: 0, tips: 0 };
    stats.revenue += safeNumber(sale.total);
    stats.tips += safeNumber(sale.tip);
    salesByStaff.set(sale.staff_id, stats);
  }

  const apptByStaff = new Map<string, number>();
  for (const appt of appointmentRows) {
    apptByStaff.set(appt.barber_id, (apptByStaff.get(appt.barber_id) || 0) + 1);
  }

  return (users || []).map(row => {
    const role = roleMap[row.role_id] || 'barber';
    const roleLabel = String(role).toLowerCase();
    const sales = salesByStaff.get(row.id) || { revenue: 0, tips: 0 };
    const appointments = apptByStaff.get(row.id) || 0;

    return {
      id: row.id,
      name: row.full_name,
      fullName: row.full_name,
      role: roleLabel,
      status: row.is_active ? 'Active' : 'Inactive',
      commission: safeNumber(row.commission_percent),
      commissionPercent: safeNumber(row.commission_percent),
      appointments,
      revenue: sales.revenue,
      tips: sales.tips,
      avatar: getInitials(row.full_name),
      rating: 4.8,
      schedule: 'N/A',
      phone: row.phone || '',
      email: row.email || '',
      branchId: row.branch_id,
    } as UiStaff;
  });
}

async function remoteCreateStaff(input: {
  fullName: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'receptionist' | 'barber';
  branchId?: string;
  commissionPercent?: number;
}) {
  if (!supabase) throw new Error('Supabase not configured');
  const roleMap = await getRoleMapByName();
  const roleId = roleMap[input.role] || roleMap.barber;
  const branchId = await resolveBranchId(input.branchId);

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: generateId('u-'),
      branch_id: branchId || null,
      role_id: roleId,
      full_name: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      commission_percent: safeNumber(input.commissionPercent),
      is_active: true,
    })
    .select('id,branch_id,role_id,full_name,email,phone,commission_percent,is_active')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.full_name,
    fullName: data.full_name,
    role: input.role,
    status: 'Active',
    commission: safeNumber(data.commission_percent),
    commissionPercent: safeNumber(data.commission_percent),
    appointments: 0,
    revenue: 0,
    tips: 0,
    avatar: getInitials(data.full_name),
    rating: 4.8,
    schedule: 'N/A',
    phone: data.phone || '',
    email: data.email || '',
    branchId: data.branch_id,
  } as UiStaff;
}

async function remoteUpdateStaff(id: string, updates: Partial<UiStaff>) {
  if (!supabase) throw new Error('Supabase not configured');
  const roleMap = await getRoleMapByName();

  const payload: Record<string, any> = {
    full_name: updates.fullName || updates.name,
    email: updates.email,
    phone: updates.phone,
    commission_percent: updates.commissionPercent,
    is_active: updates.status ? updates.status.toLowerCase() === 'active' : undefined,
  };

  if (updates.role) {
    payload.role_id = roleMap[String(updates.role).toLowerCase()] || undefined;
  }

  if (updates.branchId) {
    payload.branch_id = updates.branchId;
  }

  const { error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

async function remoteDeleteStaff(input: { id: string }) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', input.id);

  if (error) throw error;
}

async function remoteGetServices(branchId?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const categoryMap = await getServiceCategoryMap();

  let query = supabase
    .from('services')
    .select('id,branch_id,category_id,name,price,duration_minutes,commission_percent,is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => mapServiceRow(row, categoryMap));
}

async function remoteGetProducts(branchId?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const categoryMap = await getProductCategoryMap();

  let query = supabase
    .from('products')
    .select('id,branch_id,category_id,name,sku,price,cost,stock_quantity,low_stock_threshold,supplier,is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => mapProductRow(row, categoryMap));
}

async function remoteCreateProduct(input: {
  name: string;
  price: string | number;
  stock: string | number;
  category: string;
  supplier?: string;
  sku?: string;
  reorderLevel?: string | number;
  branchId?: string;
}) {
  if (!supabase) throw new Error('Supabase not configured');
  const branchId = await resolveBranchId(input.branchId);
  const categoryId = await ensureProductCategoryId(input.category || 'General');

  const payload = {
    branch_id: branchId || null,
    category_id: categoryId,
    name: input.name.trim(),
    sku: input.sku?.trim() || `${input.name.trim().slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    price: safeNumber(input.price),
    cost: Math.max(0, safeNumber(input.price) * 0.5),
    stock_quantity: safeNumber(input.stock),
    low_stock_threshold: safeNumber(input.reorderLevel, 10),
    supplier: input.supplier?.trim() || null,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('id,branch_id,category_id,name,sku,price,cost,stock_quantity,low_stock_threshold,supplier,is_active')
    .single();

  if (error) throw error;

  return mapProductRow(data, { [categoryId || '']: input.category || 'General' });
}

async function remoteUpdateProduct(id: string, updates: Partial<UiProduct>) {
  if (!supabase) throw new Error('Supabase not configured');

  const payload: Record<string, any> = {};
  if (typeof updates.name === 'string') payload.name = updates.name;
  if (typeof updates.price === 'number') payload.price = updates.price;
  if (typeof updates.sku === 'string') payload.sku = updates.sku;
  if (typeof updates.stock === 'number') payload.stock_quantity = updates.stock;
  if (typeof updates.reorderLevel === 'number') payload.low_stock_threshold = updates.reorderLevel;
  if (typeof updates.supplier === 'string') payload.supplier = updates.supplier;
  if (typeof updates.branchId === 'string') payload.branch_id = updates.branchId;

  if (typeof updates.category === 'string' && updates.category.trim()) {
    payload.category_id = await ensureProductCategoryId(updates.category);
  }

  const { error } = await supabase.from('products').update(payload).eq('id', id);
  if (error) throw error;
}

async function remoteAdjustProductStock(id: string, delta: number) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id,stock_quantity')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const nextValue = Math.max(0, safeNumber(product.stock_quantity) + delta);
  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: nextValue })
    .eq('id', id);

  if (error) throw error;
}

async function remoteGetAppointments(branchId?: string, date?: Date) {
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase
    .from('appointments')
    .select('id,branch_id,client_id,barber_id,service_id,start_time,end_time,status,notes')
    .order('start_time', { ascending: true });

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    query = query
      .gte('start_time', start.toISOString())
      .lt('start_time', end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const clientIds = [...new Set(rows.map(row => row.client_id).filter(Boolean))] as string[];
  const barberIds = [...new Set(rows.map(row => row.barber_id).filter(Boolean))] as string[];
  const serviceIds = [...new Set(rows.map(row => row.service_id).filter(Boolean))] as string[];

  const clientMap: Record<string, string> = {};
  const barberMap: Record<string, string> = {};
  const serviceMap: Record<string, UiService> = {};

  if (clientIds.length > 0) {
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id,full_name')
      .in('id', clientIds);
    if (clientError) throw clientError;
    for (const row of clients || []) {
      clientMap[row.id] = row.full_name;
    }
  }

  if (barberIds.length > 0) {
    const { data: barbers, error: barberError } = await supabase
      .from('users')
      .select('id,full_name')
      .in('id', barberIds);
    if (barberError) throw barberError;
    for (const row of barbers || []) {
      barberMap[row.id] = row.full_name;
    }
  }

  if (serviceIds.length > 0) {
    const categoryMap = await getServiceCategoryMap();
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id,category_id,name,price,duration_minutes,commission_percent')
      .in('id', serviceIds);
    if (serviceError) throw serviceError;

    for (const row of services || []) {
      serviceMap[row.id] = mapServiceRow(row, categoryMap);
    }
  }

  return rows.map(row => mapAppointmentRow(row, clientMap, barberMap, serviceMap));
}

async function remoteCreateAppointment(input: {
  branch_id?: string;
  client_id?: string;
  client_name?: string;
  barber_id?: string;
  barber_name?: string;
  service_id?: string;
  service?: string;
  service_name?: string;
  date: string;
  time: string;
  duration?: number;
  status?: AppointmentStatus;
  price?: number;
  notes?: string;
}) {
  if (!supabase) throw new Error('Supabase not configured');
  const branchId = await resolveBranchId(input.branch_id);
  const clientId = await resolveClientId(input.client_id, input.client_name, branchId);
  const barberId = await resolveBarberId(input.barber_id, input.barber_name, branchId);
  const serviceId = await resolveServiceId(input.service_id, input.service_name || input.service, branchId);

  if (!barberId) {
    throw new Error('Barber is required');
  }

  if (!serviceId) {
    throw new Error('Service is required');
  }

  const start = new Date(`${input.date}T${input.time}:00`);
  const duration = safeNumber(input.duration, 30);
  const end = new Date(start.getTime() + duration * 60_000);

  const { data: conflicts, error: conflictError } = await supabase
    .from('appointments')
    .select('id')
    .eq('barber_id', barberId)
    .in('status', ['confirmed', 'pending', 'in-progress'])
    .lt('start_time', end.toISOString())
    .gt('end_time', start.toISOString())
    .limit(1);

  if (conflictError) throw conflictError;
  if ((conflicts || []).length > 0) {
    throw new Error('Selected barber already has an appointment in that time slot');
  }

  const payload = {
    branch_id: branchId || null,
    client_id: clientId,
    barber_id: barberId,
    service_id: serviceId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: input.status || 'confirmed',
    notes: input.notes || null,
  };

  const { error } = await supabase.from('appointments').insert(payload);
  if (error) throw error;

  const appts = await remoteGetAppointments(branchId || undefined, start);
  const created = appts.find(item => item.time === formatTime(start.toISOString()) && item.barberId === barberId && item.serviceId === serviceId);
  if (!created) {
    throw new Error('Appointment created but could not be loaded');
  }
  return created;
}

async function remoteUpdateAppointmentStatus(id: string, status: AppointmentStatus) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

async function remoteGetSales(branchId?: string, limit?: number) {
  if (!supabase) throw new Error('Supabase not configured');

  let salesQuery = supabase
    .from('sales')
    .select('id,branch_id,invoice_number,client_id,staff_id,total,payment_method,created_at')
    .order('created_at', { ascending: false });

  if (branchId && isUuid(branchId)) {
    salesQuery = salesQuery.eq('branch_id', branchId);
  }

  if (limit && limit > 0) {
    salesQuery = salesQuery.limit(limit);
  }

  const { data: sales, error: salesError } = await salesQuery;
  if (salesError) throw salesError;

  const saleRows = sales || [];
  const saleIds = saleRows.map(row => row.id);
  const clientIds = [...new Set(saleRows.map(row => row.client_id).filter(Boolean))] as string[];
  const staffIds = [...new Set(saleRows.map(row => row.staff_id).filter(Boolean))] as string[];

  const clientMap: Record<string, { name: string; phone: string }> = {};
  if (clientIds.length > 0) {
    const { data, error } = await supabase
      .from('clients')
      .select('id,full_name,phone')
      .in('id', clientIds);
    if (error) throw error;
    for (const row of data || []) {
      clientMap[row.id] = { name: row.full_name, phone: row.phone || '' };
    }
  }

  const staffMap: Record<string, { name: string; phone: string }> = {};
  if (staffIds.length > 0) {
    const { data, error } = await supabase
      .from('users')
      .select('id,full_name,phone')
      .in('id', staffIds);
    if (error) throw error;
    for (const row of data || []) {
      staffMap[row.id] = { name: row.full_name, phone: row.phone || '' };
    }
  }

  const itemMap: Record<string, Array<{ name: string; price: number; quantity: number }>> = {};
  if (saleIds.length > 0) {
    const { data, error } = await supabase
      .from('sale_items')
      .select('sale_id,item_name,price,quantity')
      .in('sale_id', saleIds);
    if (error) throw error;

    for (const item of data || []) {
      if (!itemMap[item.sale_id]) itemMap[item.sale_id] = [];
      itemMap[item.sale_id].push({
        name: item.item_name,
        price: safeNumber(item.price),
        quantity: safeNumber(item.quantity, 1),
      });
    }
  }

  return saleRows.map(row => {
    const client = row.client_id ? clientMap[row.client_id] : undefined;
    const staff = row.staff_id ? staffMap[row.staff_id] : undefined;

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      customerName: client?.name || 'Walk-in',
      customerPhone: client?.phone || '',
      barberName: staff?.name || 'Front Desk',
      barberPhone: staff?.phone || '',
      services: itemMap[row.id] || [],
      total: safeNumber(row.total),
      paymentMethod: normalizePaymentMethod(row.payment_method),
      date: formatDate(row.created_at),
    } as UiInvoice;
  });
}

function calculateTotalsFromItems(input: CreateSaleInput, normalizedItems: Array<{ item_id: string; item_type: 'service' | 'product'; item_name: string; quantity: number; price: number; commission_percent: number }>) {
  const subtotal = input.subtotal ?? normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = safeNumber(input.discount, 0);
  const tax = safeNumber(input.tax, 0);
  const tip = safeNumber(input.tip, 0);
  const total = input.total ?? Math.max(0, subtotal - discount + tax + tip);

  return { subtotal, discount, tax, tip, total };
}

function normalizeSaleItems(input: CreateSaleInput) {
  const sourceItems: Array<Record<string, any>> = input.items && input.items.length > 0
    ? (input.items as Array<Record<string, any>>)
    : (input.services || []).map(service => ({
      item_type: 'service',
      item_name: service.name,
      quantity: service.quantity || 1,
      price: service.price,
    }));

  return sourceItems.map(item => {
    const itemType = (item?.item_type || item?.type || 'service') as 'service' | 'product';
    return {
      item_id: item?.item_id || item?.id || generateId('item-'),
      item_type: itemType,
      item_name: item?.item_name || item?.name || 'Item',
      quantity: Math.max(1, safeNumber(item?.quantity, 1)),
      price: safeNumber(item?.price),
      commission_percent: safeNumber(item?.commission_percent, itemType === 'product' ? 10 : 50),
    };
  });
}

async function remoteCreateSale(input: CreateSaleInput) {
  if (!supabase) throw new Error('Supabase not configured');

  const branchId = await resolveBranchId(input.branch_id);
  const items = normalizeSaleItems(input);

  if (items.length === 0) {
    throw new Error('At least one item is required');
  }

  const productItems = items.filter(item => item.item_type === 'product' && isUuid(item.item_id));
  if (productItems.length > 0) {
    const productIds = [...new Set(productItems.map(item => item.item_id))];
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id,name,stock_quantity')
      .in('id', productIds);

    if (productError) throw productError;

    const stockMap = new Map((products || []).map(row => [row.id, safeNumber(row.stock_quantity)]));

    for (const item of productItems) {
      const available = stockMap.get(item.item_id) ?? 0;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for ${item.item_name}`);
      }
    }
  }

  const clientId = await resolveClientId(input.client_id, input.customerName, branchId);
  const staffId = await resolveBarberId(input.staff_id, input.barberName, branchId);

  const totals = calculateTotalsFromItems(input, items);

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      branch_id: branchId || null,
      invoice_number: input.invoice_number || generateInvoiceNumber(),
      client_id: clientId,
      staff_id: staffId,
      appointment_id: input.appointment_id || null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      tip: totals.tip,
      total: totals.total,
      payment_method: normalizePaymentMethod(input.payment_method),
      status: 'paid',
      created_at: input.date ? `${input.date}T12:00:00.000Z` : undefined,
    })
    .select('id,invoice_number,total,payment_method,created_at')
    .single();

  if (saleError) throw saleError;

  const lineItems = items.map(item => ({
    sale_id: sale.id,
    item_type: item.item_type,
    item_id: item.item_id,
    item_name: item.item_name,
    quantity: item.quantity,
    price: item.price,
    commission_percent: item.commission_percent,
  }));

  const { error: itemsError } = await supabase.from('sale_items').insert(lineItems);
  if (itemsError) throw itemsError;

  const { error: paymentError } = await supabase.from('payments').insert({
    sale_id: sale.id,
    method: normalizePaymentMethod(input.payment_method),
    amount: totals.total,
  });
  if (paymentError) throw paymentError;

  for (const item of productItems) {
    const { data: product, error: fetchProductError } = await supabase
      .from('products')
      .select('id,stock_quantity')
      .eq('id', item.item_id)
      .single();

    if (fetchProductError) throw fetchProductError;

    const { error: updateProductError } = await supabase
      .from('products')
      .update({ stock_quantity: Math.max(0, safeNumber(product.stock_quantity) - item.quantity) })
      .eq('id', item.item_id);

    if (updateProductError) throw updateProductError;
  }

  if (clientId) {
    const { data: client, error: clientFetchError } = await supabase
      .from('clients')
      .select('id,total_visits,total_spent')
      .eq('id', clientId)
      .single();
    if (clientFetchError) throw clientFetchError;

    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({
        total_visits: safeNumber(client.total_visits) + 1,
        total_spent: safeNumber(client.total_spent) + totals.total,
        last_visit_at: sale.created_at,
      })
      .eq('id', clientId);

    if (clientUpdateError) throw clientUpdateError;
  }

  const invoices = await remoteGetSales(branchId || undefined, 20);
  const created = invoices.find(invoice => invoice.id === sale.id);
  if (!created) {
    throw new Error('Sale created but invoice could not be loaded');
  }
  return created;
}

async function remoteProcessRefund(input: {
  sale_id: string;
  amount: number;
  reason?: string;
  approved_by?: string;
}) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('id,total,status')
    .eq('id', input.sale_id)
    .single();
  if (saleError) throw saleError;

  const { data: refunds, error: refundFetchError } = await supabase
    .from('refunds')
    .select('amount')
    .eq('sale_id', input.sale_id);
  if (refundFetchError) throw refundFetchError;

  const refundedTotal = (refunds || []).reduce((sum, row) => sum + safeNumber(row.amount), 0);
  const remaining = Math.max(0, safeNumber(sale.total) - refundedTotal);

  if (input.amount <= 0 || input.amount > remaining) {
    throw new Error('Invalid refund amount');
  }

  const { error: refundError } = await supabase
    .from('refunds')
    .insert({
      sale_id: input.sale_id,
      amount: input.amount,
      reason: input.reason || null,
      approved_by: input.approved_by || null,
    });
  if (refundError) throw refundError;

  const nextStatus = input.amount === safeNumber(sale.total) ? 'refunded' : 'partial';
  const { error: updateError } = await supabase
    .from('sales')
    .update({ status: nextStatus })
    .eq('id', input.sale_id);
  if (updateError) throw updateError;
}

async function remoteGetPayroll(branchId?: string) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: payrollRows, error: payrollError } = await supabase
    .from('payroll_records')
    .select('id,staff_id,period_start,period_end,service_revenue,commission_earned,tips,product_commission,booth_rent,deductions,net_payout,status')
    .order('period_end', { ascending: false });

  if (payrollError) throw payrollError;

  const staffIds = [...new Set((payrollRows || []).map(row => row.staff_id).filter(Boolean))] as string[];

  const staffMap: Record<string, { name: string; branchId?: string }> = {};
  if (staffIds.length > 0) {
    const { data: staffRows, error: staffError } = await supabase
      .from('users')
      .select('id,full_name,branch_id')
      .in('id', staffIds);
    if (staffError) throw staffError;
    for (const row of staffRows || []) {
      staffMap[row.id] = { name: row.full_name, branchId: row.branch_id };
    }
  }

  const mapped = (payrollRows || []).map(row => {
    const staff = staffMap[row.staff_id] || { name: 'Unknown', branchId: undefined };
    return {
      id: row.id,
      barber: staff.name,
      serviceRevenue: safeNumber(row.service_revenue),
      commission: 0,
      commissionEarned: safeNumber(row.commission_earned),
      tips: safeNumber(row.tips),
      productCommission: safeNumber(row.product_commission),
      boothRent: safeNumber(row.booth_rent),
      deductions: safeNumber(row.deductions),
      netPayout: safeNumber(row.net_payout),
      period: `${row.period_start} - ${row.period_end}`,
      status: toTitleCase(row.status),
      branchId: staff.branchId,
    } as UiPayroll & { branchId?: string };
  });

  if (branchId && isUuid(branchId)) {
    return mapped.filter(item => (item as any).branchId === branchId).map(item => {
      const { branchId: _branchId, ...rest } = item as any;
      return rest as UiPayroll;
    });
  }

  return mapped.map(item => {
    const { branchId: _branchId, ...rest } = item as any;
    return rest as UiPayroll;
  });
}

async function remoteApprovePayroll(payload: { id: string }) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('payroll_records')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: null })
    .eq('id', payload.id);
  if (error) throw error;
}

async function remoteGetCampaigns(branchId?: string) {
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase
    .from('campaigns')
    .select('id,branch_id,name,type,audience,status,sent_count,opened_count,converted_count,revenue_generated,created_at')
    .order('created_at', { ascending: false });

  if (branchId && isUuid(branchId)) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    type: String(row.type).toUpperCase() === 'SMS' ? 'SMS' : 'Email',
    status: toTitleCase(row.status) as UiCampaign['status'],
    sent: safeNumber(row.sent_count),
    opened: safeNumber(row.opened_count),
    converted: safeNumber(row.converted_count),
    revenue: safeNumber(row.revenue_generated),
    audience: row.audience || 'All Clients',
    date: formatDate(row.created_at),
  } as UiCampaign));
}

async function remoteCreateCampaign(input: {
  branch_id?: string;
  name: string;
  type: 'SMS' | 'Email';
  audience: string;
  message: string;
  status?: 'Draft' | 'Scheduled' | 'Active' | 'Completed';
}) {
  if (!supabase) throw new Error('Supabase not configured');
  const branchId = await resolveBranchId(input.branch_id);

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      branch_id: branchId || null,
      name: input.name.trim(),
      type: input.type.toLowerCase(),
      audience: input.audience,
      message: input.message,
      status: (input.status || 'Draft').toLowerCase(),
    })
    .select('id,branch_id,name,type,audience,status,sent_count,opened_count,converted_count,revenue_generated,created_at')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    type: String(data.type).toUpperCase() === 'SMS' ? 'SMS' : 'Email',
    status: toTitleCase(data.status) as UiCampaign['status'],
    sent: safeNumber(data.sent_count),
    opened: safeNumber(data.opened_count),
    converted: safeNumber(data.converted_count),
    revenue: safeNumber(data.revenue_generated),
    audience: data.audience || 'All Clients',
    date: formatDate(data.created_at),
  } as UiCampaign;
}

async function remoteGetSettings(branchId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('branch_settings')
    .select('settings_json')
    .eq('branch_id', branchId)
    .maybeSingle();

  if (error) throw error;
  return (data?.settings_json || {}) as Record<string, any>;
}

async function remoteSaveSettings(branchId: string, settings: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('branch_settings')
    .upsert({
      branch_id: branchId,
      settings_json: settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'branch_id' });

  if (error) throw error;
}

async function remoteGetRolePermissions() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('role_module_permissions')
    .select('role,module,enabled');

  if (error) throw error;

  const base = clone(LOCAL_ROLE_PERMISSIONS) as Record<string, Record<string, boolean>>;
  for (const row of data || []) {
    const role = defaultRoleName(toTitleCase(row.role));
    if (!base[role]) base[role] = {};
    base[role][row.module] = Boolean(row.enabled);
  }

  return base;
}

async function remoteUpsertRolePermissions(input: {
  role: string;
  permissions: Record<string, boolean>;
}) {
  if (!supabase) throw new Error('Supabase not configured');

  const rows = Object.entries(input.permissions).map(([module, enabled]) => ({
    role: input.role.toLowerCase(),
    module,
    enabled,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('role_module_permissions')
    .upsert(rows, { onConflict: 'role,module' });

  if (error) throw error;
}

export async function getBranches() {
  if (shouldUseLocalReads()) {
    return loadList<UiBranch>(STORAGE_KEYS.branches, DEFAULT_BRANCHES.length ? DEFAULT_BRANCHES : seedBranches());
  }

  try {
    const data = await remoteGetBranches();
    saveList(STORAGE_KEYS.branches, data);
    return data;
  } catch {
    return loadList<UiBranch>(STORAGE_KEYS.branches, DEFAULT_BRANCHES.length ? DEFAULT_BRANCHES : seedBranches());
  }
}

export async function createBranch(input: Omit<UiBranch, 'id'>) {
  const localCreate = async () => {
    const rows = loadList<UiBranch>(STORAGE_KEYS.branches, DEFAULT_BRANCHES.length ? DEFAULT_BRANCHES : seedBranches());
    const created = {
      id: generateId('branch-'),
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      isActive: input.isActive,
    };
    const nextRows = [...rows, created];
    saveList(STORAGE_KEYS.branches, nextRows);
    return created;
  };

  return runMutationWithFallback('create_branch', input, () => remoteCreateBranch(input), localCreate);
}

export async function updateBranch(id: string, updates: Partial<UiBranch>) {
  const localUpdate = async () => {
    const rows = loadList<UiBranch>(STORAGE_KEYS.branches, DEFAULT_BRANCHES.length ? DEFAULT_BRANCHES : seedBranches());
    const nextRows = rows.map(row => (row.id === id ? { ...row, ...updates } : row));
    saveList(STORAGE_KEYS.branches, nextRows);
    return nextRows.find(row => row.id === id);
  };

  return runMutationWithFallback(
    'update_branch',
    { id, updates },
    () => remoteUpdateBranch(id, updates),
    localUpdate,
  );
}

export async function getClients(branchId?: string) {
  if (shouldUseLocalReads()) {
    const rows = loadList<UiClient>(STORAGE_KEYS.clients, seedClients());
    if (!branchId) return rows;
    return rows.filter(row => !row.branchId || row.branchId === branchId);
  }

  try {
    const data = await remoteGetClients(branchId);
    saveList(STORAGE_KEYS.clients, data);
    return data;
  } catch {
    const rows = loadList<UiClient>(STORAGE_KEYS.clients, seedClients());
    if (!branchId) return rows;
    return rows.filter(row => !row.branchId || row.branchId === branchId);
  }
}

export async function createClient(clientData: {
  name: string;
  phone: string;
  email?: string;
  branch_id?: string;
  branchId?: string;
  loyalty?: string;
  membership?: string;
  barberId?: string;
}) {
  if (!clientData.name?.trim()) throw new Error('Client name is required');
  if (!clientData.phone?.trim()) throw new Error('Client phone is required');

  const localCreate = async () => {
    const rows = loadList<UiClient>(STORAGE_KEYS.clients, seedClients());
    const created: UiClient = {
      id: generateId('client-'),
      name: clientData.name.trim(),
      phone: clientData.phone.trim(),
      email: clientData.email?.trim() || '',
      loyalty: clientData.loyalty || 'Bronze',
      membership: clientData.membership || 'None',
      visits: 0,
      spend: 0,
      lastVisit: todayIso(),
      barber: 'Not assigned',
      avatar: getInitials(clientData.name),
      branchId: clientData.branch_id || clientData.branchId,
    };
    const nextRows = [created, ...rows];
    saveList(STORAGE_KEYS.clients, nextRows);
    return created;
  };

  return runMutationWithFallback(
    'create_client',
    clientData,
    () => remoteCreateClient(clientData),
    localCreate,
  );
}

export async function updateClient(id: string, updates: Partial<UiClient>) {
  const localUpdate = async () => {
    const rows = loadList<UiClient>(STORAGE_KEYS.clients, seedClients());
    const nextRows = rows.map(row => (row.id === id ? { ...row, ...updates } : row));
    saveList(STORAGE_KEYS.clients, nextRows);
    return nextRows.find(row => row.id === id) || null;
  };

  return runMutationWithFallback(
    'update_client',
    { id, updates },
    () => remoteUpdateClient(id, updates),
    localUpdate,
  );
}

export async function getClientById(id: string) {
  const rows = await getClients();
  return rows.find(row => row.id === id) || null;
}

export async function getStaff(branchId?: string) {
  if (shouldUseLocalReads()) {
    const rows = loadList<UiStaff>(STORAGE_KEYS.staff, seedStaff());
    if (!branchId) return rows;
    return rows.filter(row => !row.branchId || row.branchId === branchId);
  }

  try {
    const data = await remoteGetStaff(branchId);
    saveList(STORAGE_KEYS.staff, data);
    return data;
  } catch {
    const rows = loadList<UiStaff>(STORAGE_KEYS.staff, seedStaff());
    if (!branchId) return rows;
    return rows.filter(row => !row.branchId || row.branchId === branchId);
  }
}

export async function createStaff(data: {
  fullName: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'receptionist' | 'barber';
  branchId?: string;
  commissionPercent?: number;
}) {
  const localCreate = async () => {
    const rows = loadList<UiStaff>(STORAGE_KEYS.staff, seedStaff());
    const created: UiStaff = {
      id: generateId('staff-'),
      name: data.fullName,
      fullName: data.fullName,
      role: data.role,
      status: 'Active',
      commission: safeNumber(data.commissionPercent),
      commissionPercent: safeNumber(data.commissionPercent),
      appointments: 0,
      revenue: 0,
      tips: 0,
      avatar: getInitials(data.fullName),
      rating: 4.8,
      schedule: 'N/A',
      phone: data.phone,
      email: data.email,
      branchId: data.branchId,
    };
    saveList(STORAGE_KEYS.staff, [...rows, created]);
    return created;
  };

  return runMutationWithFallback('create_staff', data, () => remoteCreateStaff(data), localCreate);
}

export async function updateStaff(id: string, updates: Partial<UiStaff>) {
  const localUpdate = async () => {
    const rows = loadList<UiStaff>(STORAGE_KEYS.staff, seedStaff());
    const nextRows = rows.map(row => (row.id === id ? { ...row, ...updates } : row));
    saveList(STORAGE_KEYS.staff, nextRows);
  };

  return runMutationWithFallback(
    'update_staff',
    { id, updates },
    () => remoteUpdateStaff(id, updates),
    localUpdate,
  );
}

export async function deleteStaff(id: string) {
  const localDelete = async () => {
    const rows = loadList<UiStaff>(STORAGE_KEYS.staff, seedStaff());
    saveList(STORAGE_KEYS.staff, rows.filter(row => row.id !== id));
  };

  return runMutationWithFallback('delete_staff', { id }, () => remoteDeleteStaff({ id }), localDelete);
}

export async function getAppointments(branchId?: string, date?: Date) {
  if (shouldUseLocalReads()) {
    const rows = loadList<UiAppointment>(STORAGE_KEYS.appointments, seedAppointments());
    const branchRows = branchId ? rows.filter(row => !row.branchId || row.branchId === branchId) : rows;
    if (!date) return branchRows;
    const dateKey = date.toISOString().split('T')[0];
    return branchRows.filter(row => row.date === dateKey);
  }

  try {
    const data = await remoteGetAppointments(branchId, date);
    const allRows = await remoteGetAppointments(branchId);
    saveList(STORAGE_KEYS.appointments, allRows);
    return data;
  } catch {
    const rows = loadList<UiAppointment>(STORAGE_KEYS.appointments, seedAppointments());
    const branchRows = branchId ? rows.filter(row => !row.branchId || row.branchId === branchId) : rows;
    if (!date) return branchRows;
    const dateKey = date.toISOString().split('T')[0];
    return branchRows.filter(row => row.date === dateKey);
  }
}

export async function createAppointment(appointmentData: {
  branch_id?: string;
  client_id?: string;
  client_name?: string;
  client?: string;
  barber_id?: string;
  barber_name?: string;
  barber?: string;
  service_id?: string;
  service_name?: string;
  service?: string;
  date: string;
  time: string;
  duration?: number;
  status?: AppointmentStatus;
  price?: number;
  notes?: string;
}) {
  const localCreate = async () => {
    const rows = loadList<UiAppointment>(STORAGE_KEYS.appointments, seedAppointments());
    const clientName = appointmentData.client_name || appointmentData.client || 'Walk-in';
    const barberName = appointmentData.barber_name || appointmentData.barber || 'Unassigned';
    const serviceName = appointmentData.service_name || appointmentData.service || 'Service';
    const branchId = appointmentData.branch_id;
    const duration = safeNumber(appointmentData.duration, 30);

    const hour = Number(appointmentData.time.split(':')[0]);
    const startMin = hour * 60 + Number(appointmentData.time.split(':')[1] || 0);
    const endMin = startMin + duration;

    const conflict = rows.some(row => {
      if (row.date !== appointmentData.date) return false;
      if ((row.branchId || branchId) !== (branchId || row.branchId)) return false;
      if (row.barber !== barberName) return false;
      if (row.status === 'cancelled' || row.status === 'no-show') return false;

      const rowStart = Number(row.time.split(':')[0]) * 60 + Number(row.time.split(':')[1] || 0);
      const rowEnd = rowStart + safeNumber(row.duration, 30);
      return startMin < rowEnd && endMin > rowStart;
    });

    if (conflict) {
      throw new Error('Selected barber already has an appointment in that time slot');
    }

    const created: UiAppointment = {
      id: generateId('appt-'),
      client: clientName,
      barber: barberName,
      service: serviceName,
      time: appointmentData.time,
      duration,
      status: appointmentData.status || 'confirmed',
      price: safeNumber(appointmentData.price, 0),
      color: getBarberColor(barberName),
      date: appointmentData.date,
      notes: appointmentData.notes,
      branchId,
    };

    saveList(STORAGE_KEYS.appointments, [created, ...rows]);
    return created;
  };

  return runMutationWithFallback(
    'create_appointment',
    appointmentData,
    () => remoteCreateAppointment({
      ...appointmentData,
      client_name: appointmentData.client_name || appointmentData.client,
      barber_name: appointmentData.barber_name || appointmentData.barber,
      service_name: appointmentData.service_name || appointmentData.service,
    }),
    localCreate,
  );
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const localUpdate = async () => {
    const rows = loadList<UiAppointment>(STORAGE_KEYS.appointments, seedAppointments());
    saveList(
      STORAGE_KEYS.appointments,
      rows.map(row => (row.id === id ? { ...row, status } : row)),
    );
  };

  return runMutationWithFallback(
    'update_appointment_status',
    { id, status },
    () => remoteUpdateAppointmentStatus(id, status),
    localUpdate,
  );
}

export async function getServices(branchId?: string) {
  if (shouldUseLocalReads()) {
    return loadList<UiService>(STORAGE_KEYS.services, seedServices());
  }

  try {
    const data = await remoteGetServices(branchId);
    saveList(STORAGE_KEYS.services, data);
    return data;
  } catch {
    return loadList<UiService>(STORAGE_KEYS.services, seedServices());
  }
}

export async function getProducts(branchId?: string) {
  if (shouldUseLocalReads()) {
    const rows = loadList<UiProduct>(STORAGE_KEYS.products, seedProducts());
    if (!branchId) return rows;
    return rows.filter(row => !row.branchId || row.branchId === branchId);
  }

  try {
    const data = await remoteGetProducts(branchId);
    saveList(STORAGE_KEYS.products, data);
    return data;
  } catch {
    const rows = loadList<UiProduct>(STORAGE_KEYS.products, seedProducts());
    if (!branchId) return rows;
    return rows.filter(row => !row.branchId || row.branchId === branchId);
  }
}

export async function createProduct(productData: {
  name: string;
  price: string | number;
  stock: string | number;
  category: string;
  supplier?: string;
  sku?: string;
  reorderLevel?: string | number;
  branchId?: string;
}) {
  const localCreate = async () => {
    const rows = loadList<UiProduct>(STORAGE_KEYS.products, seedProducts());
    const created: UiProduct = {
      id: generateId('prod-'),
      name: productData.name.trim(),
      price: safeNumber(productData.price),
      stock: safeNumber(productData.stock),
      category: productData.category,
      sku: productData.sku || `${productData.name.slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      supplier: productData.supplier || '',
      reorderLevel: safeNumber(productData.reorderLevel, 10),
      branchId: productData.branchId,
    };

    saveList(STORAGE_KEYS.products, [created, ...rows]);
    return created;
  };

  return runMutationWithFallback('create_product', productData, () => remoteCreateProduct(productData), localCreate);
}

export async function updateProduct(id: string, updates: Partial<UiProduct>) {
  const localUpdate = async () => {
    const rows = loadList<UiProduct>(STORAGE_KEYS.products, seedProducts());
    saveList(
      STORAGE_KEYS.products,
      rows.map(row => (row.id === id ? { ...row, ...updates } : row)),
    );
  };

  return runMutationWithFallback('update_product', { id, updates }, () => remoteUpdateProduct(id, updates), localUpdate);
}

export async function adjustProductStock(id: string, delta: number) {
  const localAdjust = async () => {
    const rows = loadList<UiProduct>(STORAGE_KEYS.products, seedProducts());
    saveList(
      STORAGE_KEYS.products,
      rows.map(row => {
        if (row.id !== id) return row;
        return { ...row, stock: Math.max(0, row.stock + delta) };
      }),
    );
  };

  return runMutationWithFallback(
    'adjust_product_stock',
    { id, delta },
    () => remoteAdjustProductStock(id, delta),
    localAdjust,
  );
}

export async function getSales(branchId?: string, limit?: number) {
  if (shouldUseLocalReads()) {
    const rows = loadList<UiInvoice>(STORAGE_KEYS.sales, seedInvoices());
    if (limit && limit > 0) return rows.slice(0, limit);
    return rows;
  }

  try {
    const data = await remoteGetSales(branchId, limit);
    saveList(STORAGE_KEYS.sales, data);
    return data;
  } catch {
    const rows = loadList<UiInvoice>(STORAGE_KEYS.sales, seedInvoices());
    if (limit && limit > 0) return rows.slice(0, limit);
    return rows;
  }
}

export async function createSale(input: CreateSaleInput) {
  const localCreate = async () => {
    const rows = loadList<UiInvoice>(STORAGE_KEYS.sales, seedInvoices());
    const items = normalizeSaleItems(input);
    const totals = calculateTotalsFromItems(input, items);

    const created: UiInvoice = {
      id: generateId('sale-'),
      invoiceNumber: input.invoice_number || generateInvoiceNumber(),
      customerName: input.customerName || 'Walk-in',
      customerPhone: input.customerPhone || '',
      barberName: input.barberName || 'Front Desk',
      barberPhone: input.barberPhone || '',
      services: items.map(item => ({ name: item.item_name, price: item.price, quantity: item.quantity })),
      total: totals.total,
      paymentMethod: normalizePaymentMethod(input.payment_method),
      date: input.date || todayIso(),
    };

    saveList(STORAGE_KEYS.sales, [created, ...rows]);

    const products = loadList<UiProduct>(STORAGE_KEYS.products, seedProducts());
    const productDeductions = items.filter(item => item.item_type === 'product');
    if (productDeductions.length > 0) {
      const nextProducts = products.map(product => {
        const line = productDeductions.find(item => item.item_id === product.id);
        if (!line) return product;
        return { ...product, stock: Math.max(0, product.stock - line.quantity) };
      });
      saveList(STORAGE_KEYS.products, nextProducts);
    }

    return created;
  };

  return runMutationWithFallback('create_sale', input, () => remoteCreateSale(input), localCreate);
}

export async function processRefund(input: {
  sale_id: string;
  amount: number;
  reason?: string;
  approved_by?: string;
}) {
  const localProcess = async () => {
    const rows = loadList<UiInvoice>(STORAGE_KEYS.sales, seedInvoices());
    const index = rows.findIndex(row => row.id === input.sale_id);
    if (index < 0) {
      throw new Error('Sale not found');
    }
  };

  return runMutationWithFallback('process_refund', input, () => remoteProcessRefund(input), localProcess);
}

export async function getPayroll(branchId?: string) {
  if (shouldUseLocalReads()) {
    return loadList<UiPayroll>(STORAGE_KEYS.payroll, seedPayroll());
  }

  try {
    const data = await remoteGetPayroll(branchId);
    saveList(STORAGE_KEYS.payroll, data);
    return data;
  } catch {
    return loadList<UiPayroll>(STORAGE_KEYS.payroll, seedPayroll());
  }
}

export async function approvePayrollRecord(id: string) {
  const localApprove = async () => {
    const rows = loadList<UiPayroll>(STORAGE_KEYS.payroll, seedPayroll());
    saveList(
      STORAGE_KEYS.payroll,
      rows.map(row => (row.id === id ? { ...row, status: 'Approved' } : row)),
    );
  };

  return runMutationWithFallback('approve_payroll', { id }, () => remoteApprovePayroll({ id }), localApprove);
}

export async function getCampaigns(branchId?: string) {
  if (shouldUseLocalReads()) {
    return loadList<UiCampaign>(STORAGE_KEYS.campaigns, seedCampaigns());
  }

  try {
    const data = await remoteGetCampaigns(branchId);
    saveList(STORAGE_KEYS.campaigns, data);
    return data;
  } catch {
    return loadList<UiCampaign>(STORAGE_KEYS.campaigns, seedCampaigns());
  }
}

export async function createCampaign(input: {
  branch_id?: string;
  name: string;
  type: 'SMS' | 'Email';
  audience: string;
  message: string;
  status?: 'Draft' | 'Scheduled' | 'Active' | 'Completed';
}) {
  const localCreate = async () => {
    const rows = loadList<UiCampaign>(STORAGE_KEYS.campaigns, seedCampaigns());
    const created: UiCampaign = {
      id: generateId('camp-'),
      name: input.name,
      type: input.type,
      status: input.status || 'Draft',
      sent: 0,
      opened: 0,
      converted: 0,
      revenue: 0,
      audience: input.audience,
      date: todayIso(),
    };
    saveList(STORAGE_KEYS.campaigns, [created, ...rows]);
    return created;
  };

  return runMutationWithFallback('create_campaign', input, () => remoteCreateCampaign(input), localCreate);
}

export async function getDashboardStats(branchId: string): Promise<DashboardStats> {
  const sales = await getSales(branchId);
  const appointments = await getAppointments(branchId);

  const today = todayIso();

  const todayRevenue = sales
    .filter(sale => sale.date === today)
    .reduce((sum, sale) => sum + safeNumber(sale.total), 0);

  const todayAppointments = appointments.filter(appt => appt.date === today).length;
  const weekRevenue = sales
    .filter(sale => withinDays(sale.date, 7))
    .reduce((sum, sale) => sum + safeNumber(sale.total), 0);

  const weeklyAppointments = appointments.filter(appt => withinDays(appt.date, 7));
  const noShowCount = weeklyAppointments.filter(appt => appt.status === 'no-show').length;
  const noShowRate = weeklyAppointments.length > 0
    ? parseFloat(((noShowCount / weeklyAppointments.length) * 100).toFixed(1))
    : 0;

  return {
    todayRevenue,
    todayAppointments,
    walkInsWaiting: appointments.filter(appt => appt.client.toLowerCase().includes('walk')).length,
    weekRevenue,
    noShowRate,
  };
}

export async function getDashboardData(branchId: string) {
  const [stats, appointments, products, sales] = await Promise.all([
    getDashboardStats(branchId),
    getAppointments(branchId),
    getProducts(branchId),
    getSales(branchId),
  ]);

  const lowStock = products.filter(product => product.stock <= product.reorderLevel);
  const today = todayIso();
  const todayAppointments = appointments
    .filter(item => item.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const appointmentByDay = aggregateAppointmentsByDay(appointments);
  const weekDates = [...Array(7)].map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().split('T')[0];
  });

  const revenueSeries = weekDates.map(dateKey => {
    const day = new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
    const byAppointments = appointmentByDay.get(dateKey) || { revenue: 0, appointments: 0 };
    const salesRevenue = sales
      .filter(item => item.date === dateKey)
      .reduce((sum, item) => sum + item.total, 0);

    return {
      day,
      revenue: Math.max(byAppointments.revenue, salesRevenue),
      appointments: byAppointments.appointments,
    };
  });

  const serviceCounts = new Map<string, number>();
  for (const invoice of sales) {
    for (const item of invoice.services) {
      serviceCounts.set(item.name, (serviceCounts.get(item.name) || 0) + safeNumber(item.quantity, 1));
    }
  }

  const totalServices = [...serviceCounts.values()].reduce((sum, count) => sum + count, 0) || 1;
  const colors = ['#2563EB', '#8b5cf6', '#10b981', '#f59e0b', '#6b7280'];
  const serviceBreakdown = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], index) => ({
      name,
      value: Math.round((count / totalServices) * 100),
      color: colors[index % colors.length],
    }));

  return {
    stats,
    revenueSeries: revenueSeries.length ? revenueSeries : revenueData,
    serviceBreakdown: serviceBreakdown.length ? serviceBreakdown : servicePopularityData,
    todayAppointments,
    lowStock,
  };
}

export async function getReportsSnapshot(branchId: string) {
  const [sales, staff, appointments] = await Promise.all([
    getSales(branchId),
    getStaff(branchId),
    getAppointments(branchId),
  ]);

  const byMonth = new Map<string, number>();
  for (const sale of sales) {
    const month = sale.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) || 0) + sale.total);
  }

  const monthlyRevenue = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, revenue]) => ({
      month: new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' }),
      revenue,
    }));

  const staffPerformance = staff.map(row => ({
    name: row.name.split(' ')[0],
    revenue: row.revenue,
    appointments: row.appointments,
    tips: row.tips,
  }));

  const noShowRate = appointments.length > 0
    ? (appointments.filter(item => item.status === 'no-show').length / appointments.length) * 100
    : 0;

  return {
    monthlyRevenue,
    staffPerformance,
    noShowRate,
  };
}

export async function getSettings(branchId: string) {
  const fallback = loadObject<Record<string, any>>(STORAGE_KEYS.settings, {});

  if (shouldUseLocalReads()) {
    return fallback[branchId] || {};
  }

  try {
    return await remoteGetSettings(branchId);
  } catch {
    return fallback[branchId] || {};
  }
}

export async function saveSettings(branchId: string, settings: Record<string, any>) {
  const localSave = async () => {
    const existing = loadObject<Record<string, any>>(STORAGE_KEYS.settings, {});
    existing[branchId] = settings;
    saveObject(STORAGE_KEYS.settings, existing);
  };

  return runMutationWithFallback(
    'upsert_settings',
    { branchId, settings },
    () => remoteSaveSettings(branchId, settings),
    localSave,
  );
}

export async function getRolePermissions() {
  const fallback = loadObject(STORAGE_KEYS.rolePermissions, LOCAL_ROLE_PERMISSIONS);

  if (shouldUseLocalReads()) {
    return fallback;
  }

  try {
    const remote = await remoteGetRolePermissions();
    saveObject(STORAGE_KEYS.rolePermissions, remote);
    return remote;
  } catch {
    return fallback;
  }
}

export async function upsertRolePermissions(input: {
  role: string;
  permissions: Record<string, boolean>;
}) {
  const localUpsert = async () => {
    const existing = loadObject<Record<string, Record<string, boolean>>>(
      STORAGE_KEYS.rolePermissions,
      LOCAL_ROLE_PERMISSIONS,
    );
    existing[input.role] = { ...(existing[input.role] || {}), ...input.permissions };
    saveObject(STORAGE_KEYS.rolePermissions, existing);
  };

  return runMutationWithFallback(
    'upsert_role_permissions',
    input,
    () => remoteUpsertRolePermissions(input),
    localUpsert,
  );
}

export function generateInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`;
}
