import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import authConfig from '@/utils/authConfig';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'superadmin' | 'companyadmin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasCorrectRole, setHasCorrectRole] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const authenticated = authConfig.isAuthenticated();
    setIsAuthenticated(authenticated);
    
    // Check if user has the required role
    if (authenticated) {
      const hasRole = authConfig.hasRole(requiredRole);
      setHasCorrectRole(hasRole);
    } else {
      setHasCorrectRole(false);
    }
  }, [requiredRole]);

  if (isAuthenticated === null || hasCorrectRole === null) {
    // Still loading, show nothing or a loader
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login page
    return <Navigate to={`/${requiredRole}/login`} replace />;
  }

  if (!hasCorrectRole) {
    // Redirect to appropriate dashboard if user has wrong role
    const userRole = authConfig.getUserRole();
    if (userRole === 'superadmin') {
      return <Navigate to="/superadmin/dashboard" replace />;
    } else if (userRole === 'companyadmin') {
      return <Navigate to="/companyadmin/dashboard" replace />;
    } else {
      // If role is unknown, log out and redirect to login
      authConfig.removeToken();
      return <Navigate to={`/${requiredRole}/login`} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute; 