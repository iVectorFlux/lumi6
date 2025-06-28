import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock,
  Mic,
  BookOpen,
  PenTool,
  Brain,
  BarChart3,
  Calendar,
  Award,
  Target,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { designTokens } from '@/design-system/tokens';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { usePermissions } from '@/hooks/api/useCompanyData';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => any;
    lastAutoTable: any;
  }
}

interface ComprehensiveReportPanelProps {
  userRole: 'companyadmin' | 'superadmin';
  companyId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

interface ReportMetrics {
  overview: {
    totalCandidates: number;
    completedTests: number;
    activeTests: number;
    completionRate: number;
    averageScore: number;
    successRate: number;
  };
  testTypes: {
    speaking: {
      total: number;
      completed: number;
      averageScore: number;
      cefrDistribution: Record<string, number>;
    };
    proficiency: {
      total: number;
      completed: number;
      averageScore: number;
      cefrDistribution: Record<string, number>;  
    };
    writing: {
      total: number;
      completed: number;
      averageScore: number;
      levelDistribution: Record<string, number>;
    };
    eq: {
      total: number;
      completed: number;
      averageScore: number;
      levelDistribution: Record<string, number>;
    };
  };
  timeline: Array<{
    date: string;
    testsCreated: number;
    testsCompleted: number;
    candidatesRegistered: number;
  }>;
  creditUsage?: {
    totalConsumed: number;
    byTestType: Record<string, { consumed: number; tests: number }>;
  } | null;
}

const CEFR_COLORS = {
  A1: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  A2: { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-300' },
  B1: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  B2: { bg: 'bg-green-200', text: 'text-green-900', border: 'border-green-300' },
  C1: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  C2: { bg: 'bg-yellow-200', text: 'text-yellow-900', border: 'border-yellow-300' },
};

const EQ_COLORS = {
  'Very High': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'High': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Average': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Below Average': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Low': { bg: 'bg-red-100', text: 'text-red-800' }
};

const TEST_ICONS = {
  speaking: { icon: Mic, color: 'text-blue-600', bg: 'bg-blue-50' },
  proficiency: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
  writing: { icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50' },
  eq: { icon: Brain, color: 'text-orange-600', bg: 'bg-orange-50' }
};

export const ComprehensiveReportPanel = ({ 
  userRole, 
  companyId, 
  dateRange 
}: ComprehensiveReportPanelProps) => {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exportingPDF, setExportingPDF] = useState(false);

  // Get permissions for filtering
  const { data: permissions } = usePermissions(companyId || '');
  
  const hasPermission = (testType: string) => {
    if (!permissions) return true; // Default to showing all if permissions not loaded
    const permission = permissions.find(p => p.testType.toLowerCase() === testType.toLowerCase());
    return permission?.isEnabled ?? true;
  };

  useEffect(() => {
    fetchComprehensiveMetrics();
  }, [userRole, companyId, dateRange]);

  const fetchComprehensiveMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch multiple endpoints in parallel
      const promises = [];
      
      if (userRole === 'superadmin') {
        promises.push(
          axios.get(`${API_URL}/api/superadmin/reports/comprehensive-metrics`, { headers })
        );
      } else if (companyId) {
        promises.push(
          axios.get(`${API_URL}/api/companies/${companyId}/stats`, { headers }),
          axios.get(`${API_URL}/api/companies/${companyId}/analytics/success-rate`, { headers }),
          axios.get(`${API_URL}/api/companies/${companyId}/candidates/enhanced`, { headers }),
          axios.get(`${API_URL}/api/credits/analytics/${companyId}`, { headers })
        );
      }

      const responses = await Promise.all(promises);
      
      if (userRole === 'superadmin') {
        setMetrics(responses[0].data);
      } else {
        // Combine company data
        const stats = responses[0].data;
        const successRate = responses[1].data;
        const candidates = responses[2].data.candidates || [];
        const creditAnalytics = responses[3].data.analytics || {};

        // Process candidate data to create comprehensive metrics
        const processedMetrics = processCompanyMetrics(stats, successRate, candidates, creditAnalytics);
        setMetrics(processedMetrics);
      }
    } catch (err: any) {
      console.error('Error fetching comprehensive metrics:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processCompanyMetrics = (stats: any, successRate: any, candidates: any[], creditAnalytics: any): ReportMetrics => {
    // Process candidates to extract test metrics
    const testMetrics = {
      speaking: { total: 0, completed: 0, scores: [] as number[], cefrLevels: [] as string[] },
      proficiency: { total: 0, completed: 0, scores: [] as number[], cefrLevels: [] as string[] },
      writing: { total: 0, completed: 0, scores: [] as number[], levels: [] as string[] },
      eq: { total: 0, completed: 0, scores: [] as number[], levels: [] as string[] }
    };

    candidates.forEach(candidate => {
      // Speaking test
      if (hasPermission('speaking') && candidate.speakingTest) {
        testMetrics.speaking.total++;
        if (candidate.speakingTest.status === 'completed') {
          testMetrics.speaking.completed++;
          if (candidate.speakingTest.score) testMetrics.speaking.scores.push(candidate.speakingTest.score);
          if (candidate.speakingTest.level) testMetrics.speaking.cefrLevels.push(candidate.speakingTest.level);
        }
      }

      // Proficiency test
      if (hasPermission('proficiency') && candidate.proficiencyTest) {
        testMetrics.proficiency.total++;
        if (candidate.proficiencyTest.status === 'completed') {
          testMetrics.proficiency.completed++;
          if (candidate.proficiencyTest.score) testMetrics.proficiency.scores.push(candidate.proficiencyTest.score);
          if (candidate.proficiencyTest.level) testMetrics.proficiency.cefrLevels.push(candidate.proficiencyTest.level);
        }
      }

      // Writing test
      if (hasPermission('writing') && candidate.writingTest) {
        testMetrics.writing.total++;
        if (candidate.writingTest.status === 'completed') {
          testMetrics.writing.completed++;
          if (candidate.writingTest.score) testMetrics.writing.scores.push(candidate.writingTest.score);
          if (candidate.writingTest.level) testMetrics.writing.levels.push(candidate.writingTest.level);
        }
      }

      // EQ test
      if (hasPermission('eq') && candidate.eqTest) {
        testMetrics.eq.total++;
        if (candidate.eqTest.status === 'completed') {
          testMetrics.eq.completed++;
          if (candidate.eqTest.score) testMetrics.eq.scores.push(candidate.eqTest.score);
          if (candidate.eqTest.level) testMetrics.eq.levels.push(candidate.eqTest.level);
        }
      }
    });

    // Calculate distributions
    const cefrDistribution = (levels: string[]) => {
      return levels.reduce((acc, level) => {
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    };

    const avgScore = (scores: number[]) => scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      overview: {
        totalCandidates: stats.totalCandidates || 0,
        completedTests: stats.completedTests || 0,
        activeTests: stats.activeTests || 0,
        completionRate: stats.completionRate || 0,
        averageScore: 0, // Will calculate from individual tests
        successRate: successRate.successRate || 0
      },
      testTypes: {
        speaking: {
          total: testMetrics.speaking.total,
          completed: testMetrics.speaking.completed,
          averageScore: avgScore(testMetrics.speaking.scores),
          cefrDistribution: cefrDistribution(testMetrics.speaking.cefrLevels)
        },
        proficiency: {
          total: testMetrics.proficiency.total,
          completed: testMetrics.proficiency.completed,
          averageScore: avgScore(testMetrics.proficiency.scores),
          cefrDistribution: cefrDistribution(testMetrics.proficiency.cefrLevels)
        },
        writing: {
          total: testMetrics.writing.total,
          completed: testMetrics.writing.completed,
          averageScore: avgScore(testMetrics.writing.scores),
          levelDistribution: cefrDistribution(testMetrics.writing.levels)
        },
        eq: {
          total: testMetrics.eq.total,
          completed: testMetrics.eq.completed,
          averageScore: avgScore(testMetrics.eq.scores),
          levelDistribution: cefrDistribution(testMetrics.eq.levels)
        }
      },
      timeline: [], // TODO: Implement timeline data
      creditUsage: {
        totalConsumed: Object.values(creditAnalytics).reduce((sum: number, item: any) => sum + (item?.consumed || 0), 0),
        byTestType: creditAnalytics
      }
    };
  };

  if (loading) {
    return <ReportLoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Report data is not available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className={cn(designTokens.typography.heading1, 'text-gray-900')}>
            📊 Comprehensive Assessment Report
          </h1>
          <p className="text-gray-600 mt-2">
            Complete analytics and insights for {userRole === 'superadmin' ? 'all companies' : 'your organization'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => exportToCSV()} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            onClick={() => generatePDFReport()} 
            disabled={exportingPDF}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            {exportingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Candidates"
          value={metrics.overview.totalCandidates}
          icon={Users}
          color="blue"
          change={`${metrics.overview.completionRate}% completion rate`}
        />
        <MetricCard
          title="Completed Tests"
          value={metrics.overview.completedTests}
          icon={CheckCircle}
          color="green"
          change={`${metrics.overview.successRate}% success rate`}
        />
        <MetricCard
          title="Active Tests"
          value={metrics.overview.activeTests}
          icon={Activity}
          color="orange"
          change="Currently running"
        />
        <MetricCard
          title="Average Score"
          value={calculateOverallAverageScore(metrics)}
          icon={Award}
          color="purple"
          change="Across all tests"
          isPercentage
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {hasPermission('speaking') && <TabsTrigger value="speaking">Speaking</TabsTrigger>}
          {hasPermission('proficiency') && <TabsTrigger value="proficiency">Proficiency</TabsTrigger>}
          {hasPermission('writing') && <TabsTrigger value="writing">Writing</TabsTrigger>}
          {hasPermission('eq') && <TabsTrigger value="eq">EQ</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewContent metrics={metrics} hasPermission={hasPermission} />
        </TabsContent>

        {hasPermission('speaking') && (
          <TabsContent value="speaking" className="space-y-6">
            <TestTypeContent 
              testType="speaking"
              data={metrics.testTypes.speaking}
              title="🗣️ Speaking Assessment Analytics"
              showCEFR
            />
          </TabsContent>
        )}

        {hasPermission('proficiency') && (
          <TabsContent value="proficiency" className="space-y-6">
            <TestTypeContent 
              testType="proficiency"
              data={metrics.testTypes.proficiency}
              title="📚 Proficiency Test Analytics"
              showCEFR
            />
          </TabsContent>
        )}

        {hasPermission('writing') && (
          <TabsContent value="writing" className="space-y-6">
            <TestTypeContent 
              testType="writing"
              data={metrics.testTypes.writing}
              title="✍️ Writing Assessment Analytics"
            />
          </TabsContent>
        )}

        {hasPermission('eq') && (
          <TabsContent value="eq" className="space-y-6">
            <TestTypeContent 
              testType="eq"
              data={metrics.testTypes.eq}
              title="🧠 Emotional Intelligence Analytics"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// Helper components and functions

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'orange' | 'purple';
  change?: string;
  isPercentage?: boolean;
}

const MetricCard = ({ title, value, icon: Icon, color, change, isPercentage }: MetricCardProps) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' }
  };

  const styles = colorClasses[color];

  return (
    <Card className={cn('border-2', styles.border)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={cn(designTokens.typography.heading2, 'text-gray-900')}>
              {isPercentage ? `${value.toFixed(1)}%` : value.toLocaleString()}
            </p>
            {change && (
              <p className="text-xs text-gray-500 mt-1">{change}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-full', styles.bg)}>
            <Icon className={cn('h-6 w-6', styles.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ReportLoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
    
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);

const OverviewContent = ({ 
  metrics, 
  hasPermission 
}: { 
  metrics: ReportMetrics;
  hasPermission: (testType: string) => boolean;
}) => (
  <div className="space-y-6">
    {/* Test Type Summary */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Test Performance Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hasPermission('speaking') && (
            <TestSummaryItem
              testType="speaking"
              data={metrics.testTypes.speaking}
              title="Speaking"
            />
          )}
          {hasPermission('proficiency') && (
            <TestSummaryItem
              testType="proficiency"
              data={metrics.testTypes.proficiency}
              title="Proficiency"
            />
          )}
          {hasPermission('writing') && (
            <TestSummaryItem
              testType="writing"
              data={metrics.testTypes.writing}
              title="Writing"
            />
          )}
          {hasPermission('eq') && (
            <TestSummaryItem
              testType="eq"
              data={metrics.testTypes.eq}
              title="EQ"
            />
          )}
        </div>
      </CardContent>
    </Card>

    {/* Credit Usage (for company admin) */}
    {metrics.creditUsage && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Credit Usage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Total Consumption</h4>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {metrics.creditUsage.totalConsumed} Credits
              </div>
              <p className="text-sm text-gray-600">Used across all test types</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Usage by Test Type</h4>
                             <div className="space-y-3">
                 {Object.entries(metrics.creditUsage.byTestType).map(([testType, usage]) => {
                   const usageData = usage as { consumed: number; tests: number };
                   return (
                     <div key={testType} className="flex justify-between items-center">
                       <span className="capitalize text-sm font-medium">{testType}</span>
                       <div className="text-right">
                         <div className="font-semibold">{usageData.consumed} credits</div>
                         <div className="text-xs text-gray-500">{usageData.tests} tests</div>
                       </div>
                     </div>
                   );
                 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

const TestSummaryItem = ({ 
  testType, 
  data, 
  title 
}: { 
  testType: keyof typeof TEST_ICONS;
  data: any;
  title: string;
}) => {
  const { icon: Icon, color, bg } = TEST_ICONS[testType];
  const completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;

  return (
    <div className={cn('p-4 rounded-lg border-2', bg)}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={cn('h-5 w-5', color)} />
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Completed</span>
          <span className="font-medium">{data.completed}/{data.total}</span>
        </div>
        <Progress value={completionRate} className="h-2" />
        <div className="flex justify-between text-sm">
          <span>Avg Score</span>
          <span className="font-medium">
            {data.averageScore > 0 ? data.averageScore.toFixed(1) : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

const TestTypeContent = ({ 
  testType, 
  data, 
  title, 
  showCEFR = false 
}: {
  testType: string;
  data: any;
  title: string;
  showCEFR?: boolean;
}) => (
  <div className="space-y-6">
    <h2 className={cn(designTokens.typography.heading2, 'text-gray-900')}>{title}</h2>
    
    <div className="grid md:grid-cols-2 gap-6">
      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Tests</span>
            <span className="font-semibold text-lg">{data.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Completed</span>
            <span className="font-semibold text-lg text-green-600">{data.completed}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-semibold text-lg">
              {data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Score</span>
            <span className="font-semibold text-lg text-blue-600">
              {data.averageScore > 0 ? data.averageScore.toFixed(1) : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Level Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{showCEFR ? 'CEFR Level Distribution' : 'Level Distribution'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {showCEFR ? (
              Object.entries(data.cefrDistribution || {}).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <Badge className={cn(
                    CEFR_COLORS[level as keyof typeof CEFR_COLORS]?.bg,
                    CEFR_COLORS[level as keyof typeof CEFR_COLORS]?.text,
                    'border',
                    CEFR_COLORS[level as keyof typeof CEFR_COLORS]?.border
                  )}>
                    {level}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${data.completed > 0 ? (count / data.completed) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              Object.entries(data.levelDistribution || {}).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <Badge className={cn(
                    EQ_COLORS[level as keyof typeof EQ_COLORS]?.bg || 'bg-gray-100',
                    EQ_COLORS[level as keyof typeof EQ_COLORS]?.text || 'text-gray-800'
                  )}>
                    {level}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ 
                          width: `${data.completed > 0 ? (count / data.completed) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            {Object.keys(showCEFR ? (data.cefrDistribution || {}) : (data.levelDistribution || {})).length === 0 && (
              <p className="text-gray-500 text-center py-4">No level data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const calculateOverallAverageScore = (metrics: ReportMetrics): number => {
  const testTypes = Object.values(metrics.testTypes);
  const validScores = testTypes
    .map(test => test.averageScore)
    .filter(score => score > 0);
  
  return validScores.length > 0 
    ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
    : 0;
};

const exportToCSV = () => {
  // Implementation for CSV export
  console.log('Exporting to CSV...');
  // This would be implemented based on the specific metrics structure
};

const generatePDFReport = () => {
  // Implementation for PDF export
  console.log('Generating PDF report...');
  // This would create a comprehensive PDF with all the metrics
};

export default ComprehensiveReportPanel; 