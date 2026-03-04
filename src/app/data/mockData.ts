export const mockClients = [
  { id: '1', name: 'Marcus Williams', phone: '+1 (555) 234-5678', email: 'marcus@email.com', loyalty: 'Gold', membership: 'Premium', visits: 48, spend: 2840, lastVisit: '2026-03-01', barber: 'Jordan Blake', avatar: 'MW' },
  { id: '2', name: 'DeShawn Carter', phone: '+1 (555) 345-6789', email: 'deshawn@email.com', loyalty: 'Platinum', membership: 'VIP', visits: 72, spend: 5120, lastVisit: '2026-03-02', barber: 'Alex Torres', avatar: 'DC' },
  { id: '3', name: 'Tyler Johnson', phone: '+1 (555) 456-7890', email: 'tyler@email.com', loyalty: 'Silver', membership: 'Basic', visits: 24, spend: 1280, lastVisit: '2026-02-28', barber: 'Jordan Blake', avatar: 'TJ' },
  { id: '4', name: 'Jordan Mitchell', phone: '+1 (555) 567-8901', email: 'jordan@email.com', loyalty: 'Bronze', membership: 'None', visits: 8, spend: 320, lastVisit: '2026-02-20', barber: 'Sam Rivera', avatar: 'JM' },
  { id: '5', name: 'Elijah Washington', phone: '+1 (555) 678-9012', email: 'elijah@email.com', loyalty: 'Gold', membership: 'Premium', visits: 36, spend: 2160, lastVisit: '2026-03-01', barber: 'Alex Torres', avatar: 'EW' },
  { id: '6', name: 'Noah Thompson', phone: '+1 (555) 789-0123', email: 'noah@email.com', loyalty: 'Silver', membership: 'Basic', visits: 18, spend: 900, lastVisit: '2026-02-25', barber: 'Jordan Blake', avatar: 'NT' },
  { id: '7', name: 'Aiden Brooks', phone: '+1 (555) 890-1234', email: 'aiden@email.com', loyalty: 'Platinum', membership: 'VIP', visits: 60, spend: 4200, lastVisit: '2026-03-03', barber: 'Sam Rivera', avatar: 'AB' },
  { id: '8', name: 'Caleb Rogers', phone: '+1 (555) 901-2345', email: 'caleb@email.com', loyalty: 'Bronze', membership: 'None', visits: 4, spend: 140, lastVisit: '2026-02-10', barber: 'Alex Torres', avatar: 'CR' },
];

export const mockStaff = [
  { id: '1', name: 'Jordan Blake', role: 'Senior Barber', status: 'Active', commission: 55, appointments: 128, revenue: 8960, tips: 1280, avatar: 'JB', rating: 4.9, schedule: 'Mon-Sat', phone: '+1 (555) 111-2222', email: 'jordan@shop.com' },
  { id: '2', name: 'Alex Torres', role: 'Master Barber', status: 'Active', commission: 60, appointments: 156, revenue: 11200, tips: 1680, avatar: 'AT', rating: 4.8, schedule: 'Tue-Sun', phone: '+1 (555) 222-3333', email: 'alex@shop.com' },
  { id: '3', name: 'Sam Rivera', role: 'Barber', status: 'Active', commission: 50, appointments: 96, revenue: 6720, tips: 960, avatar: 'SR', rating: 4.7, schedule: 'Mon-Fri', phone: '+1 (555) 333-4444', email: 'sam@shop.com' },
  { id: '4', name: 'Chris Morgan', role: 'Apprentice', status: 'Active', commission: 40, appointments: 48, revenue: 2880, tips: 384, avatar: 'CM', rating: 4.5, schedule: 'Mon-Sat', phone: '+1 (555) 444-5555', email: 'chris@shop.com' },
  { id: '5', name: 'Devon Price', role: 'Senior Barber', status: 'On Leave', commission: 55, appointments: 0, revenue: 0, tips: 0, avatar: 'DP', rating: 4.6, schedule: 'Mon-Sat', phone: '+1 (555) 555-6666', email: 'devon@shop.com' },
];

