import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { saveAs } from 'file-saver';
import EnhancedCandidateProfilePanel from '../shared/EnhancedCandidateProfilePanel';
import EditCandidateDialog from '../shared/EditCandidateDialog';
import CreateCandidateDialog from '../shared/CreateCandidateDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';

interface CandidateTestResult {
  status: 'completed' | 'pending' | 'not_taken';
  score?: number;
  level?: string;
  completedAt?: string;
}

interface EnhancedSuperAdminCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  companyId: string;
  status: string;
  overallProgress: string; // e.g., "2/3 Complete"
  speakingTest: CandidateTestResult;
  proficiencyTest: CandidateTestResult;
  eqTest: CandidateTestResult;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
}

interface EnhancedSuperAdminCandidatesTableProps {
  onViewCandidate?: (candidateId: string) => void;
  isReport?: boolean;
}

const statusOptions = ['All', 'Completed', 'In Progress', 'Not Started'];
const companyOptions = ['All Companies']; // Will be populated dynamically

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'pending': return 'secondary';
    case 'not_taken': return 'outline';
    default: return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-700 bg-green-100';
    case 'pending': return 'text-yellow-700 bg-yellow-100';
    case 'not_taken': return 'text-gray-500 bg-gray-100';
    default: return 'text-gray-500 bg-gray-100';
  }
};

const formatTestResult = (test: CandidateTestResult, testType: 'speaking' | 'proficiency' | 'eq') => {
  if (test.status === 'completed') {
    if (testType === 'speaking' || testType === 'proficiency') {
      return `${test.level} (${test.score}${testType === 'proficiency' ? '/40' : '/100'})`;
    } else {
      return `${test.level} (${test.score})`;
    }
  } else if (test.status === 'pending') {
    return 'In Progress';
  } else {
    return 'Not Taken';
  }
};

