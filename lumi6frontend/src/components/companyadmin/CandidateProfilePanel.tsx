import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { designTokens } from '@/design-system/tokens';
import { ArrowLeft, AlertCircle, TrendingUp, Calendar, History, User, Mail, Trophy, BarChart3, MessageSquare, FileText, Brain, BookOpen, PenTool, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import CandidateResultPanel from '@/components/shared/CandidateResultPanel';
import IndividualCandidateReport from '@/components/shared/IndividualCandidateReport';
import { usePermissions } from '@/hooks/api/useCompanyData';
import axios from 'axios';

interface TestAttempt {
  id: string;
  status: 'completed' | 'pending' | 'not_taken';
  score?: number;
  level?: string;
  completedAt: string;
  createdAt: string;
  // Speaking specific
  fluencyScore?: number;
  pronunciationScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  // EQ specific
  moduleScores?: any;
  submoduleScores?: any;
  inconsistencyIndex?: number;
  inconsistencyRating?: string;
}

interface EnhancedCandidateData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
  companyId: string;
  
  // Test arrays with full history
  speakingTests: TestAttempt[];
  proficiencyTests: TestAttempt[];
  eqTests: TestAttempt[];
  writingTests: TestAttempt[];
  
  // Summary data
  totalTestsCompleted: number;
  totalTestsAssigned: number;
  progressPercentage: number;
  
  // Latest results for quick access
  latestSpeaking: TestAttempt | null;
  latestProficiency: TestAttempt | null;
  latestEQ: TestAttempt | null;
  latestWriting: TestAttempt | null;
  
  createdBy: any;
}

interface CandidateProfilePanelProps {
  candidateId: string;
  onBack: () => void;
  companyId?: string;
}

const CEFR_LEVELS = {
  A1: 'bg-red-100 text-red-800 border-red-200',
  A2: 'bg-orange-100 text-orange-800 border-orange-200',
  B1: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  B2: 'bg-green-100 text-green-800 border-green-200',
  C1: 'bg-blue-100 text-blue-800 border-blue-200',
  C2: 'bg-purple-100 text-purple-800 border-purple-200',
};

// React Query hook for enhanced candidate data
const useEnhancedCandidateData = (candidateId: string, companyId?: string) => {
  return useQuery({
    queryKey: ['enhancedCandidate', candidateId, companyId],
    queryFn: async (): Promise<EnhancedCandidateData> => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      console.log('🔍 Enhanced Candidate Debug Info:');
      console.log('  - candidateId:', candidateId);
      console.log('  - companyId param:', companyId);
      console.log('  - API_URL:', API_URL);
      console.log('  - token exists:', !!token);
      
      // Get companyId from token if not provided
      let finalCompanyId = companyId;
      if (!finalCompanyId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          finalCompanyId = payload.companyId;
          console.log('  - companyId from token:', finalCompanyId);
        } catch (err) {
          console.error('Failed to decode token:', err);
        }
      }

      if (!finalCompanyId) {
        throw new Error('Company ID is required');
      }

      const apiUrl = `${API_URL}/api/companies/${finalCompanyId}/candidates/${candidateId}/enhanced`;
      console.log('  - Final API URL:', apiUrl);
      
      const response = await axios.get(apiUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      console.log('  - Enhanced response:', response.data);
      return response.data;
    },
    enabled: !!candidateId
  });
};

