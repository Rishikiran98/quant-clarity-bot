import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import UserDashboard from '@/pages/UserDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

const DashboardRouter = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin gets full dashboard, regular users get simplified dashboard
  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
};

export default DashboardRouter;
