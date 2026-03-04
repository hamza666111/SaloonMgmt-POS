import React, { useEffect, useState } from "react";
import { StaffForm, StaffFormValues } from "../components/forms/StaffForm";
import { DataTable, ColumnDef } from "../components/ui/data-table";
import { Modal } from "../components/ui/modal";
import { Button } from "../components/ui/button";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../store/useAuthStore";
import { useBranchStore } from "../store/useBranchStore";
import {
  createStaff as createStaffRecord,
  deleteStaff as deleteStaffRecord,
  getStaff,
  type UiStaff,
  updateStaff as updateStaffRecord,
} from "../lib/supabaseData";

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

  const { rolePermissions: permissions, updateRolePermission, loadRolePermissions } = useAuthStore();
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  const [staff, setStaff] = useState<UiStaff[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<UiStaff | null>(null);

  const loadStaff = async () => {
    setIsLoadingStaff(true);
    try {
      const rows = await getStaff(activeBranchId);
      setStaff(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load staff';
      toast.error(message);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, [activeBranchId]);

  const filteredStaff = staff.filter(s => s.branchId === activeBranchId);

  const columns: ColumnDef<UiStaff>[] = [
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
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {row.status || 'Active'}
        </span>
      )
    },
  ];

  const handleCreateOrUpdate = async (data: StaffFormValues) => {
    setIsSubmitting(true);
    try {
      if (selectedStaff) {
        await updateStaffRecord(selectedStaff.id, {
          fullName: data.fullName,
          name: data.fullName,
          email: data.email,
          phone: data.phone,
          role: data.role,
          commissionPercent: data.commissionPercent || 0,
          commission: data.commissionPercent || 0,
          branchId: data.branchId || activeBranchId,
        });
        toast.success("Staff member updated");
      } else {
        await createStaffRecord({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          role: data.role,
          commissionPercent: data.commissionPercent,
          branchId: data.branchId || activeBranchId,
        });
        toast.success("Staff member created");
      }
      await loadStaff();
      setIsModalOpen(false);
      setSelectedStaff(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save staff member';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (staffMember: UiStaff) => {
    setSelectedStaff(staffMember);
    setIsModalOpen(true);
  };

  const deleteStaff = async (id: string) => {
    try {
      await deleteStaffRecord(id);
      await loadStaff();
      toast.success("Staff member removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove staff member';
      toast.error(message);
    }
  };

  const toggleStaffActive = async (staffMember: UiStaff) => {
    try {
      const newStatus = staffMember.status === 'Active' ? 'Inactive' : 'Active';
      await updateStaffRecord(staffMember.id, { status: newStatus });
      await loadStaff();
      toast.success(`${staffMember.fullName} ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update staff status';
      toast.error(message);
    }
  };

  const ActionCell = (row: UiStaff) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggleStaffActive(row)}
        className={`p-2 rounded-lg ${row.status === 'Active' ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
        title={row.status === 'Active' ? 'Deactivate' : 'Activate'}
      >
        {row.status === 'Active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      </button>
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
    
    const currentValue = permissions[selectedRole]?.[permId] || false;
    updateRolePermission(selectedRole, permId, !currentValue);
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
            {isLoadingStaff && (
              <div className="text-[#9ca3af] text-sm px-4 py-3">Loading staff...</div>
            )}
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
                <Button onClick={async () => {
                  await loadRolePermissions();
                  toast.success(`Permissions synced for ${selectedRole}`);
                }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-9 text-sm rounded-xl">
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
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
};
