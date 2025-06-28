import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/superadmin/dashboard', { replace: true });
  }, [navigate]);
  return null;
} 