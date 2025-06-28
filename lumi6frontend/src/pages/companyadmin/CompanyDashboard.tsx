import { useState, useEffect } from 'react';
import CreateTestDialog from '@/components/companyadmin/CreateTestDialog';
import SimpleCandidatesTable from '@/components/companyadmin/SimpleCandidatesTable';
import CandidateProfilePanel from '@/components/companyadmin/CandidateProfilePanel';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import CreateProficiencyTestDialog from '@/components/companyadmin/CreateProficiencyTestDialog';
import CreateEQTestDialog from '@/components/companyadmin/CreateEQTestDialog';
import CreateWritingTestDialog from '@/components/companyadmin/CreateWritingTestDialog';
import WritingResultsTable from '@/components/companyadmin/WritingResultsTable';
import { authConfig } from '@/utils/authConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { 
  Users, 
  FileText, 
  TrendingUp, 
  Settings, 
  UserPlus, 
  Mic, 
  Brain, 
  BookOpen, 
  PenTool,
  CreditCard,
  Activity,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Heart
} from 'lucide-react';


  const tabList = ['Dashboard', 'Talent', 'Tests', 'Reports', 'Settings'];

interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  exp: number;
}



function TestsTableStub() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Management</CardTitle>
        <CardDescription>Manage and monitor all your tests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          Coming soon - Advanced test management features
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsTableStub() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics & Reports</CardTitle>
        <CardDescription>Detailed insights into test performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          Coming soon - Advanced analytics and reporting
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsComponent({ adminInfo, onAdminInfoUpdate }: { adminInfo: any, onAdminInfoUpdate: (updatedInfo: any) => void }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(adminInfo?.name || '');

  // Update newName when adminInfo changes
  useEffect(() => {
    setNewName(adminInfo?.name || '');
  }, [adminInfo?.name]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage('');
    setPasswordError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/api/auth/change-password`, passwordForm, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setPasswordMessage('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.response?.data?.details) {
        setPasswordError(error.response.data.details.map((d: any) => d.message).join(', '));
      } else {
        setPasswordError(error.response?.data?.error || 'Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNameChange = async () => {
    if (!newName.trim()) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const response = await axios.patch(`${API_URL}/api/auth/update-profile`, 
        { name: newName.trim() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      // Update local admin info state
      const updatedAdminInfo = { ...adminInfo, name: newName.trim() };
      onAdminInfoUpdate(updatedAdminInfo);
      
      setEditingName(false);
      console.log('Name updated successfully');
    } catch (error: any) {
      console.error('Name change error:', error);
      // Reset to original name on error
      setNewName(adminInfo?.name || '');
      setEditingName(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              {editingName ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameChange();
                      if (e.key === 'Escape') {
                        setNewName(adminInfo?.name || '');
                        setEditingName(false);
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleNameChange}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewName(adminInfo?.name || '');
                        setEditingName(false);
                      }}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900 flex-1">{adminInfo?.name || 'N/A'}</p>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    title="Edit name"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <p className="text-gray-900">{adminInfo?.email || 'N/A'}</p>
            </div>

            {/* Role Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <p className="text-gray-900 capitalize">{adminInfo?.role || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {passwordMessage && (
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                {passwordMessage}
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Changing Password...' : 'Change Password'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(false);
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });
                setPasswordMessage('');
                setPasswordError('');
              }}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const getAdminInfoFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      companyId: payload.companyId
    };
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
};

const CompanyDashboard = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [proficiencyDialogOpen, setProficiencyDialogOpen] = useState(false);
  const [eqTestDialogOpen, setEqTestDialogOpen] = useState(false);
  const [writingDialogOpen, setWritingDialogOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [tokenValidating, setTokenValidating] = useState(true);
  const [creditBalances, setCreditBalances] = useState<any[]>([]);
  const [successRate, setSuccessRate] = useState<number>(0);
  const [completedTests, setCompletedTests] = useState<number>(0);

  const fetchCompany = async () => {
    if (!adminInfo?.companyId) {
      return;
    }
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/companies/${adminInfo.companyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setCompany(res.data);
    } catch (err) {
      console.error('Company fetch error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      setError(`Failed to load company info: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    if (!adminInfo?.companyId) return;
    setPermissionsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/credits/permissions/${adminInfo.companyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPermissions(res.data.permissions || []);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const fetchCreditBalances = async () => {
    if (!adminInfo?.companyId) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/credits/balance/${adminInfo.companyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      console.log('Credit balances response:', res.data);
      setCreditBalances(res.data.credits || []);
    } catch (err) {
      console.error('Failed to load credit balances:', err);
      setCreditBalances([]);
    }
  };

  const fetchSuccessRate = async () => {
    if (!adminInfo?.companyId) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/companies/${adminInfo.companyId}/analytics/success-rate`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSuccessRate(res.data.successRate || 0);
    } catch (err) {
      console.error('Failed to load success rate:', err);
      setSuccessRate(0);
    }
  };

  const fetchCompletedTests = async () => {
    if (!adminInfo?.companyId) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const token = localStorage.getItem('token');
    
    try {
      const res = await axios.get(`${API_URL}/api/companies/${adminInfo.companyId}/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      console.log('Company stats response:', res.data);
      setCompletedTests(res.data.completedTests || 0);
    } catch (err) {
      console.error('Failed to load company stats:', err);
      // Fallback: Calculate from enhanced candidates endpoint
      try {
        const candidatesRes = await axios.get(`${API_URL}/api/companies/${adminInfo.companyId}/candidates/enhanced`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const candidates = candidatesRes.data.candidates || [];
        // Count individual completed tests across all candidates
        let totalCompleted = 0;
        candidates.forEach((candidate: any) => {
          if (candidate.speakingTest?.status === 'completed') totalCompleted++;
          if (candidate.proficiencyTest?.status === 'completed') totalCompleted++;
          if (candidate.eqTest?.status === 'completed') totalCompleted++;
          if (candidate.writingTest?.status === 'completed') totalCompleted++;
        });
        setCompletedTests(totalCompleted);
      } catch (fallbackErr) {
        console.error('Failed to load completed tests from candidates:', fallbackErr);
        setCompletedTests(0);
      }
    }
  };

  // Add delete candidate handler
  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      console.log('🗑️ Delete Candidate Debug Info:');
      console.log('  - candidateId:', candidateId);
      console.log('  - companyId:', adminInfo?.companyId);
      
      if (!candidateId) {
        throw new Error('Candidate ID is required');
      }
      
      if (!adminInfo?.companyId) {
        throw new Error('Company ID is required');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      console.log('  - API_URL:', API_URL);
      console.log('  - token exists:', !!token);
      
      const apiUrl = `${API_URL}/api/companies/${adminInfo.companyId}/candidates/${candidateId}`;
      console.log('  - Delete API URL:', apiUrl);
      
      const response = await axios.delete(apiUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      console.log('  - Delete success:', response.status);
      
      // Refresh the candidates table by forcing a re-render
      setSelectedCandidateId(null);
      alert('Candidate deleted successfully');
    } catch (error: any) {
      console.error('🚨 Error deleting candidate:', error);
      console.error('  - Error response:', error.response?.data);
      console.error('  - Error status:', error.response?.status);
      alert(
        `Failed to delete candidate: ${error.response?.data?.error || error.message}`
      );
    }
  };

  // Add candidate handler
  const handleAddCandidate = () => {
    // TODO: Implement add candidate dialog
    alert('Add candidate feature coming soon');
  };

  // Bulk import handler  
  const handleBulkImport = () => {
    // TODO: Implement bulk import
    alert('Bulk import feature coming soon');
  };

  // Assign test handler
  const handleAssignTest = async (candidateIds: string[], testType: string) => {
    try {
      // TODO: Implement test assignment API call
      console.log(`Assigning ${testType} test to candidates:`, candidateIds);
      alert(`${testType} test assigned to ${candidateIds.length} candidates`);
    } catch (error) {
      console.error('Error assigning test:', error);
      alert('Failed to assign test. Please try again.');
    }
  };

  useEffect(() => {
    const info = getAdminInfoFromToken();
    if (!info) {
      console.log('No admin info available, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/companyadmin/login';
      return;
    }
    if (!info.companyId) {
      console.log('No companyId in token, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/companyadmin/login';
      return;
    }
    setAdminInfo(info);
    setTokenValidating(false);
  }, []);

  useEffect(() => {
    if (adminInfo?.companyId) {
      // Load all essential data together but efficiently
      const loadData = async () => {
        await Promise.all([
          fetchCompany(),
          fetchPermissions(),
          fetchCreditBalances(),
          fetchCompletedTests()
        ]);
      };
      loadData();
    }
  }, [adminInfo]);

  // Helper function to check if a test type is enabled
  const hasPermission = (testType: string) => permissions.includes(testType);

  // Get actual credit balance from database
  const getCreditBalance = (testType: string) => {
    return creditBalances.find(cb => cb.testType === testType)?.availableCredits || 0;
  };



  const menuItems = [
    { label: 'Dashboard', key: 'Dashboard' },
    { label: 'Talent', key: 'Talent' },
    { label: 'Reports', key: 'Reports' },
    { label: 'Settings', key: 'Settings' },
    { label: 'Invite', key: 'Invite' },
  ];

  const testTypeConfig = {
    EQ: {
      name: 'EQ Assessment',
      description: 'Emotional intelligence evaluation',
              details: 'Takes 30 mins',
      icon: Brain,
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    },
    SPEAKING: {
      name: 'Speaking Assessment',
      description: 'CEFR-based language proficiency',
      details: 'Takes 5 mins\nresults in 2 mins',
      icon: Mic,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    PROFICIENCY: {
      name: 'Proficiency Test',
      description: 'Comprehensive language evaluation',
              details: 'Takes 25 mins • detailed analysis',
      icon: BookOpen,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      buttonColor: 'bg-green-600 hover:bg-green-700'
    },
    WRITING: {
      name: 'Writing Assessment',
      description: 'Writing skills evaluation',
      details: 'Takes 20 mins • detailed feedback',
      icon: PenTool,
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      buttonColor: 'bg-orange-600 hover:bg-orange-700'
    }
  };

  // Show loading screen while validating token
  if (tokenValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <span className="mt-4 text-gray-600 block">Validating session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r flex flex-col">
        {/* User Profile */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                {adminInfo?.name?.charAt(0)?.toUpperCase() || 'K'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 truncate">
                {adminInfo?.name || 'Kamal Bhatt'}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {company?.name || 'Lumi6 LLC'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-6">
          <div className="space-y-2 px-4">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === item.key
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.key === 'Dashboard' && <BarChart3 className="h-5 w-5" />}
                  {item.key === 'Talent' && <Users className="h-5 w-5" />}
                  {item.key === 'Reports' && <FileText className="h-5 w-5" />}
                  {item.key === 'Settings' && <Settings className="h-5 w-5" />}
                  {item.key === 'Invite' && <UserPlus className="h-5 w-5" />}
                  <span>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </nav>
        
        {/* Logout Section */}
        <div className="p-4 border-t">
          {loading && (
            <div className="flex items-center gap-2 mb-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-xs text-gray-600">Loading...</span>
            </div>
          )}
          
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 border-none"
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/companyadmin/login';
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header (empty) */}
        <header className="bg-white shadow-sm border-b px-6 py-2">
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto">
        <div className="w-full space-y-6 lg:space-y-8">
          {activeTab === 'Dashboard' && (
            <div className="w-full space-y-6">
              {/* Welcome Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Welcome back, {adminInfo?.name}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Here's what's happening with your talent assessments today.
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-700 font-medium">Available Credits</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {creditBalances.reduce((sum, cb) => sum + (cb.availableCredits || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <CreditCard className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-700 font-medium">Tests Completed</p>
                        <p className="text-2xl font-bold text-green-900">
                          {completedTests.toLocaleString()}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Credits by Test Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {Object.entries(testTypeConfig).map(([key, config]) => {
                  const enabled = hasPermission(key);
                  const IconComponent = config.icon;
                  const credits = getCreditBalance(key);

                  if (!enabled) return null;

                  return (
                    <Card key={key} className="bg-white border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${config.color}`}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{config.name}</h3>
                            <p className="text-sm text-gray-600">{credits.toLocaleString()} credits</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Test Type Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Object.entries(testTypeConfig).map(([key, config]) => {
                  const enabled = hasPermission(key);
                  const IconComponent = config.icon;
                  const credits = getCreditBalance(key);

                  if (!enabled) return null;

                  return (
                    <Card key={key} className={`${config.bgColor} border-2 transition-all duration-200 hover:shadow-md`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-center mb-4">
                          <div className={`p-3 rounded-lg bg-gradient-to-r ${config.color}`}>
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        
                        <h3 className={`font-semibold text-lg mb-2 text-center ${config.textColor}`}>
                          {config.name}
                        </h3>
                        
                        <p className="text-gray-600 text-sm mb-4 text-center">
                          {config.description}
                        </p>
                        
                        <div className="text-center text-sm text-gray-500 mb-4 whitespace-pre-line">
                          {config.details}
                        </div>
                        
                        <Button 
                          className={`w-full ${config.buttonColor}`}
                          onClick={() => {
                            if (key === 'SPEAKING') setTestDialogOpen(true);
                            else if (key === 'PROFICIENCY') setProficiencyDialogOpen(true);
                            else if (key === 'EQ') setEqTestDialogOpen(true);
                            else if (key === 'WRITING') setWritingDialogOpen(true);
                          }}
                          disabled={credits === 0}
                        >
                          Create {config.name}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>


            </div>
          )}
          
          {activeTab === 'Talent' && (
            <div className="w-full">
              {selectedCandidateId ? (
                <CandidateProfilePanel
                  candidateId={selectedCandidateId}
                  onBack={() => setSelectedCandidateId(null)}
                  companyId={adminInfo?.companyId}
                />
              ) : (
                <div className="w-full space-y-6">
                  <SimpleCandidatesTable 
                    companyId={adminInfo?.companyId || ''} 
                    onViewCandidate={setSelectedCandidateId}
                    onEditCandidate={setSelectedCandidateId}
                    onDeleteCandidate={handleDeleteCandidate}
                    onAddCandidate={handleAddCandidate}
                    onBulkImport={handleBulkImport}
                    onAssignTest={handleAssignTest}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'Reports' && (
            <div className="w-full space-y-6">
              <SimpleCandidatesTable 
                companyId={adminInfo?.companyId || ''} 
                isReport={true}
                title="Analytics Report"
              />
            </div>
          )}

          {activeTab === 'Tests' && (
            <TestsTableStub />
          )}

          {activeTab === 'Settings' && (
            <SettingsComponent 
              adminInfo={adminInfo} 
              onAdminInfoUpdate={setAdminInfo}
            />
          )}

          {activeTab === 'Invite' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  Coming soon - Direct candidate invitation system
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </main>
      </div>

      {/* Dialogs */}
      <CreateTestDialog 
        open={testDialogOpen} 
        onOpenChange={setTestDialogOpen}
        companyId={adminInfo?.companyId || ''}
      />
      
      <CreateProficiencyTestDialog 
        open={proficiencyDialogOpen} 
        onOpenChange={setProficiencyDialogOpen}
        companyId={adminInfo?.companyId || ''}
      />
      
      <CreateEQTestDialog 
        open={eqTestDialogOpen} 
        onOpenChange={setEqTestDialogOpen}
        companyId={adminInfo?.companyId || ''}
      />
      
      <CreateWritingTestDialog 
        open={writingDialogOpen} 
        onOpenChange={setWritingDialogOpen}
      />
    </div>
  );
};

export default CompanyDashboard; 