export const mockAppointments = [
  { id: '1', client: 'Marcus Williams', barber: 'Jordan Blake', service: 'Premium Cut + Beard', time: '09:00', duration: 60, status: 'confirmed', price: 85, color: '#2563EB', date: '2026-03-03' },
  { id: '2', client: 'DeShawn Carter', barber: 'Alex Torres', service: 'Master Fade', time: '09:30', duration: 45, status: 'confirmed', price: 65, color: '#8b5cf6', date: '2026-03-03' },
  { id: '3', client: 'Tyler Johnson', barber: 'Sam Rivera', service: 'Classic Cut', time: '10:00', duration: 30, status: 'completed', price: 45, color: '#10b981', date: '2026-03-03' },
  { id: '4', client: 'Jordan Mitchell', barber: 'Jordan Blake', service: 'Beard Trim', time: '11:00', duration: 30, status: 'confirmed', price: 35, color: '#2563EB', date: '2026-03-03' },
  { id: '5', client: 'Elijah Washington', barber: 'Alex Torres', service: 'Premium Cut + Beard', time: '11:30', duration: 60, status: 'pending', price: 85, color: '#8b5cf6', date: '2026-03-03' },
  { id: '6', client: 'Walk-in', barber: 'Sam Rivera', service: 'Classic Cut', time: '12:00', duration: 30, status: 'in-progress', price: 45, color: '#10b981', date: '2026-03-03' },
  { id: '7', client: 'Noah Thompson', barber: 'Jordan Blake', service: 'Master Fade', time: '13:00', duration: 45, status: 'confirmed', price: 65, color: '#2563EB', date: '2026-03-03' },
  { id: '8', client: 'Aiden Brooks', barber: 'Alex Torres', service: 'Full Service', time: '14:00', duration: 90, status: 'confirmed', price: 120, color: '#8b5cf6', date: '2026-03-03' },
  { id: '9', client: 'Caleb Rogers', barber: 'Chris Morgan', service: 'Classic Cut', time: '14:30', duration: 30, status: 'no-show', price: 45, color: '#f59e0b', date: '2026-03-03' },
  { id: '10', client: 'Isaiah Davis', barber: 'Sam Rivera', service: 'Beard Sculpt', time: '15:00', duration: 45, status: 'confirmed', price: 50, color: '#10b981', date: '2026-03-03' },
];

export const mockInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-100238',
    customerName: 'Marcus Williams',
    customerPhone: '+1 (555) 234-5678',
    barberName: 'Jordan Blake',
    barberPhone: '+1 (555) 111-2222',
    services: [
      { name: 'Premium Cut', price: 75 },
      { name: 'Beard Trim', price: 35 },
    ],
    total: 118.5,
    paymentMethod: 'card',
    date: '2026-03-04',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-100239',
    customerName: 'DeShawn Carter',
    customerPhone: '+1 (555) 345-6789',
    barberName: 'Alex Torres',
    barberPhone: '+1 (555) 222-3333',
    services: [
      { name: 'Master Fade', price: 65 },
      { name: 'Hot Towel Shave', price: 55 },
    ],
    total: 132.0,
    paymentMethod: 'cash',
    date: '2026-03-04',
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-100240',
    customerName: 'Tyler Johnson',
    customerPhone: '+1 (555) 456-7890',
    barberName: 'Sam Rivera',
    barberPhone: '+1 (555) 333-4444',
    services: [
      { name: 'Classic Cut', price: 45 },
    ],
    total: 49.5,
    paymentMethod: 'tap',
    date: '2026-03-03',
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-100241',
    customerName: 'Jordan Mitchell',
    customerPhone: '+1 (555) 567-8901',
    barberName: 'Jordan Blake',
    barberPhone: '+1 (555) 111-2222',
    services: [
      { name: 'Beard Sculpt', price: 50 },
      { name: 'Line Up', price: 25 },
    ],
    total: 82.0,
    paymentMethod: 'card',
    date: '2026-03-02',
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-100242',
    customerName: 'Elijah Washington',
    customerPhone: '+1 (555) 678-9012',
    barberName: 'Alex Torres',
    barberPhone: '+1 (555) 222-3333',
    services: [
      { name: 'Full Service', price: 120 },
    ],
    total: 144.0,
    paymentMethod: 'card',
    date: '2026-02-28',
  },
  {
    id: 'inv-6',
    invoiceNumber: 'INV-100243',
    customerName: 'Noah Thompson',
    customerPhone: '+1 (555) 789-0123',
    barberName: 'Jordan Blake',
    barberPhone: '+1 (555) 111-2222',
    services: [
      { name: 'Master Fade', price: 65 },
    ],
    total: 71.5,
    paymentMethod: 'cash',
    date: '2026-02-26',
  },
  {
    id: 'inv-7',
    invoiceNumber: 'INV-100244',
    customerName: 'Aiden Brooks',
    customerPhone: '+1 (555) 890-1234',
    barberName: 'Sam Rivera',
    barberPhone: '+1 (555) 333-4444',
    services: [
      { name: 'Premium Cut + Beard', price: 85 },
    ],
    total: 97.75,
    paymentMethod: 'tap',
    date: '2026-02-22',
  },
  {
    id: 'inv-8',
    invoiceNumber: 'INV-100245',
    customerName: 'Caleb Rogers',
    customerPhone: '+1 (555) 901-2345',
    barberName: 'Chris Morgan',
    barberPhone: '+1 (555) 444-5555',
    services: [
      { name: 'Kids Cut', price: 30 },
      { name: 'Beard Trim', price: 35 },
    ],
    total: 72.6,
    paymentMethod: 'cash',
    date: '2026-02-20',
  },
];

