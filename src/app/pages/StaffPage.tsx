import React, { useState } from "react";
import { StaffForm, StaffFormValues } from "../components/forms/StaffForm";
import { DataTable, ColumnDef } from "../components/ui/data-table";
import { Modal } from "../components/ui/modal";
import { Button } from "../components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mockStaff } from "../data/mockData";
import { useAuthStore } from "../store/useAuthStore";
import { useBranchStore } from "../store/useBranchStore";

const ROLES = ['Admin', 'Manager', 'Receptionist', 'Barber'];

const PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'View complete dashboard metrics' },
  { id: 'appointments', label: 'Appointments', desc: 'Book and manage calendar' },
  { id: 'pos', label: 'Point of Sale', desc: 'Process transactions and checkouts' },
  { id: 'invoices', label: 'Invoices', desc: 'View and manage invoices' },
  { id: 'clients', label: 'Clients', desc: 'Access and edit client profiles' },
  { id: 'staff', label: 'Staff', desc: 'View staff directory and schedules' },
  { id: 'payroll', label: 'Payroll', desc: 'View and process payroll' },
  { id: 'inventory', label: 'Inventory', desc: 'Manage products and stock' },
  { id: 'marketing', label: 'Marketing', desc: 'Create and send campaigns' },
  { id: 'reports', label: 'Reports', desc: 'Access business reports' },
  { id: 'settings', label: 'Settings', desc: 'Configure system settings' }
];

export const StaffPage = () => {
  const [activeTab, setActiveTab] = useState<'team' | 'roles'>('team');
  const [selectedRole, setSelectedRole] = useState('Manager');

  const { rolePermissions: permissions, updateRolePermission } = useAuthStore();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const branches = useBranchStore(state => state.branches);

  const [staff, setStaff] = useState(mockStaff.map((s, i) => ({
    ...s, 
    fullName: s.name, 
    role: s.role.toLowerCase().includes("admin") ? "admin" : "barber",
    commissionPercent: s.commission,
    branchId: branches[i % branches.length]?.id || 'branch-1'
  })));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const filteredStaff = staff.filter(s => s.branchId === activeBranchId);

  const columns: ColumnDef<any>[] = [
    { id: "fullName", header: "Name", accessorKey: "fullName", sortable: true },
    { id: "email", header: "Email", accessorKey: "email" },
    { id: "phone", header: "Phone", accessorKey: "phone" },
    { 
      id: "role", 
      header: "Role", 
      accessorKey: "role",
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
          row.role === "admin" ? "bg-red-500/20 text-red-500" :
          row.role === "manager" ? "bg-blue-500/20 text-blue-500" :
          row.role === "receptionist" ? "bg-yellow-500/20 text-yellow-500" :
          "bg-green-500/20 text-green-500"
        }`}>
          {row.role}
        </span>
      )
    },
    { 
      id: "commissionPercent", 
      header: "Commission", 
      accessorKey: "commissionPercent",
      cell: (row) => `${row.commissionPercent}%`
    },
  ];

  const handleCreateOrUpdate = (data: StaffFormValues) => {
    if (selectedStaff) {
      setStaff(prev => prev.map(s => s.id === selectedStaff.id ? { ...data, id: s.id } : s));
      toast.success("Staff member updated");
    } else {
      setStaff(prev => [...prev, { ...data, id: Math.random().toString(36).substring(7) }]);
      toast.success("Staff member created");
    }
    setIsModalOpen(false);
  };

  const openEdit = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setIsModalOpen(true);
  };

  const deleteStaff = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    toast.success("Staff member removed");
  };

  const ActionCell = (row: any) => (
    <div className="flex items-center gap-2">
      <button onClick={() => openEdit(row)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => deleteStaff(row.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

const handlePermissionToggle = (permId: string) => {
    if (selectedRole === 'Admin') {
      toast.error("Admin permissions cannot be modified");
      return;
    }
    
    updateRolePermission(selectedRole, permId, !permissions[selectedRole][permId]);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight mb-1">Staff & Roles</h1>
          <p className="text-[#9ca3af] text-sm">{filteredStaff.length} team members</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center p-1 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
             <button 
               onClick={() => setActiveTab('team')} 
               className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none text-center" 
               style={{ 
                 background: activeTab === 'team' ? '#2563EB' : 'transparent', 
                 color: activeTab === 'team' ? '#fff' : '#6b7280' 
               }}>
               Team
             </button>
             <button 
               onClick={() => setActiveTab('roles')} 
               className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none text-center" 
               style={{ 
                 background: activeTab === 'roles' ? '#2563EB' : 'transparent', 
                 color: activeTab === 'roles' ? '#fff' : '#6b7280' 
               }}>
               Roles & Permissions
             </button>
          </div>
          <Button onClick={() => { setSelectedStaff(null); setIsModalOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-10 rounded-xl px-5 text-sm font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'team' ? (
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.05] p-1 staff-table">
            <DataTable
              columns={columns}
              data={filteredStaff} 
              searchKey="fullName"
              searchPlaceholder="Search by name..."
              exportable
              actions={ActionCell}
            />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px]">
            {/* Roles Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 bg-[#1a1a1a] rounded-2xl border border-white/[0.05] p-3 h-fit md:h-full overflow-y-auto">
              <h3 className="text-white text-sm font-bold px-3 py-2 mb-2">Roles</h3>
              <div className="space-y-1">
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      background: selectedRole === role ? 'rgba(37,99,235,0.1)' : 'transparent',
                      color: selectedRole === role ? '#2563EB' : '#9ca3af',
                      fontWeight: selectedRole === role ? 600 : 400
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions Panel */}
            <div className="flex-1 bg-[#1a1a1a] rounded-2xl border border-white/[0.05] flex flex-col min-h-0">
              <div className="p-5 border-b border-white/[0.05] flex items-center justify-between sticky top-0 bg-[#1a1a1a] rounded-t-2xl z-10">
                <h2 className="text-white font-bold">Permissions for: {selectedRole}</h2>
                <Button onClick={() => toast.success(`Permissions saved for ${selectedRole}`)} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-9 text-sm rounded-xl">
                  Save Changes
                </Button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto space-y-2">
                {PERMISSIONS.map(perm => {
                  const isEnabled = permissions[selectedRole]?.[perm.id] || false;
                  const isDisabledRole = selectedRole === 'Admin';
                  
                  return (
                    <div key={perm.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <div>
                        <div className="text-white text-sm font-bold mb-1">{perm.label}</div>
                        <div className="text-[#6b7280] text-xs">{perm.desc}</div>
                      </div>
                      <button
                        onClick={() => handlePermissionToggle(perm.id)}
                        disabled={isDisabledRole}
                        className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${isDisabledRole ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        style={{ background: isEnabled ? '#2563EB' : '#2a2a2a' }}
                      >
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all" style={{ left: isEnabled ? '24px' : '4px' }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        title={selectedStaff ? "Edit Staff Member" : "Add New Staff"}
        description={selectedStaff ? "Update details and permissions below." : "Create a new team member and configure their roles."}
      >
        <StaffForm 
          initialData={selectedStaff} 
          onSubmit={handleCreateOrUpdate} 
        />
      </Modal>
    </div>
  );
};