function exportCandidatesToCSV(candidates: EnhancedSuperAdminCandidate[]) {
  const header = [
    'Name', 'Email', 'Company', 'Overall Progress', 'Speaking Test', 'Proficiency Test', 'EQ Test', 'Created By', 'Created Date'
  ];
  const rows = candidates.map(c => [
    `${c.firstName} ${c.lastName}`,
    c.email,
    c.company,
    c.overallProgress,
    formatTestResult(c.speakingTest, 'speaking'),
    formatTestResult(c.proficiencyTest, 'proficiency'),
    formatTestResult(c.eqTest, 'eq'),
    c.createdBy ? `${c.createdBy.name} (${c.createdBy.role})` : 'N/A',
    new Date(c.createdAt).toLocaleDateString()
  ]);
  const csvContent = [header, ...rows]
    .map(row => row.map(field => `"${(field || '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'superadmin_enhanced_candidates_report.csv');
}

const EnhancedSuperAdminCandidatesTable = ({ onViewCandidate, isReport }: EnhancedSuperAdminCandidatesTableProps) => {
  const [candidates, setCandidates] = useState<EnhancedSuperAdminCandidate[]>([]);
  const [companies, setCompanies] = useState<string[]>(['All Companies']);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState('All Companies');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCandidateId, setEditCandidateId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchCandidates();
    fetchCompanies();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/superadmin/candidates/enhanced`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setCandidates(response.data.candidates);
    } catch (err: any) {
      setError('Failed to load candidates');
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/superadmin/companies`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const companyNames = response.data.companies.map((c: any) => c.name);
      setCompanies(['All Companies', ...companyNames]);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      console.log('SuperAdmin deleting candidate:', candidateId);
      console.log('API URL:', `${API_URL}/api/superadmin/candidates/${candidateId}`);
      
      const response = await axios.delete(
        `${API_URL}/api/superadmin/candidates/${candidateId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      console.log('Delete response:', response.data);
      alert('Candidate deleted successfully');
      fetchCandidates(); // Refresh the list
    } catch (err: any) {
      console.error('SuperAdmin delete error:', err);
      console.error('Error response:', err.response?.data);
      alert(`Failed to delete candidate: ${err.response?.data?.error || err.message}`);
    }
  };

  const filtered = candidates.filter(c => {
    const matchesSearch =
      c.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (status === 'Completed') {
      matchesStatus = c.overallProgress.includes('3/3');
    } else if (status === 'In Progress') {
      matchesStatus = c.overallProgress.includes('1/3') || c.overallProgress.includes('2/3');
    } else if (status === 'Not Started') {
      matchesStatus = c.overallProgress.includes('0/3');
    }
    
    const matchesCompany = selectedCompany === 'All Companies' || c.company === selectedCompany;
    
    return matchesSearch && matchesStatus && matchesCompany;
  });

  if (selectedCandidateId) {
    return (
      <EnhancedCandidateProfilePanel
        candidateId={selectedCandidateId}
        onBack={() => setSelectedCandidateId(null)}
        userRole="superadmin"
      />
    );
  }

  return (
    <div className="-mx-4">
      <Card className="w-full max-w-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>{isReport ? 'All Candidates Report' : 'Global Candidates Management'}</CardTitle>
            <div className="flex gap-2">
              {!isReport && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ➕ Create Candidate
                </Button>
              )}
              <Button
                onClick={() => exportCandidatesToCSV(candidates)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                📊 Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4 mb-4 flex-wrap">
            <Input
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="border rounded px-3 py-2 bg-white"
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              className="border rounded px-3 py-2 bg-white"
            >
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              Total: {candidates.length} candidates
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="Loading candidates..." />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">{error}</div>
          ) : (
            <div className="overflow-x-auto rounded-lg shadow-lg ring-1 ring-gray-200 dark:ring-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 text-xs uppercase">
                    <th className="px-3 py-3 text-center font-semibold">Name</th>
                    <th className="px-3 py-3 text-center font-semibold">Email</th>
                    <th className="px-3 py-3 text-center font-semibold">Company</th>
                    <th className="px-3 py-3 text-center font-semibold">Progress</th>
                    <th className="px-3 py-3 text-center font-semibold">Speaking</th>
                    <th className="px-3 py-3 text-center font-semibold">Proficiency</th>
                    <th className="px-3 py-3 text-center font-semibold">EQ</th>
                    <th className="px-3 py-3 text-center font-semibold">Created By</th>
                    <th className="px-3 py-3 text-center font-semibold">Created Date</th>
                    {!isReport && <th className="px-3 py-3 text-center font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isReport ? 9 : 10} className="px-4 py-8 text-center text-gray-400">
                        No candidates found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((candidate) => (
                      <tr key={candidate.id} className="border-b odd:bg-white even:bg-gray-50 hover:bg-rose-50 dark:odd:bg-gray-900 dark:even:bg-gray-800 dark:hover:bg-gray-700 transition">
                        <td className="px-3 py-3 text-center">
                          <div className="font-medium">{candidate.firstName} {candidate.lastName}</div>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {candidate.email}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {candidate.company}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {candidate.overallProgress}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.speakingTest.status)}`}>
                            {formatTestResult(candidate.speakingTest, 'speaking')}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.proficiencyTest.status)}`}>
                            {formatTestResult(candidate.proficiencyTest, 'proficiency')}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.eqTest.status)}`}>
                            {formatTestResult(candidate.eqTest, 'eq')}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-600">
                          {candidate.createdBy ? (
                            <div>
                              <div className="font-medium">{candidate.createdBy.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{candidate.createdBy.role}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-600">
                          {new Date(candidate.createdAt).toLocaleDateString()}
                        </td>
                        {!isReport && (
                          <td className="px-3 py-3 text-center w-12">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setSelectedCandidateId(candidate.id)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { setEditCandidateId(candidate.id); setEditDialogOpen(true); }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit Candidate
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onSelect={() => handleDeleteCandidate(candidate.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Candidate Dialog */}
      {editCandidateId && (
        <EditCandidateDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          candidateId={editCandidateId}
          userRole="superadmin"
          onSuccess={() => {
            fetchCandidates();
            setEditCandidateId(null);
          }}
        />
      )}

      {/* Create Candidate Dialog - TODO: Fix props */}
      {/* <CreateCandidateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={async (candidate) => {
          // TODO: Implement candidate creation
          fetchCandidates();
        }}
      /> */}
    </div>
  );
};

export default EnhancedSuperAdminCandidatesTable; 