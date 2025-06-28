import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { TestTube, Activity } from 'lucide-react';
import CreateProficiencyTestDialog from '@/components/companyadmin/CreateProficiencyTestDialog';
import CreateEQTestDialog from '@/components/companyadmin/CreateEQTestDialog';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';

// Keep minimal interfaces for the companies query
interface Company {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  candidateCount: number;
  testCount: number;
  createdAt: string;
}

const useCompanies = () => {
  return useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: async (): Promise<Company[]> => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/superadmin/companies`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data.companies || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export default function SuperAdminDashboard() {
  const [proficiencyDialogOpen, setProficiencyDialogOpen] = useState(false);
  const [eqDialogOpen, setEqDialogOpen] = useState(false);

  // Minimal data fetching - only what's needed for test creation
  const { refetch: refetchCompanies } = useCompanies();

  return (
    <DashboardLayout>
      {/* Minimal Header */}
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold text-gray-900">Test Creation</h1>
      </div>

      {/* Simple Test Creation Cards */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Proficiency Test */}
          <Card className="group hover:shadow-md transition-all cursor-pointer border hover:border-green-300 bg-white">
            <CardContent className="p-6 text-center">
              <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <TestTube className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-green-900 mb-2">Proficiency Test</h4>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setProficiencyDialogOpen(true)}
              >
                Create Test
              </Button>
            </CardContent>
          </Card>

          {/* EQ Assessment */}
          <Card className="group hover:shadow-md transition-all cursor-pointer border hover:border-purple-300 bg-white">
            <CardContent className="p-6 text-center">
              <div className="bg-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-purple-900 mb-2">EQ Assessment</h4>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => setEqDialogOpen(true)}
              >
                Create Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreateProficiencyTestDialog 
        open={proficiencyDialogOpen} 
        onOpenChange={setProficiencyDialogOpen} 
        companyId={''} 
        onSuccess={refetchCompanies}
      />
      <CreateEQTestDialog 
        open={eqDialogOpen} 
        onOpenChange={setEqDialogOpen} 
        companyId={''} 
        onSuccess={refetchCompanies}
      />
    </DashboardLayout>
  );
} 