export const mockServices = [
  { id: '1', name: 'Classic Cut', price: 45, duration: 30, category: 'Haircut' },
  { id: '2', name: 'Master Fade', price: 65, duration: 45, category: 'Haircut' },
  { id: '3', name: 'Premium Cut', price: 75, duration: 60, category: 'Haircut' },
  { id: '4', name: 'Beard Trim', price: 35, duration: 30, category: 'Beard' },
  { id: '5', name: 'Beard Sculpt', price: 50, duration: 45, category: 'Beard' },
  { id: '6', name: 'Premium Cut + Beard', price: 85, duration: 60, category: 'Combo' },
  { id: '7', name: 'Full Service', price: 120, duration: 90, category: 'Combo' },
  { id: '8', name: 'Hot Towel Shave', price: 55, duration: 45, category: 'Shave' },
  { id: '9', name: 'Kids Cut', price: 30, duration: 20, category: 'Haircut' },
  { id: '10', name: 'Line Up', price: 25, duration: 20, category: 'Haircut' },
  { id: '11', name: 'Scalp Treatment', price: 40, duration: 30, category: 'Treatment' },
  { id: '12', name: 'Color Treatment', price: 95, duration: 60, category: 'Treatment' },
];

export const mockProducts = [
  { id: '1', name: 'Pomade - Strong Hold', price: 24, stock: 48, category: 'Styling', sku: 'STYLE-001', supplier: 'BarberCo', reorderLevel: 10 },
  { id: '2', name: 'Beard Oil - Cedar', price: 32, stock: 7, category: 'Beard Care', sku: 'BEARD-001', supplier: 'GroomPro', reorderLevel: 15 },
  { id: '3', name: 'Clay Wax - Matte', price: 28, stock: 35, category: 'Styling', sku: 'STYLE-002', supplier: 'BarberCo', reorderLevel: 10 },
  { id: '4', name: 'After Shave Balm', price: 36, stock: 4, category: 'Shave', sku: 'SHAVE-001', supplier: 'LuxGroom', reorderLevel: 20 },
  { id: '5', name: 'Shampoo - Premium', price: 22, stock: 62, category: 'Hair Care', sku: 'HAIR-001', supplier: 'GroomPro', reorderLevel: 15 },
  { id: '6', name: 'Conditioner - Repair', price: 24, stock: 44, category: 'Hair Care', sku: 'HAIR-002', supplier: 'GroomPro', reorderLevel: 15 },
  { id: '7', name: 'Beard Balm - Mint', price: 28, stock: 3, category: 'Beard Care', sku: 'BEARD-002', supplier: 'LuxGroom', reorderLevel: 12 },
  { id: '8', name: 'Fade Spray', price: 18, stock: 28, category: 'Styling', sku: 'STYLE-003', supplier: 'BarberCo', reorderLevel: 10 },
  { id: '9', name: 'Scalp Serum', price: 45, stock: 16, category: 'Treatment', sku: 'TREAT-001', supplier: 'LuxGroom', reorderLevel: 8 },
  { id: '10', name: 'Charcoal Scrub', price: 30, stock: 22, category: 'Treatment', sku: 'TREAT-002', supplier: 'LuxGroom', reorderLevel: 10 },
];

