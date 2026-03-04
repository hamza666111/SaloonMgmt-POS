import React, { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router';
import { useAuthStore, Role } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  requiredModule?: string;
  requiredAction?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  allowedRoles, 
  requiredModule, 
  requiredAction 
}) => {
  const { isAuthenticated, user, hasPermission, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    // Find the first available fallback route if they are denied
    const availablePaths = ['dashboard', 'appointments', 'pos', 'clients', 'inventory', 'staff', 'marketing', 'reports', 'payroll', 'settings'];
    const fallbackPath = '/' + (availablePaths.find(p => p === 'settings' || hasPermission(p)) || 'settings');

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      if (location.pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
      return;
    }

    // Dynamic Route Authorization checking store hasPermission
    const currentPath = location.pathname.split('/')[1] || 'dashboard'; // ex: 'pos', 'dashboard', 'settings'
    
    if (currentPath !== 'settings' && !hasPermission(currentPath)) {
        if (location.pathname !== fallbackPath) {
            navigate(fallbackPath, { replace: true });
        }
        return;
    }

    if (requiredModule && requiredAction && !hasPermission(requiredModule, requiredAction)) {
      if (location.pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
      return;
    }
  }, [isAuthenticated, user, isLoading, allowedRoles, requiredModule, requiredAction, navigate, location, hasPermission]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex bg-[#111111] h-screen w-full items-center justify-center text-[#2563EB]">
        Loading...
      </div>
    );
  }

  // If we reach here, user is authenticated and authorized
  return <Outlet />;
};
