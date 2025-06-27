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
import { ArrowLeft, AlertCircle, TrendingUp, Calendar, History, User, Mail, Trophy, BarChart3, MessageSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import CandidateResultPanel from '@/components/shared/CandidateResultPanel';
import axios from 'axios';

interface TestResult {
  timestamp: string;
  overallScore: number;
  cefrLevel: string;
  speakingScore?: number;
  fluencyScore?: number;
  pronunciationScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
}

interface CandidateProgressData {
  fullName: string;
  email: string;
  results: TestResult[];
  hasCompletedSpeaking?: boolean;
  speakingTestId?: string;
}

interface CandidateProfilePanelProps {
  candidateId: string;
  onBack: () => void;
}

const CEFR_LEVELS = {
  A1: 'bg-red-100 text-red-800 border-red-200',
  A2: 'bg-orange-100 text-orange-800 border-orange-200',
  B1: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  B2: 'bg-green-100 text-green-800 border-green-200',
  C1: 'bg-blue-100 text-blue-800 border-blue-200',
  C2: 'bg-purple-100 text-purple-800 border-purple-200',
};

// React Query hook for candidate progress
const useCandidateProgress = (candidateId: string) => {
  return useQuery({
    queryKey: ['candidateProgress', candidateId],
    queryFn: async (): Promise<CandidateProgressData> => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      // First try to get enhanced candidate data
      try {
        const enhancedResponse = await axios.get(`${API_URL}/api/candidates/${candidateId}/enhanced`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        const candidate = enhancedResponse.data;
        console.log('Enhanced candidate data:', candidate);
        
        // Check if speaking test is completed
        const hasCompletedSpeaking = candidate.speakingTest?.status === 'completed';
        const speakingTestId = candidate.speakingTest?.id;
        
        // If we have speaking test results, format them for the progress display
        if (hasCompletedSpeaking && candidate.speakingTest) {
          const speakingResult = {
            timestamp: candidate.speakingTest.completedAt || candidate.createdAt,
            overallScore: candidate.speakingTest.score || 0,
            cefrLevel: candidate.speakingTest.level || 'A1',
            speakingScore: candidate.speakingTest.score ? Math.round(candidate.speakingTest.score / 20) : undefined,
            fluencyScore: candidate.speakingTest.fluencyScore,
            pronunciationScore: candidate.speakingTest.pronunciationScore,
            grammarScore: candidate.speakingTest.grammarScore,
            vocabularyScore: candidate.speakingTest.vocabularyScore,
          };
          
          return {
            fullName: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email,
            results: [speakingResult],
            hasCompletedSpeaking,
            speakingTestId
          };
        }
        
        // If no speaking test completed, return basic info
        return {
          fullName: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          results: [],
          hasCompletedSpeaking: false,
          speakingTestId: undefined
        };
        
      } catch (enhancedError) {
        console.log('Enhanced data not available, trying original endpoint:', enhancedError);
        
        // Fallback to original progress endpoint
        const response = await axios.get(`${API_URL}/api/candidates/${candidateId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        return {
          ...response.data,
          hasCompletedSpeaking: false,
          speakingTestId: undefined
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
};

const CandidateProfilePanel = ({ candidateId, onBack }: CandidateProfilePanelProps) => {
  const { data, isLoading, error, refetch } = useCandidateProgress(candidateId);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="h-full bg-white border-l border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full bg-white border-l border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <Button size="default" variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Candidate Report</h1>
          </div>
        </div>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load candidate report. Please try again.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-6">
            <Button onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="h-full bg-white border-l border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <Button size="default" variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Candidate Report</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-16">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No test results found
            </h3>
            <p className="text-gray-500">
              This candidate hasn't completed any assessments yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const results = data.results ? [...data.results].reverse() : []; // Latest first
  const latest = results[0];
  const history = results.slice(1);

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col max-w-4xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button 
            size="default" 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
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
                    {data.fullName}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{data.email}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Tests</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {results.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="speaking" 
              className="flex items-center gap-2"
              disabled={!data.hasCompletedSpeaking}
            >
              <MessageSquare className="h-4 w-4" />
              Speaking Report
              {!data.hasCompletedSpeaking && <span className="text-xs text-gray-400">(Not Available)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Latest Result Card */}
            {latest && (
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
                  {/* Score Overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Badge 
                          className={cn(
                            'text-base font-semibold px-4 py-2 border',
                            CEFR_LEVELS[latest.cefrLevel as keyof typeof CEFR_LEVELS] || 'bg-gray-200 text-gray-800 border-gray-300'
                          )}
                        >
                          {latest.cefrLevel}
                        </Badge>
                        
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Overall Score</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {latest.overallScore}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {new Date(latest.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed Scores */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Detailed Breakdown</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { label: 'Fluency', score: latest.fluencyScore, icon: '🗣️' },
                        { label: 'Grammar', score: latest.grammarScore, icon: '📝' },
                        { label: 'Vocabulary', score: latest.vocabularyScore, icon: '📚' },
                        { label: 'Pronunciation', score: latest.pronunciationScore, icon: '🎯' },
                        { label: 'Speaking', score: latest.speakingScore, icon: '💬' }
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
                </CardContent>
              </Card>
            )}

            {/* History Section */}
            {history.length > 0 && (
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
                        Show Previous Results ({history.length} test{history.length > 1 ? 's' : ''})
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-6">
                          {history.map((result, idx) => (
                            <div key={result.timestamp} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <Badge 
                                    className={cn(
                                      'text-sm font-semibold px-3 py-1 border',
                                      CEFR_LEVELS[result.cefrLevel as keyof typeof CEFR_LEVELS] || 'bg-gray-200 text-gray-800 border-gray-300'
                                    )}
                                  >
                                    {result.cefrLevel}
                                  </Badge>
                                  
                                  <div>
                                    <p className="text-sm text-gray-600">Overall Score</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                      {result.overallScore}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  <span className="text-sm">
                                    {new Date(result.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-3">
                                {[
                                  { label: 'Fluency', score: result.fluencyScore },
                                  { label: 'Grammar', score: result.grammarScore },
                                  { label: 'Vocabulary', score: result.vocabularyScore },
                                  { label: 'Pronunciation', score: result.pronunciationScore },
                                  { label: 'Speaking', score: result.speakingScore }
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
            {results.length === 0 && (
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
            {data.hasCompletedSpeaking && data.speakingTestId ? (
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
        </Tabs>
      </div>
    </div>
  );
};

export default CandidateProfilePanel; 