export const revenueData = [
  { day: 'Mon', revenue: 1240, appointments: 18 },
  { day: 'Tue', revenue: 1680, appointments: 22 },
  { day: 'Wed', revenue: 1420, appointments: 20 },
  { day: 'Thu', revenue: 1890, appointments: 26 },
  { day: 'Fri', revenue: 2340, appointments: 31 },
  { day: 'Sat', revenue: 2780, appointments: 38 },
  { day: 'Sun', revenue: 980, appointments: 14 },
];

export const servicePopularityData = [
  { name: 'Master Fade', value: 35, color: '#2563EB' },
  { name: 'Classic Cut', value: 25, color: '#8b5cf6' },
  { name: 'Premium Cut+Beard', value: 20, color: '#10b981' },
  { name: 'Beard Services', value: 12, color: '#f59e0b' },
  { name: 'Other', value: 8, color: '#6b7280' },
];

export const monthlyRevenue = [
  { month: 'Sep', revenue: 28400 },
  { month: 'Oct', revenue: 32100 },
  { month: 'Nov', revenue: 29800 },
  { month: 'Dec', revenue: 38500 },
  { month: 'Jan', revenue: 31200 },
  { month: 'Feb', revenue: 34800 },
  { month: 'Mar', revenue: 12330 },
];

export const branches = [
  { id: '1', name: 'Downtown', address: '123 Main St', city: 'New York, NY' },
  { id: '2', name: 'Midtown', address: '456 Park Ave', city: 'New York, NY' },
  { id: '3', name: 'Brooklyn', address: '789 Atlantic Ave', city: 'Brooklyn, NY' },
];

export const mockCampaigns = [
  { id: '1', name: 'Re-engagement - March', type: 'SMS', status: 'Active', sent: 284, opened: 198, converted: 67, revenue: 3350, audience: 'Inactive 30 days', date: '2026-03-01' },
  { id: '2', name: 'VIP Spring Promo', type: 'Email', status: 'Completed', sent: 128, opened: 112, converted: 44, revenue: 5280, audience: 'VIP', date: '2026-02-20' },
  { id: '3', name: 'New Service Launch', type: 'SMS', status: 'Draft', sent: 0, opened: 0, converted: 0, revenue: 0, audience: 'All Clients', date: '2026-03-10' },
  { id: '4', name: 'Loyalty Points Bonus', type: 'Email', status: 'Scheduled', sent: 0, opened: 0, converted: 0, revenue: 0, audience: 'Gold+', date: '2026-03-05' },
];

export const mockPayroll = [
  { id: '1', barber: 'Jordan Blake', serviceRevenue: 4480, commission: 55, commissionEarned: 2464, tips: 640, productCommission: 120, boothRent: 0, deductions: 0, netPayout: 3224, period: 'Feb 16-28 2026', status: 'Pending' },
  { id: '2', barber: 'Alex Torres', serviceRevenue: 5600, commission: 60, commissionEarned: 3360, tips: 840, productCommission: 180, boothRent: 0, deductions: 0, netPayout: 4380, period: 'Feb 16-28 2026', status: 'Pending' },
  { id: '3', barber: 'Sam Rivera', serviceRevenue: 3360, commission: 50, commissionEarned: 1680, tips: 480, productCommission: 90, boothRent: 0, deductions: 0, netPayout: 2250, period: 'Feb 16-28 2026', status: 'Approved' },
  { id: '4', barber: 'Chris Morgan', serviceRevenue: 1440, commission: 40, commissionEarned: 576, tips: 192, productCommission: 40, boothRent: 0, deductions: 0, netPayout: 808, period: 'Feb 16-28 2026', status: 'Pending' },
];
