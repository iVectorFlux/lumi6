import { useLocation, useNavigate } from 'react-router-dom';
import { ResponsiveSidebar } from '@/components/ui/responsive-sidebar';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Settings, 
  HelpCircle,
  LogOut
} from 'lucide-react';
import { NavItem } from '@/types/common';

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
  { label: 'Companies', path: '/superadmin/companies', icon: Building2 },
  { label: 'Candidates', path: '/superadmin/candidates', icon: Users },
  { label: 'Assessments', path: '/superadmin/assessments', icon: FileText },
  { label: 'Reports', path: '/superadmin/reports', icon: BarChart3 },
  { label: 'Analytics', path: '/superadmin/analytics', icon: TrendingUp },
  { label: 'Settings', path: '/superadmin/settings', icon: Settings },
  { label: 'Question Management', path: '/superadmin/questions', icon: HelpCircle },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/superadmin/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const sidebarHeader = (
    <div className="p-4 border-b">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">Super Admin</h2>
      </div>
    </div>
  );

  const sidebarFooter = (
    <div className="p-4">
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        onClick={handleLogout}
        aria-label="Logout from super admin panel"
      >
        <LogOut className="h-4 w-4" />
        Log Out
      </button>
    </div>
  );

  return (
    <ResponsiveSidebar
      navItems={navItems}
      currentPath={location.pathname}
      onNavigate={handleNavigate}
      header={sidebarHeader}
      footer={sidebarFooter}
    >
      {children}
    </ResponsiveSidebar>
  );
} 