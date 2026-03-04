import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useBranchStore } from '../../store/useBranchStore';

// Zod Schema for Staff/User Form
export const staffFormSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  role: z.enum(['admin', 'manager', 'receptionist', 'barber']),
  branchId: z.string().optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormProps {
  initialData?: Partial<StaffFormValues>;
  onSubmit: (data: StaffFormValues) => void;
  isLoading?: boolean;
}

export const StaffForm: React.FC<StaffFormProps> = ({ initialData, onSubmit, isLoading }) => {
  const branches = useBranchStore(state => state.branches);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: initialData?.fullName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: initialData?.role || 'barber',
      branchId: initialData?.branchId || branches[0]?.id || '',
      commissionPercent: initialData?.commissionPercent || 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input 
          id="fullName" 
          placeholder="John Doe" 
          {...register('fullName')} 
          className="bg-[#1a1a1a] border-white/10 text-white"
        />
        {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="john@example.com" 
            {...register('email')} 
            className="bg-[#1a1a1a] border-white/10 text-white"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input 
            id="phone" 
            type="tel" 
            placeholder="(555) 123-4567" 
            {...register('phone')} 
            className="bg-[#1a1a1a] border-white/10 text-white"
          />
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select 
            id="role" 
            {...register('role')}
            className="flex h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="receptionist">Receptionist</option>
            <option value="barber">Barber</option>
          </select>
          {errors.role && <p className="text-red-500 text-sm">{errors.role.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="branchId">Branch</Label>
          <select 
            id="branchId" 
            {...register('branchId')}
            className="flex h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {errors.branchId && <p className="text-red-500 text-sm">{errors.branchId.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="commissionPercent">Commission (%)</Label>
        <Input 
          id="commissionPercent" 
          type="number" 
          placeholder="0" 
          {...register('commissionPercent', { valueAsNumber: true })} 
          className="bg-[#1a1a1a] border-white/10 text-white"
        />
        {errors.commissionPercent && <p className="text-red-500 text-sm">{errors.commissionPercent.message}</p>}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full mt-6 bg-[#2563EB] hover:bg-[#1d4ed8]">
        {isLoading ? 'Saving...' : 'Save Staff Member'}
      </Button>
    </form>
  );
};