const CandidateProfilePanel = ({ candidateId, onBack, companyId }: CandidateProfilePanelProps) => {
  const { data, isLoading, error, refetch } = useEnhancedCandidateData(candidateId, companyId);
  
  // Get permissions for dynamic tab rendering
  const { data: permissions, isLoading: permissionsLoading } = usePermissions(companyId || data?.companyId || '');
  
  const hasPermission = (testType: string) => {
    if (!permissions) return true; // Show all while loading
    // permissions is an array of TestType strings, not objects
    return permissions.some(permission => permission.toLowerCase() === testType.toLowerCase());
  };

  // Loading skeleton
  if (isLoading || permissionsLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-48 h-6" />
        </div>
        <Skeleton className="w-full h-32" />
        <div className="space-y-4">
          <Skeleton className="w-full h-16" />
          <Skeleton className="w-full h-16" />
          <Skeleton className="w-full h-16" />
        </div>
      </div>
    );
  }

  // Error handling
  if (error) {
    return (
      <div className="flex-1 p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error instanceof Error ? error.message : 'Failed to load candidate data. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  // Prepare combined test history for overview
  const allTestHistory = [
    ...data.speakingTests.map(t => ({...t, type: 'Speaking' as const})),
    ...data.eqTests.map(t => ({...t, type: 'EQ' as const})),
    ...data.proficiencyTests.map(t => ({...t, type: 'Proficiency' as const})),
    ...data.writingTests.map(t => ({...t, type: 'Writing' as const}))
  ].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  // Determine available tabs based on permissions and data
  const availableTabs = [
    { 
      key: 'overview', 
      label: 'Overview', 
      icon: BarChart3,
      available: true 
    },
    { 
      key: 'speaking', 
      label: 'Speaking Report', 
      icon: MessageSquare,
      available: hasPermission('speaking') && data.speakingTests.length > 0,
      disabled: !data.latestSpeaking || data.latestSpeaking.status !== 'completed'
    },
    { 
      key: 'eq', 
      label: 'EQ Report', 
      icon: Brain,
      available: hasPermission('eq') && data.eqTests.length > 0,
      disabled: !data.latestEQ || data.latestEQ.status !== 'completed'
    },
    { 
      key: 'proficiency', 
      label: 'Proficiency Report', 
      icon: BookOpen,
      available: hasPermission('proficiency') && data.proficiencyTests.length > 0,
      disabled: !data.latestProficiency || data.latestProficiency.status !== 'completed'
    },
    { 
      key: 'writing', 
      label: 'Writing Report', 
      icon: PenTool,
      available: hasPermission('writing') && data.writingTests.length > 0,
      disabled: !data.latestWriting || data.latestWriting.status !== 'completed'
    },
    { 
      key: 'comprehensive', 
      label: 'Full Report', 
      icon: FileText,
      available: true 
    }
  ].filter(tab => tab.available);

  // If only one test type is enabled and available, default to that tab
  const testTabs = availableTabs.filter(tab => ['speaking', 'eq', 'proficiency', 'writing'].includes(tab.key));
  const defaultTab = testTabs.length === 1 ? testTabs[0].key : 'overview';

  // Prepare latest test info for overview
  const latestTest = data.latestSpeaking || data.latestEQ || data.latestProficiency || data.latestWriting;
  const testType = data.latestSpeaking ? 'Speaking' : 
                 data.latestEQ ? 'EQ Assessment' :
                 data.latestProficiency ? 'Proficiency' : 'Writing';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">
            Candidate Report
          </h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Candidate Info Card */}
        <Card className="border border-gray-200 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {data.firstName} {data.lastName}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{data.email}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">Progress</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {data.progressPercentage}%
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {data.totalTestsCompleted}/{data.totalTestsAssigned} tests completed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className={cn(
            "grid w-full",
            availableTabs.length === 1 && "grid-cols-1",
            availableTabs.length === 2 && "grid-cols-2", 
            availableTabs.length === 3 && "grid-cols-3",
            availableTabs.length === 4 && "grid-cols-4",
            availableTabs.length === 5 && "grid-cols-5",
            availableTabs.length === 6 && "grid-cols-6"
          )}>
            {availableTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.key}
                  value={tab.key} 
                  className="flex items-center gap-2"
                  disabled={tab.disabled}
                >
                  <IconComponent className="h-4 w-4" />
                  {tab.label}
                  {tab.disabled && <span className="text-xs text-gray-400">(Not Available)</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Latest Result Card - Show any latest test result */}
            {(data.latestSpeaking || data.latestEQ || data.latestProficiency || data.latestWriting) && (
              <Card className="border border-blue-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Latest Assessment Result
                    </CardTitle>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Score Overview - Show latest available test */}
                  {latestTest && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Badge 
                            className={cn(
                              'text-base font-semibold px-4 py-2 border',
                              latestTest.level && CEFR_LEVELS[latestTest.level as keyof typeof CEFR_LEVELS] || 'bg-gray-200 text-gray-800 border-gray-300'
                            )}
                          >
                            {latestTest.level || 'Score'}
                          </Badge>
                          
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Latest {testType} Score</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {latestTest.score}{testType === 'Proficiency' ? '/40' : '/100'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {new Date(latestTest.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <Progress 
                        value={testType === 'Proficiency' ? (latestTest.score! / 40) * 100 : latestTest.score} 
                        className="h-3" 
                      />
                    </div>
                  )}
                  
                  {/* Speaking Test Detailed Scores - Only show if speaking test exists */}
                  {data.latestSpeaking && (
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Speaking Skills Breakdown</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { label: 'Fluency', score: data.latestSpeaking.fluencyScore, icon: '🗣️' },
                          { label: 'Grammar', score: data.latestSpeaking.grammarScore, icon: '📝' },
                          { label: 'Vocabulary', score: data.latestSpeaking.vocabularyScore, icon: '📚' },
                          { label: 'Pronunciation', score: data.latestSpeaking.pronunciationScore, icon: '🎯' },
                        ].filter(item => item.score !== undefined).map((item, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{item.icon}</span>
                                <span className="font-medium text-gray-900">{item.label}</span>
                              </div>
                              <span className="text-lg font-semibold text-gray-900">
                                {item.score || '-'}/5
                              </span>
                            </div>
                            <Progress 
                              value={(item.score || 0) * 20} 
                              className="h-3"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* History Section - Show any test history */}
            {allTestHistory.length > 1 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <History className="h-4 w-4 text-gray-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Assessment History
                    </CardTitle>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="history" className="border-none">
                      <AccordionTrigger className="text-base font-medium text-gray-700 hover:text-gray-900 py-4">
                        Show All Test Results ({allTestHistory.length} test{allTestHistory.length > 1 ? 's' : ''})
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-4">
                          {allTestHistory.map((result, idx) => (
                            <div key={result.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <Badge 
                                    className={cn(
                                      'text-sm font-semibold px-3 py-1 border',
                                      CEFR_LEVELS[result.level as keyof typeof CEFR_LEVELS] || 'bg-gray-200 text-gray-800 border-gray-300'
                                    )}
                                  >
                                    {result.level}
                                  </Badge>
                                  
                                  <div>
                                    <p className="text-sm text-gray-600">Overall Score</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                      {result.score}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  <span className="text-sm">
                                    {new Date(result.completedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-3">
                                {[
                                  { label: 'Fluency', score: result.fluencyScore },
                                  { label: 'Grammar', score: result.grammarScore },
                                  { label: 'Vocabulary', score: result.vocabularyScore },
                                  { label: 'Pronunciation', score: result.pronunciationScore },
                                ].filter(item => item.score !== undefined).map((item, index) => (
                                  <div key={index} className="bg-white p-3 rounded-lg border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        {item.score || '-'}/5
                                      </span>
                                    </div>
                                    <Progress 
                                      value={(item.score || 0) * 20} 
                                      className="h-2"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* No Results State */}
            {(data.speakingTests.length === 0 && data.eqTests.length === 0 && 
              data.proficiencyTests.length === 0 && data.writingTests.length === 0) && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Assessment Results
                  </h3>
                  <p className="text-gray-500">
                    This candidate hasn't completed any assessments yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="speaking" className="space-y-6">
            {data.latestSpeaking ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <CandidateResultPanel 
                  candidateId={candidateId} 
                  showAsFullReport={true}
                />
              </div>
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Speaking Assessment Not Completed
                  </h3>
                  <p className="text-gray-500">
                    The detailed speaking report will be available once the candidate completes their speaking assessment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="eq" className="space-y-6">
            {data.latestEQ ? (
              <div className="space-y-6">
                {/* EQ Latest Result */}
                <Card className="border border-purple-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Brain className="h-4 w-4 text-purple-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Latest EQ Assessment
                      </CardTitle>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Badge className="text-base font-semibold px-4 py-2 bg-purple-100 text-purple-800 border-purple-300">
                            {data.latestEQ.level}
                          </Badge>
                          
                          <div>
                            <p className="text-sm text-gray-600 mb-1">EQ Score</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {data.latestEQ.score}/100
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {new Date(data.latestEQ.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <Progress value={data.latestEQ.score} className="h-3" />
                    </div>
                    
                    {data.latestEQ.moduleScores && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-4">EQ Module Breakdown</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {Object.entries(data.latestEQ.moduleScores as Record<string, number>).map(([module, score]) => (
                            <div key={module} className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-900 capitalize">{module.replace(/([A-Z])/g, ' $1')}</span>
                                <span className="text-lg font-semibold text-gray-900">
                                  {Math.round(score as number)}/100
                                </span>
                              </div>
                              <Progress value={score as number} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* EQ History */}
                {data.eqTests.length > 1 && (
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <History className="h-4 w-4 text-gray-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          EQ Assessment History
                        </CardTitle>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="history" className="border-none">
                          <AccordionTrigger className="text-base font-medium text-gray-700 hover:text-gray-900 py-4">
                            Show Previous Results ({data.eqTests.length - 1} test{data.eqTests.length - 1 > 1 ? 's' : ''})
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <div className="space-y-4">
                              {data.eqTests.slice(1).map((result) => (
                                <div key={result.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                      {result.level}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs">
                                        {new Date(result.completedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Score: {result.score}/100</span>
                                    <Progress value={result.score} className="h-2 w-24" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    EQ Assessment Not Completed
                  </h3>
                  <p className="text-gray-500">
                    The detailed EQ report will be available once the candidate completes their EQ assessment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="proficiency" className="space-y-6">
            {data.latestProficiency ? (
              <div className="space-y-6">
                {/* Proficiency Latest Result */}
                <Card className="border border-green-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-green-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Latest Proficiency Test
                      </CardTitle>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Badge className="text-base font-semibold px-4 py-2 bg-green-100 text-green-800 border-green-300">
                            {data.latestProficiency.level}
                          </Badge>
                          
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Score</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {data.latestProficiency.score}/40
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {new Date(data.latestProficiency.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <Progress value={(data.latestProficiency.score! / 40) * 100} className="h-3" />
                      <div className="text-sm text-gray-600 mt-2">
                        {Math.round((data.latestProficiency.score! / 40) * 100)}% accuracy
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Proficiency History */}
                {data.proficiencyTests.length > 1 && (
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <History className="h-4 w-4 text-gray-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Proficiency Test History
                        </CardTitle>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="history" className="border-none">
                          <AccordionTrigger className="text-base font-medium text-gray-700 hover:text-gray-900 py-4">
                            Show Previous Results ({data.proficiencyTests.length - 1} test{data.proficiencyTests.length - 1 > 1 ? 's' : ''})
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <div className="space-y-4">
                              {data.proficiencyTests.slice(1).map((result) => (
                                <div key={result.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge className="bg-green-100 text-green-800 border-green-300">
                                      {result.level}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs">
                                        {new Date(result.completedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Score: {result.score}/40</span>
                                    <Progress value={(result.score! / 40) * 100} className="h-2 w-24" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Proficiency Test Not Completed
                  </h3>
                  <p className="text-gray-500">
                    The detailed proficiency report will be available once the candidate completes their proficiency test.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="writing" className="space-y-6">
            {data.latestWriting ? (
              <div className="space-y-6">
                {/* Writing Latest Result */}
                <Card className="border border-orange-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <PenTool className="h-4 w-4 text-orange-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Latest Writing Assessment
                      </CardTitle>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border border-orange-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Badge className="text-base font-semibold px-4 py-2 bg-orange-100 text-orange-800 border-orange-300">
                            {data.latestWriting.level}
                          </Badge>
                          
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Overall Score</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {data.latestWriting.score}/100
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {new Date(data.latestWriting.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <Progress value={data.latestWriting.score} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                {/* Writing History */}
                {data.writingTests.length > 1 && (
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <History className="h-4 w-4 text-gray-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Writing Assessment History
                        </CardTitle>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="history" className="border-none">
                          <AccordionTrigger className="text-base font-medium text-gray-700 hover:text-gray-900 py-4">
                            Show Previous Results ({data.writingTests.length - 1} test{data.writingTests.length - 1 > 1 ? 's' : ''})
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <div className="space-y-4">
                              {data.writingTests.slice(1).map((result) => (
                                <div key={result.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                      {result.level}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs">
                                        {new Date(result.completedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Score: {result.score}/100</span>
                                    <Progress value={result.score} className="h-2 w-24" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <PenTool className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Writing Assessment Not Completed
                  </h3>
                  <p className="text-gray-500">
                    The detailed writing report will be available once the candidate completes their writing assessment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comprehensive" className="space-y-6">
            <IndividualCandidateReport 
              candidateId={candidateId} 
              companyId={companyId || data?.companyId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CandidateProfilePanel; 