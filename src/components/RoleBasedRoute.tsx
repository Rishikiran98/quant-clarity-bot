import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import UserDashboard from '@/pages/UserDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

interface RoleBasedRouteProps {
  adminOnly?: boolean;
}

const RoleBasedRoute = ({ adminOnly = false }: RoleBasedRouteProps) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If admin-only route and user is not admin, redirect
  if (adminOnly && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Route users based on their role
  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
};

export default RoleBasedRoute;
