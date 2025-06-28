import { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  Users, 
  ClipboardList,
  Mic,
  BookOpen,
  PenTool,
  Brain
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import axios from 'axios';
import { usePermissions } from '@/hooks/api/useCompanyData';

interface SimpleCandidatesTableProps {
  companyId: string;
  onViewCandidate?: (candidateId: string) => void;
  onEditCandidate?: (candidateId: string) => void;
  onDeleteCandidate?: (candidateId: string) => void;
  onAddCandidate?: () => void;
  onBulkImport?: () => void;
  onAssignTest?: (candidateIds: string[], testType: string) => void;
  title?: string;
  isReport?: boolean;
}

interface TestResult {
  status: 'completed' | 'pending' | 'not_taken';
  score?: number;
  level?: string;
  completedAt?: string;
}

interface DetailedCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  overallProgress: string;
  speakingTest: TestResult;
  proficiencyTest: TestResult;
  writingTest: TestResult;
  eqTest: TestResult;
  createdBy?: {
    name: string;
    role: string;
  };
}

const SimpleCandidatesTable = ({ 
  companyId, 
  onViewCandidate, 
  onEditCandidate,
  onDeleteCandidate,
  onAddCandidate,
  onBulkImport,
  onAssignTest,
  title, 
  isReport 
}: SimpleCandidatesTableProps) => {
  const [candidates, setCandidates] = useState<DetailedCandidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<DetailedCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    createdBy: '',
    testType: '',
    completedDateFrom: '',
    completedDateTo: '',
    status: ''
  });

  // Get permissions for filtering test options
  const { data: permissions = [] } = usePermissions(companyId);
  
  // Helper function to check if a test type is enabled
  const hasPermission = (testType: string) => permissions.includes(testType);

  const fetchCandidates = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/companies/${companyId}/candidates/enhanced`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          page: 1,
          limit: 100,
          search: '',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      
      console.log('API Response:', response.data);
      
      let candidatesData = [];
      if (response.data.data) {
        candidatesData = response.data.data;
      } else if (response.data.candidates) {
        candidatesData = response.data.candidates;
      } else if (Array.isArray(response.data)) {
        candidatesData = response.data;
      }
      
      console.log('Candidates Data:', candidatesData);
      setCandidates(candidatesData || []);
      setFilteredCandidates(candidatesData || []);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredCandidates(candidates);
      return;
    }
    
    const filtered = candidates.filter(candidate => 
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(term.toLowerCase()) ||
      candidate.email.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredCandidates(filtered);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedCandidates(filteredCandidates.map(c => c.id));
    } else {
      setSelectedCandidates([]);
    }
  };

  const handleSelectCandidate = (candidateId: string, checked: boolean) => {
    if (checked) {
      setSelectedCandidates(prev => [...prev, candidateId]);
    } else {
      setSelectedCandidates(prev => prev.filter(id => id !== candidateId));
      setSelectAll(false);
    }
  };

  const handleBulkAssignTest = (testType: string) => {
    if (selectedCandidates.length === 0) {
      alert('Please select candidates first');
      return;
    }
    
    if (onAssignTest) {
      onAssignTest(selectedCandidates, testType);
    } else {
      // Default implementation
      console.log(`Assigning ${testType} test to candidates:`, selectedCandidates);
      alert(`${testType} test assigned to ${selectedCandidates.length} candidates`);
    }
    
    // Clear selection after assignment
    setSelectedCandidates([]);
    setSelectAll(false);
  };

  const handleEdit = (candidateId: string) => {
    if (onEditCandidate) {
      onEditCandidate(candidateId);
    } else {
      // Default implementation
      console.log('Edit candidate:', candidateId);
      alert('Edit functionality will be implemented');
    }
  };

  const handleDeleteClick = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (candidateToDelete) {
      if (onDeleteCandidate) {
        onDeleteCandidate(candidateToDelete);
      } else {
        // Default implementation
        console.log('Delete candidate:', candidateToDelete);
        alert('Delete functionality will be implemented');
      }
    }
    setDeleteDialogOpen(false);
    setCandidateToDelete(null);
  };

  const handleAddCandidate = () => {
    if (onAddCandidate) {
      onAddCandidate();
    } else {
      // Default implementation
      console.log('Add candidate clicked');
      alert('Add candidate functionality will be implemented');
    }
  };

  const handleBulkImport = () => {
    if (onBulkImport) {
      onBulkImport();
    } else {
      // Default implementation
      console.log('Bulk import clicked');
      alert('Bulk import functionality will be implemented');
    }
  };

  const getTestResultDisplay = (test: TestResult | undefined) => {
    if (!test) return '';
    
    if (test.status === 'completed') {
      return `${test.level || 'N/A'} (${test.score || 0})`;
    } else {
      return '';
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      default:
        return <span className="text-gray-400">-</span>;
    }
  };

  const getLatestCompletedDate = (candidate: DetailedCandidate) => {
    try {
      const dates = [
        candidate.speakingTest?.completedAt,
        candidate.proficiencyTest?.completedAt,
        candidate.writingTest?.completedAt,
        candidate.eqTest?.completedAt
      ].filter(Boolean);
      
      if (dates.length === 0) return null;
      return new Date(Math.max(...dates.map(date => new Date(date!).getTime())));
    } catch (error) {
      console.error('Error getting completion date:', error);
      return null;
    }
  };

  const exportToCSV = () => {
    try {
      const headers = [
        'Name', 'Email', 'Speaking Test', 'Proficiency Test', 'Writing Test', 'EQ Test',
        'Created By', 'Created Date', 'Completed At'
      ];
      
      const csvData = filteredCandidates.map(candidate => {
        const completedDate = getLatestCompletedDate(candidate);
        return [
          `${candidate.firstName || ''} ${candidate.lastName || ''}`,
          candidate.email || '',
          `${candidate.speakingTest?.status || 'not_taken'} - ${getTestResultDisplay(candidate.speakingTest)}`,
          `${candidate.proficiencyTest?.status || 'not_taken'} - ${getTestResultDisplay(candidate.proficiencyTest)}`,
          `${candidate.writingTest?.status || 'not_taken'} - ${getTestResultDisplay(candidate.writingTest)}`,
          `${candidate.eqTest?.status || 'not_taken'} - ${getTestResultDisplay(candidate.eqTest)}`,
          candidate.createdBy?.name || 'N/A',
          candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : 'N/A',
          completedDate ? completedDate.toLocaleDateString() : 'Not Completed'
        ];
      });

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title?.toLowerCase() || 'candidates'}_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const applyFilters = () => {
    try {
      let filtered = [...candidates];

      if (filters.dateFrom) {
        filtered = filtered.filter(c => c.createdAt && new Date(c.createdAt) >= new Date(filters.dateFrom));
      }
      if (filters.dateTo) {
        filtered = filtered.filter(c => c.createdAt && new Date(c.createdAt) <= new Date(filters.dateTo));
      }

      if (filters.createdBy) {
        filtered = filtered.filter(c => 
          c.createdBy?.name?.toLowerCase().includes(filters.createdBy.toLowerCase())
        );
      }

      if (filters.testType) {
        filtered = filtered.filter(c => {
          switch (filters.testType) {
            case 'speaking':
              return c.speakingTest?.status === 'completed';
            case 'proficiency':
              return c.proficiencyTest?.status === 'completed';
            case 'writing':
              return c.writingTest?.status === 'completed';
            case 'eq':
              return c.eqTest?.status === 'completed';
            default:
              return true;
          }
        });
      }

      if (filters.completedDateFrom || filters.completedDateTo) {
        filtered = filtered.filter(c => {
          const completedDate = getLatestCompletedDate(c);
          if (!completedDate) return false;
          
          if (filters.completedDateFrom && completedDate < new Date(filters.completedDateFrom)) {
            return false;
          }
          if (filters.completedDateTo && completedDate > new Date(filters.completedDateTo)) {
            return false;
          }
          return true;
        });
      }

      if (filters.status) {
        filtered = filtered.filter(c => {
          const hasCompleted = [c.speakingTest, c.proficiencyTest, c.writingTest, c.eqTest]
            .some(test => test?.status === 'completed');
          const hasPending = [c.speakingTest, c.proficiencyTest, c.writingTest, c.eqTest]
            .some(test => test?.status === 'pending');
          
          switch (filters.status) {
            case 'completed':
              return hasCompleted;
            case 'pending':
              return hasPending && !hasCompleted;
            case 'not_started':
              return !hasCompleted && !hasPending;
            default:
              return true;
          }
        });
      }

      setFilteredCandidates(filtered);
    } catch (error) {
      console.error('Error applying filters:', error);
      setFilteredCandidates(candidates);
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      createdBy: '',
      testType: '',
      completedDateFrom: '',
      completedDateTo: '',
      status: ''
    });
    setFilteredCandidates(candidates);
  };

  useEffect(() => {
    // Only fetch if companyId exists and component is mounted
    if (companyId) {
      fetchCandidates();
    }
  }, [companyId]);

  useEffect(() => {
    applyFilters();
  }, [filters, candidates]);

  useEffect(() => {
    // Update select all state based on current selection
    if (filteredCandidates.length > 0) {
      setSelectAll(selectedCandidates.length === filteredCandidates.length);
    }
  }, [selectedCandidates, filteredCandidates]);

  if (loading) return (
    <div className="p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  // REPORTS VIEW - Analytics focused
  if (isReport) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold text-gray-900">Reports & Analytics</CardTitle>
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Advanced Filters for Reports */}
          <div className={`mb-4 ${showFilters ? 'p-4 bg-gray-50 rounded-lg' : 'p-2'}`}>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filters</span>
                <span className="text-xs">
                  {showFilters ? '▲' : '▼'}
                </span>
              </Button>
              {showFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Created From</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Created To</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Created By</label>
                  <Input
                    placeholder="Search by name..."
                    value={filters.createdBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, createdBy: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Test Type</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.testType} 
                    onChange={(e) => setFilters(prev => ({ ...prev, testType: e.target.value }))}
                  >
                    <option value="">All Tests</option>
                    {hasPermission('SPEAKING') && <option value="speaking">Speaking</option>}
                    {hasPermission('PROFICIENCY') && <option value="proficiency">Proficiency</option>}
                    {hasPermission('WRITING') && <option value="writing">Writing</option>}
                    {hasPermission('EQ') && <option value="eq">EQ</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Completed From</label>
                  <Input
                    type="date"
                    value={filters.completedDateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, completedDateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Completed To</label>
                  <Input
                    type="date"
                    value={filters.completedDateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, completedDateTo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.status} 
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">In Progress</option>
                    <option value="not_started">Not Started</option>
                  </select>
                </div>
              </div>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Name</TableHead>
                  <TableHead className="text-xs font-bold">Email</TableHead>
                  {hasPermission('SPEAKING') && <TableHead className="text-xs font-bold">Speaking Test</TableHead>}
                  {hasPermission('PROFICIENCY') && <TableHead className="text-xs font-bold">Proficiency Test</TableHead>}
                  {hasPermission('WRITING') && <TableHead className="text-xs font-bold">Writing Test</TableHead>}
                  {hasPermission('EQ') && <TableHead className="text-xs font-bold">EQ Test</TableHead>}
                  <TableHead className="text-xs font-bold">Created By</TableHead>
                  <TableHead className="text-xs font-bold">Created Date</TableHead>
                  <TableHead className="text-xs font-bold">Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + permissions.length} className="text-center py-4 text-gray-500 text-xs">
                      No candidates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const completedDate = getLatestCompletedDate(candidate);
                    return (
                      <TableRow key={candidate.id}>
                        <TableCell className="font-medium py-1 text-xs">
                          {candidate.firstName} {candidate.lastName}
                        </TableCell>
                        <TableCell className="py-1 text-xs">{candidate.email}</TableCell>
                        {hasPermission('SPEAKING') && (
                          <TableCell className="py-1">
                            {getStatusBadge(candidate.speakingTest?.status)}
                            {candidate.speakingTest?.status === 'completed' && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {getTestResultDisplay(candidate.speakingTest)}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {hasPermission('PROFICIENCY') && (
                          <TableCell className="py-1">
                            {getStatusBadge(candidate.proficiencyTest?.status)}
                            {candidate.proficiencyTest?.status === 'completed' && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {getTestResultDisplay(candidate.proficiencyTest)}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {hasPermission('WRITING') && (
                          <TableCell className="py-1">
                            {getStatusBadge(candidate.writingTest?.status)}
                            {candidate.writingTest?.status === 'completed' && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {getTestResultDisplay(candidate.writingTest)}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {hasPermission('EQ') && (
                          <TableCell className="py-1">
                            {getStatusBadge(candidate.eqTest?.status)}
                            {candidate.eqTest?.status === 'completed' && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {getTestResultDisplay(candidate.eqTest)}
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="py-1">
                          <div className="text-xs">
                            <div className="font-medium">{candidate.createdBy?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-500 capitalize">
                              {candidate.createdBy?.role || ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="text-xs">
                            {new Date(candidate.createdAt).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(candidate.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="text-xs">
                            {completedDate ? (
                              <>
                                {completedDate.toLocaleDateString()}
                                <div className="text-xs text-gray-500">
                                  {completedDate.toLocaleTimeString()}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400">Not Completed</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CANDIDATES VIEW - Management focused (CRUD)
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold text-gray-900">Candidate Management</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleAddCandidate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
            <Button onClick={handleBulkImport} variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Bulk Actions */}
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <Input
              placeholder="Search candidates by name or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-md"
            />
            
            {/* Bulk Actions */}
            {selectedCandidates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedCandidates.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Assign Tests
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {hasPermission('SPEAKING') && (
                      <DropdownMenuItem onClick={() => handleBulkAssignTest('speaking')}>
                        <Mic className="h-4 w-4 mr-2" />
                        Speaking Test
                      </DropdownMenuItem>
                    )}
                    {hasPermission('PROFICIENCY') && (
                      <DropdownMenuItem onClick={() => handleBulkAssignTest('proficiency')}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Proficiency Test
                      </DropdownMenuItem>
                    )}
                    {hasPermission('WRITING') && (
                      <DropdownMenuItem onClick={() => handleBulkAssignTest('writing')}>
                        <PenTool className="h-4 w-4 mr-2" />
                        Writing Test
                      </DropdownMenuItem>
                    )}
                    {hasPermission('EQ') && (
                      <DropdownMenuItem onClick={() => handleBulkAssignTest('eq')}>
                        <Brain className="h-4 w-4 mr-2" />
                        EQ Assessment
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all candidates"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No candidates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => {
                  // Calculate progress based only on enabled test types
                  const enabledTestResults = [];
                  if (hasPermission('SPEAKING')) enabledTestResults.push(candidate.speakingTest?.status === 'completed');
                  if (hasPermission('PROFICIENCY')) enabledTestResults.push(candidate.proficiencyTest?.status === 'completed');
                  if (hasPermission('WRITING')) enabledTestResults.push(candidate.writingTest?.status === 'completed');
                  if (hasPermission('EQ')) enabledTestResults.push(candidate.eqTest?.status === 'completed');
                  
                  const completedTests = enabledTestResults.filter(Boolean).length;
                  const totalEnabledTests = enabledTestResults.length;
                  const progressPercentage = totalEnabledTests > 0 ? Math.round((completedTests / totalEnabledTests) * 100) : 0;
                  const isSelected = selectedCandidates.includes(candidate.id);
                  
                  return (
                                         <TableRow key={candidate.id} className={isSelected ? 'bg-blue-50' : ''}>
                       <TableCell className="py-3">
                         <Checkbox
                           checked={isSelected}
                           onCheckedChange={(checked) => handleSelectCandidate(candidate.id, checked as boolean)}
                           aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                         />
                       </TableCell>
                       <TableCell className="font-medium py-3">
                         {candidate.firstName} {candidate.lastName}
                       </TableCell>
                       <TableCell className="py-3">{candidate.email}</TableCell>
                       <TableCell className="py-3">
                         <div className="flex items-center gap-2">
                           <div className="w-16 bg-gray-200 rounded-full h-2">
                             <div 
                               className="bg-blue-600 h-2 rounded-full" 
                               style={{ width: `${progressPercentage}%` }}
                             ></div>
                           </div>
                           <span className="text-sm text-gray-600">{progressPercentage}%</span>
                         </div>
                       </TableCell>
                       <TableCell className="py-3">
                         <div className="text-sm">
                           {new Date(candidate.createdAt).toLocaleDateString()}
                         </div>
                       </TableCell>
                       <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                            onClick={() => onViewCandidate?.(candidate.id)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap text-xs px-2 py-1"
                            onClick={() => handleEdit(candidate.id)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap text-xs px-2 py-1 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                            onClick={() => handleDeleteClick(candidate.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this candidate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default SimpleCandidatesTable; 