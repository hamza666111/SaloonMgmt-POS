import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore, Role } from '../store/useAuthStore';

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
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading session...</div>;
  }

  // 1. Check basic authentication
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check Role-based access (if specific roles are required for this route)
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Check specific functional permission (if required)
  if (requiredModule && requiredAction) {
    if (!hasPermission(requiredModule, requiredAction)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authorized, render child routes
  return <Outlet />;
};
