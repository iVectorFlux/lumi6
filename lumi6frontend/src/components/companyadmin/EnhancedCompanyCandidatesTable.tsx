          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">
              {candidate.firstName} {candidate.lastName}
            </div>
            <div className="text-xs lg:text-sm text-gray-500 truncate">
              ID: {candidate.id.slice(-8)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Contact',
      sortable: true,
      width: 'auto',
      render: (_, candidate) => (
        <div className="min-w-[200px] lg:min-w-[280px]">
          <div className="text-sm text-gray-900 break-words">
            {candidate.email}
          </div>
          <div className="text-xs lg:text-sm text-gray-500">
            Added {new Date(candidate.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: 'overallProgress',
      label: 'Progress',
      width: 'auto',
      render: (progress) => (
        <div className="space-y-2 min-w-[120px] lg:min-w-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
            <div className="flex items-center gap-1">
              {progress === 100 && <Star className="h-4 w-4 text-yellow-500" />}
              {progress >= 75 && progress < 100 && <TrendingUp className="h-4 w-4 text-green-500" />}
            </div>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              'h-2',
              progress === 100 ? '[&>div]:bg-green-500' :
              progress >= 75 ? '[&>div]:bg-blue-500' :
              progress >= 50 ? '[&>div]:bg-yellow-500' :
              '[&>div]:bg-red-500'
            )}
          />
        </div>
      )
    },
    {
      key: 'speakingTest',
      label: 'Speaking',
      width: 'auto',
      render: (test: CandidateTestResult) => {
        const result = formatTestResult(test, 'speaking');
        return (
          <div className="space-y-1 min-w-[140px] lg:min-w-[160px]">
            <Badge 
              variant="outline" 
              className={cn(
                'flex items-center gap-1 text-xs font-medium border transition-colors',
                getStatusColor(test.status)
              )}
            >
              {getStatusIcon(test.status)}
              <MessageSquare className="h-3 w-3" />
import { useState, useEffect, useMemo } from 'react';
              {result.level || 'Pending'}
            </Badge>
            {result.score && (
              <div className="text-xs text-gray-600">
                Score: {result.score}/100
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'proficiencyTest',
      label: 'Proficiency',
      width: 'auto',
      render: (test: CandidateTestResult) => {
        const result = formatTestResult(test, 'proficiency');
        return (
          <div className="space-y-1 min-w-[140px] lg:min-w-[160px]">
            <Badge 
              variant="outline" 
              className={cn(
                'flex items-center gap-1 text-xs font-medium border transition-colors',
                getStatusColor(test.status)
              )}
            >
              {getStatusIcon(test.status)}
              <BookOpen className="h-3 w-3" />
              {result.level || 'Pending'}
            </Badge>
            {result.score && (
              <div className="text-xs text-gray-600">
                Score: {result.score}/40
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'writingTest',
      label: 'Writing',
      width: 'auto',
      render: (test: CandidateTestResult) => {
        const result = formatTestResult(test, 'writing');
        return (
          <div className="space-y-1 min-w-[140px] lg:min-w-[160px]">
            <Badge 
              variant="outline" 
              className={cn(
                'flex items-center gap-1 text-xs font-medium border transition-colors',
                getStatusColor(test.status)
              )}
            >
              {getStatusIcon(test.status)}
              <PenLine className="h-3 w-3" />
              {result.level || 'Pending'}
            </Badge>
            {result.score && (
              <div className="text-xs text-gray-600">
                Score: {result.score}/100
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'eqTest',
      label: 'EQ',
      width: 'auto',
      render: (test: CandidateTestResult) => {
        const result = formatTestResult(test, 'eq');
        return (
          <div className="space-y-1 min-w-[120px] lg:min-w-[140px]">
            <Badge 
              variant="outline" 
              className={cn(
                'flex items-center gap-1 text-xs font-medium border transition-colors',
                getStatusColor(test.status)
              )}
            >
              {getStatusIcon(test.status)}
              <Brain className="h-3 w-3" />
              {result.level || 'Pending'}
            </Badge>
            {result.score && (
              <div className="text-xs text-gray-600">
                Score: {result.score}
              </div>
            )}
          </div>
        );
      }
    }
  ];

  // Additional columns for report view
  const reportColumns: TableColumn<EnhancedCandidate>[] = [
    {
      key: 'createdBy',
      label: 'Created By',
      width: 'auto',
      render: (_, candidate) => (
        <div className="text-sm text-gray-600 whitespace-nowrap min-w-[140px] lg:min-w-[180px]">
          {candidate.createdBy ? candidate.createdBy.name : 'N/A'}
        </div>
      )
    },
    {
      key: 'id',
      label: 'Completed At',
      width: 'auto',
      render: (_, candidate) => (
        <div className="text-sm text-gray-600 whitespace-nowrap min-w-[140px] lg:min-w-[180px]">
          {getLatestCompletedAt(candidate)}
        </div>
      )
    }
  ];

  // Actions column for regular view - responsive
  const actionsColumn: TableColumn<EnhancedCandidate> = {
    key: 'id',
    label: 'Actions',
    className: 'min-w-[100px] lg:min-w-[120px] text-center',
    render: (_, candidate) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            aria-label="Actions" 
            className="h-8 w-8 lg:h-10 lg:w-10 p-0"
          >
            <MoreHorizontal className="h-4 w-4 lg:h-5 lg:w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onViewCandidate?.(candidate.id)}>
            <Eye className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setEditCandidateId(candidate.id);
            setEditDialogOpen(true);
          }}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {hasPermission('SPEAKING') && (
            <DropdownMenuItem onClick={() => {
              setSelectedCandidateId(candidate.id);
              setTestDialogOpen(true);
            }}>
              <Mic className="mr-2 h-4 w-4" />
              Speaking Test
            </DropdownMenuItem>
          )}
          {hasPermission('PROFICIENCY') && (
            <DropdownMenuItem onClick={() => {
              setSelectedCandidateId(candidate.id);
              setProficiencyDialogOpen(true);
            }}>
              <BookOpen className="mr-2 h-4 w-4" />
              Proficiency Test
            </DropdownMenuItem>
          )}
          {hasPermission('EQ') && (
            <DropdownMenuItem onClick={() => {
              setSelectedCandidateId(candidate.id);
              setEqDialogOpen(true);
            }}>
              <Brain className="mr-2 h-4 w-4" />
              EQ Test
            </DropdownMenuItem>
          )}
          {hasPermission('WRITING') && (
            <DropdownMenuItem onClick={() => {
              setSelectedCandidateId(candidate.id);
              setWritingDialogOpen(true);
            }}>
              <PenLine className="mr-2 h-4 w-4" />
              Writing Test
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={() => handleDeleteCandidate(candidate.id)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  };

  // Conditionally build columns based on isReport prop
  const columns: TableColumn<EnhancedCandidate>[] = isReport 
    ? [...baseColumns, ...reportColumns]
    : [...baseColumns, actionsColumn];

  const bulkActions = [
    {
      label: 'Delete Selected',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selectedIds: string[]) => {
        // Handle bulk delete
        console.log('Bulk delete:', selectedIds);
      },
      variant: 'destructive' as const
    },
    {
      label: 'Export Selected',
      icon: <Download className="h-4 w-4" />,
      onClick: (selectedIds: string[]) => {
        const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));
        exportCandidatesToCSV(selectedCandidates);
      }
    }
  ];

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load candidates. Please try again or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-none">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { saveAs } from 'file-saver';
import CreateTestDialog from './CreateTestDialog';
import CreateProficiencyTestDialog from './CreateProficiencyTestDialog';
import CreateEQTestDialog from './CreateEQTestDialog';
import CreateWritingTestDialog from './CreateWritingTestDialog';
import EnhancedCandidateProfilePanel from '../shared/EnhancedCandidateProfilePanel';
import EditCandidateDialog from '../shared/EditCandidateDialog';
import CreateCandidateDialog from '../shared/CreateCandidateDialog';
import { useCandidates, useCreateCandidate, useDeleteCandidate, usePermissions } from '@/hooks/api/useCompanyData';
import { designTokens } from '@/design-system/tokens';
import { TableColumn, Candidate } from '@/types/common';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Mic, BookOpen, Brain, Trash2, PenLine, Plus, Download, MessageSquare, Star, TrendingUp, CheckCircle, Clock, XCircle, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CandidateTestResult {
  status: 'completed' | 'pending' | 'not_taken';
  score?: number;
  level?: string;
  completedAt?: string;
}

interface EnhancedCandidate extends Candidate {
  speakingTest: CandidateTestResult;
  proficiencyTest: CandidateTestResult;
  writingTest: CandidateTestResult;
  eqTest: CandidateTestResult;
}

interface EnhancedCompanyCandidatesTableProps {
  companyId: string;
  onViewCandidate?: (candidateId: string) => void;
  isReport?: boolean;
}

const statusOptions = ['All', 'Completed', 'In Progress', 'Not Started'];

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
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-3 w-3" />;
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'in_progress':
      return <AlertCircle className="h-3 w-3" />;
    case 'failed':
      return <XCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const formatTestResult = (test: CandidateTestResult, testType: 'speaking' | 'proficiency' | 'writing' | 'eq') => {
  if (test.status === 'completed') {
    if (testType === 'speaking') {
      return { text: `${test.level} (${test.score}/100)`, score: test.score, level: test.level };
    } else if (testType === 'proficiency') {
      return { text: `${test.level} (${test.score}/40)`, score: test.score, level: test.level };
    } else if (testType === 'writing') {
      return { text: `${test.level} (${test.score}/100)`, score: test.score, level: test.level };
    } else {
      return { text: `${test.level} (${test.score})`, score: test.score, level: test.level };
    }
  } else if (test.status === 'pending') {
    return { text: 'In Progress', score: null, level: null };
  } else {
    return { text: 'Not Started', score: null, level: null };
  }
};

const getCEFRColor = (level: string) => {
  const colors = {
    'A1': 'bg-red-100 text-red-700 border-red-200',
    'A2': 'bg-orange-100 text-orange-700 border-orange-200',
    'B1': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'B2': 'bg-blue-100 text-blue-700 border-blue-200',
    'C1': 'bg-green-100 text-green-700 border-green-200',
    'C2': 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
};

function exportCandidatesToCSV(candidates: EnhancedCandidate[]) {
  const header = [
    'Name', 'Email', 'Overall Progress', 'Speaking Test', 'Proficiency Test', 'Writing Test', 'EQ Test', 'Created By', 'Created Date'
  ];
  const rows = candidates.map(c => [
    `${c.firstName} ${c.lastName}`,
    c.email,
    c.overallProgress,
    formatTestResult(c.speakingTest, 'speaking').text,
    formatTestResult(c.proficiencyTest, 'proficiency').text,
    formatTestResult(c.writingTest, 'writing').text,
    formatTestResult(c.eqTest, 'eq').text,
    c.createdBy ? `${c.createdBy.name} (${c.createdBy.role})` : 'N/A',
    new Date(c.createdAt).toLocaleDateString()
  ]);
  const csvContent = [header, ...rows]
    .map(row => row.map(field => `"${(field || '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'enhanced_candidates_report.csv');
}

const EnhancedCompanyCandidatesTable = ({ companyId, onViewCandidate, isReport }: EnhancedCompanyCandidatesTableProps) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [proficiencyDialogOpen, setProficiencyDialogOpen] = useState(false);
  const [eqDialogOpen, setEqDialogOpen] = useState(false);
  const [writingDialogOpen, setWritingDialogOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCandidateId, setEditCandidateId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // React Query hooks
  const { 
    data: candidatesResponse, 
    isLoading, 
    error,
    refetch 
  } = useCandidates(companyId, {
    page: currentPage,
    limit: pageSize,
    search,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const { data: permissions = [] } = usePermissions(companyId);
  const createCandidateMutation = useCreateCandidate(companyId);
  const deleteCandidateMutation = useDeleteCandidate();

  const candidates = (candidatesResponse?.data || []) as EnhancedCandidate[];
  const pagination = candidatesResponse?.pagination;

  // Helper function to check if a test type is enabled
  const hasPermission = (testType: string) => permissions.includes(testType);

  const handleCreateCandidate = async (candidateData: { firstName: string; lastName: string; email: string }) => {
    try {
      await createCandidateMutation.mutateAsync(candidateData);
      refetch(); // Refresh the candidates list
    } catch (error) {
      console.error('Failed to create candidate:', error);
      throw error; // Let the dialog handle the error display
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    
    try {
      await deleteCandidateMutation.mutateAsync(candidateId);
    } catch (error) {
      console.error('Failed to delete candidate:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    // Implement sorting logic with React Query
    console.log('Sort:', column, direction);
  };

  const handleRowSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(rowId => rowId !== id));
    }
  };

  // Helper function to get the latest completed test date
  const getLatestCompletedAt = (candidate: EnhancedCandidate) => {
    const completedTests = [
      candidate.speakingTest,
      candidate.proficiencyTest,
      candidate.writingTest,
      candidate.eqTest
    ].filter(test => test.status === 'completed' && test.completedAt);
    
    if (completedTests.length === 0) return 'N/A';
    
    const latestDate = completedTests
      .map(test => new Date(test.completedAt!))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    return latestDate.toLocaleDateString();
  };

  // Define base columns with enhanced responsive design for larger screens
  const baseColumns: TableColumn<EnhancedCandidate>[] = [
    {
      key: 'firstName',
      label: 'Candidate',
      sortable: true,
      {/* Enhanced Stats Cards - also responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm lg:text-base font-medium text-blue-700">Total Candidates</p>
                <p className="text-2xl lg:text-3xl font-bold text-blue-900">{pagination?.totalCount || 0}</p>
      width: 'auto',
      render: (_, candidate) => (
        <div className="flex items-center gap-3 min-w-[200px] lg:min-w-[280px]">
          <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              </div>
              <Users className="h-8 w-8 lg:h-10 lg:w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm lg:text-base font-medium text-green-700">Completed</p>
                <p className="text-2xl lg:text-3xl font-bold text-green-900">
                  {candidates.filter(c => Number(c.overallProgress) === 100).length}
            {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">
              {candidate.firstName} {candidate.lastName}
            </div>
            <div className="text-xs lg:text-sm text-gray-500 truncate">
              ID: {candidate.id.slice(-8)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Contact',
      sortable: true,
      width: 'auto',
      render: (_, candidate) => (
        <div className="min-w-[200px] lg:min-w-[280px]">
                </p>
              </div>
              <CheckCircle className="h-8 w-8 lg:h-10 lg:w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm lg:text-base font-medium text-yellow-700">In Progress</p>
                <p className="text-2xl lg:text-3xl font-bold text-yellow-900">
                  {candidates.filter(c => Number(c.overallProgress) > 0 && Number(c.overallProgress) < 100).length}
          <div className="text-sm text-gray-900 break-words">
            {candidate.email}
          </div>
          <div className="text-xs lg:text-sm text-gray-500">
            Added {new Date(candidate.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: 'overallProgress',
      label: 'Progress',
                </p>
              </div>
              <Clock className="h-8 w-8 lg:h-10 lg:w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm lg:text-base font-medium text-purple-700">Avg. Progress</p>
      width: 'auto',
      render: (progress) => (
        <div className="space-y-2 min-w-[120px] lg:min-w-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
            <div className="flex items-center gap-1">
              {progress === 100 && <Star className="h-4 w-4 text-yellow-500" />}
              {progress >= 75 && progress < 100 && <TrendingUp className="h-4 w-4 text-green-500" />}
                <p className="text-2xl lg:text-3xl font-bold text-purple-900">
                  {candidates.length > 0 
                    ? Math.round(candidates.reduce((sum, c) => sum + Number(c.overallProgress), 0) / candidates.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 lg:h-10 lg:w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Table with responsive container */}
            </div>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              'h-2',
              progress === 100 ? '[&>div]:bg-green-500' :
              progress >= 75 ? '[&>div]:bg-blue-500' :
              progress >= 50 ? '[&>div]:bg-yellow-500' :
              '[&>div]:bg-red-500'
            )}
          />
        </div>
      )
    },
    {
      key: 'speakingTest',
      label: 'Speaking',
      width: 'auto',
      render: (test: CandidateTestResult) => {
        const result = formatTestResult(test, 'speaking');
        return (
          <div className="space-y-1 min-w-[140px] lg:min-w-[160px]">
            <Badge 
              variant="outline" 
              className={cn(
                'flex items-center gap-1 text-xs font-medium border transition-colors',
                getStatusColor(test.status)
              )}
            >
              {getStatusIcon(test.status)}
      <div className="w-full overflow-x-auto">
        <EnhancedTable
          data={candidates}
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onSort={handleSort}
          emptyMessage="No candidates found. Start by adding your first candidate to begin assessments."
          caption="List of candidates with their test progress and results"
          searchable={true}
          searchPlaceholder="Search candidates by name or email..."
          onSearch={(query) => {
            // Handle search
              <MessageSquare className="h-3 w-3" />
              {result.level || 'Pending'}
            </Badge>
            {result.score && (
              <div className="text-xs text-gray-600">
                Score: {result.score}/100
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'proficiencyTest',
      label: 'Proficiency',
      width: 'auto',
      render: (test: CandidateTestResult) => {
        const result = formatTestResult(test, 'proficiency');
            console.log('Search:', query);
          }}
          onRefresh={refetch}
          onExport={() => exportCandidatesToCSV(candidates)}
          isRefreshing={isLoading}
          selectable={!isReport}
          selectedRows={selectedRows}
          onRowSelect={handleRowSelect}
          bulkActions={bulkActions}
          density="normal"
          className="shadow-sm w-full"
        />
      </div>

      {/* Dialogs */}
      <CreateCandidateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCandidate}
        loading={createCandidateMutation.isPending}
      />
      {editCandidateId && (
        <EditCandidateDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          candidateId={editCandidateId}
          companyId={companyId}
          userRole="companyadmin"
          onSuccess={() => {
            setEditCandidateId(null);
            refetch();
          }}
        />
      )}
      {selectedCandidateId && (
        <>
          <CreateTestDialog
            open={testDialogOpen}
            onOpenChange={setTestDialogOpen}
            companyId={companyId}
            onSuccess={refetch}
            candidate={
              candidates.find(c => c.id === selectedCandidateId) 
                ? {
                    ...candidates.find(c => c.id === selectedCandidateId)!,
                  }
                : undefined
            }
          />
          <CreateProficiencyTestDialog
            open={proficiencyDialogOpen}
            onOpenChange={setProficiencyDialogOpen}
            companyId={companyId}
            onSuccess={refetch}
            candidate={
              candidates.find(c => c.id === selectedCandidateId) 
                ? {
                    ...candidates.find(c => c.id === selectedCandidateId)!,
                  }
                : undefined
            }
          />
          <CreateEQTestDialog
            open={eqDialogOpen}
            onOpenChange={setEqDialogOpen}
            companyId={companyId}
            onSuccess={refetch}
            candidate={
              candidates.find(c => c.id === selectedCandidateId) 
                ? {
                    ...candidates.find(c => c.id === selectedCandidateId)!,
                  }
                : undefined
            }
          />
          <CreateWritingTestDialog
            open={writingDialogOpen}
            onOpenChange={setWritingDialogOpen}
            candidate={
              candidates.find(c => c.id === selectedCandidateId)
                ? { ...candidates.find(c => c.id === selectedCandidateId)! }
                : undefined
            }
            onTestCreated={refetch}
          />
        </>
      )}
    </div>
  );
};

export default EnhancedCompanyCandidatesTable; 