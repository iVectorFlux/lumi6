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

interface SimpleComprehensiveReportPanelProps {
  userRole: 'companyadmin' | 'superadmin';
  companyId?: string;
}

const CEFR_COLORS = {
  A1: 'bg-blue-100 text-blue-800 border-blue-200',
  A2: 'bg-blue-200 text-blue-900 border-blue-300',
  B1: 'bg-green-100 text-green-800 border-green-200',
  B2: 'bg-green-200 text-green-900 border-green-300',
  C1: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C2: 'bg-yellow-200 text-yellow-900 border-yellow-300',
};

const EQ_COLORS = {
  'Very High': 'bg-emerald-100 text-emerald-800',
  'High': 'bg-blue-100 text-blue-800',
  'Average': 'bg-yellow-100 text-yellow-800',
  'Below Average': 'bg-orange-100 text-orange-800',
  'Low': 'bg-red-100 text-red-800'
};

const TEST_ICONS = {
  speaking: { icon: Mic, color: 'text-blue-600', bg: 'bg-blue-50' },
  proficiency: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
  writing: { icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50' },
  eq: { icon: Brain, color: 'text-orange-600', bg: 'bg-orange-50' }
};

export const SimpleComprehensiveReportPanel = ({ 
  userRole, 
  companyId
}: SimpleComprehensiveReportPanelProps) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exportingPDF, setExportingPDF] = useState(false);

  // Get permissions for filtering
  const { data: permissions } = usePermissions(companyId || '');
  
  const hasPermission = (testType: string) => {
    if (!permissions) return true;
    const permission = permissions.find(p => p.testType.toLowerCase() === testType.toLowerCase());
    return permission?.isEnabled ?? true;
  };

  useEffect(() => {
    fetchReportData();
  }, [userRole, companyId]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (userRole === 'companyadmin' && companyId) {
        // Fetch company data
        const [statsRes, candidatesRes, successRateRes] = await Promise.all([
          axios.get(`${API_URL}/api/companies/${companyId}/stats`, { headers }),
          axios.get(`${API_URL}/api/companies/${companyId}/candidates/enhanced`, { headers }),
          axios.get(`${API_URL}/api/companies/${companyId}/analytics/success-rate`, { headers })
        ]);

        const processedData = {
          overview: {
            totalCandidates: statsRes.data.totalCandidates || 0,
            completedTests: statsRes.data.completedTests || 0,
            activeTests: statsRes.data.activeTests || 0,
            completionRate: statsRes.data.completionRate || 0,
            successRate: successRateRes.data.successRate || 0
          },
          candidates: candidatesRes.data.candidates || []
        };

        setReportData(processedData);
      } else {
        // Super admin logic would go here
        setReportData({ overview: {}, candidates: [] });
      }
    } catch (err: any) {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processTestMetrics = (candidates: any[]) => {
    const metrics = {
      speaking: { total: 0, completed: 0, scores: [], levels: [] },
      proficiency: { total: 0, completed: 0, scores: [], levels: [] },
      writing: { total: 0, completed: 0, scores: [], levels: [] },
      eq: { total: 0, completed: 0, scores: [], levels: [] }
    };

    candidates.forEach(candidate => {
      if (hasPermission('speaking') && candidate.speakingTest) {
        metrics.speaking.total++;
        if (candidate.speakingTest.status === 'completed') {
          metrics.speaking.completed++;
          if (candidate.speakingTest.score) metrics.speaking.scores.push(candidate.speakingTest.score);
          if (candidate.speakingTest.level) metrics.speaking.levels.push(candidate.speakingTest.level);
        }
      }

      if (hasPermission('proficiency') && candidate.proficiencyTest) {
        metrics.proficiency.total++;
        if (candidate.proficiencyTest.status === 'completed') {
          metrics.proficiency.completed++;
          if (candidate.proficiencyTest.score) metrics.proficiency.scores.push(candidate.proficiencyTest.score);
          if (candidate.proficiencyTest.level) metrics.proficiency.levels.push(candidate.proficiencyTest.level);
        }
      }

      if (hasPermission('writing') && candidate.writingTest) {
        metrics.writing.total++;
        if (candidate.writingTest.status === 'completed') {
          metrics.writing.completed++;
          if (candidate.writingTest.score) metrics.writing.scores.push(candidate.writingTest.score);
          if (candidate.writingTest.level) metrics.writing.levels.push(candidate.writingTest.level);
        }
      }

      if (hasPermission('eq') && candidate.eqTest) {
        metrics.eq.total++;
        if (candidate.eqTest.status === 'completed') {
          metrics.eq.completed++;
          if (candidate.eqTest.score) metrics.eq.scores.push(candidate.eqTest.score);
          if (candidate.eqTest.level) metrics.eq.levels.push(candidate.eqTest.level);
        }
      }
    });

    return metrics;
  };

  const generatePDFReport = async () => {
    if (!reportData) return;
    
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Lumi6 Comprehensive Assessment Report', 14, 20);
      doc.setFontSize(12);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Reset colors
      doc.setTextColor(0, 0, 0);
      
      // Overview Section
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 45, 182, 35, 'F');
      doc.setFontSize(14);
      doc.text('Overview Statistics', 18, 55);
      doc.setFontSize(11);
      doc.text(`Total Candidates: ${reportData.overview.totalCandidates}`, 18, 65);
      doc.text(`Completed Tests: ${reportData.overview.completedTests}`, 18, 72);
      doc.text(`Success Rate: ${reportData.overview.successRate}%`, 100, 65);
      doc.text(`Completion Rate: ${reportData.overview.completionRate}%`, 100, 72);
      
      // Test Metrics
      const testMetrics = processTestMetrics(reportData.candidates || []);
      let yPos = 95;
      
      (['speaking', 'proficiency', 'writing', 'eq'] as const).forEach(testType => {
        if (hasPermission(testType)) {
          const data = testMetrics[testType];
          const avgScore = data.scores.length > 0 ? data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length : 0;
          
          doc.setFillColor(239, 246, 255);
          doc.rect(14, yPos, 182, 25, 'F');
          doc.setFontSize(12);
          doc.text(`${testType.charAt(0).toUpperCase() + testType.slice(1)} Test`, 18, yPos + 10);
          doc.text(`Completed: ${data.completed}/${data.total}`, 18, yPos + 18);
          doc.text(`Avg Score: ${avgScore.toFixed(1)}`, 100, yPos + 18);
          
          yPos += 35;
        }
      });
      
      // Save the PDF
      doc.save(`Lumi6_Comprehensive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData?.candidates) return;
    
    const headers = ['Name', 'Email', 'Speaking', 'Proficiency', 'Writing', 'EQ', 'Overall Progress'];
    const csvData = reportData.candidates.map((candidate: any) => [
      `${candidate.firstName || ''} ${candidate.lastName || ''}`,
      candidate.email || '',
      candidate.speakingTest?.status || 'not_taken',
      candidate.proficiencyTest?.status || 'not_taken',
      candidate.writingTest?.status || 'not_taken',
      candidate.eqTest?.status || 'not_taken',
      calculateCandidateProgress(candidate)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `comprehensive_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const calculateCandidateProgress = (candidate: any) => {
    const tests = [
      hasPermission('speaking') ? candidate.speakingTest : null,
      hasPermission('proficiency') ? candidate.proficiencyTest : null,
      hasPermission('writing') ? candidate.writingTest : null,
      hasPermission('eq') ? candidate.eqTest : null
    ].filter(Boolean);
    
    const completed = tests.filter(test => test?.status === 'completed').length;
    return tests.length > 0 ? Math.round((completed / tests.length) * 100) : 0;
  };

  if (loading) {
    return (
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
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Report data is not available at this time.</p>
      </div>
    );
  }

  const testMetrics = processTestMetrics(reportData.candidates || []);

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
            onClick={exportToCSV} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            onClick={generatePDFReport} 
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
        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Candidates</p>
                <p className={cn(designTokens.typography.heading2, 'text-gray-900')}>
                  {reportData.overview.totalCandidates}
                </p>
                <p className="text-xs text-gray-500 mt-1">{reportData.overview.completionRate}% completion rate</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completed Tests</p>
                <p className={cn(designTokens.typography.heading2, 'text-gray-900')}>
                  {reportData.overview.completedTests}
                </p>
                <p className="text-xs text-gray-500 mt-1">{reportData.overview.successRate}% success rate</p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Tests</p>
                <p className={cn(designTokens.typography.heading2, 'text-gray-900')}>
                  {reportData.overview.activeTests}
                </p>
                <p className="text-xs text-gray-500 mt-1">Currently running</p>
              </div>
              <div className="p-3 rounded-full bg-orange-50">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Overall Progress</p>
                <p className={cn(designTokens.typography.heading2, 'text-gray-900')}>
                  {reportData.overview.completionRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all tests</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Test Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.entries(testMetrics) as [keyof typeof testMetrics, any][]).map(([testType, data]) => {
              if (!hasPermission(testType)) return null;
              
              const TestIcon = TEST_ICONS[testType].icon;
              const testColor = TEST_ICONS[testType].color;
              const testBg = TEST_ICONS[testType].bg;
              const completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
              const avgScore = data.scores.length > 0 ? data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length : 0;

              return (
                <div key={testType} className={cn('p-4 rounded-lg border-2', testBg)}>
                  <div className="flex items-center gap-3 mb-3">
                    <TestIcon className={cn('h-5 w-5', testColor)} />
                    <h4 className="font-semibold text-gray-900 capitalize">{testType}</h4>
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
                        {avgScore > 0 ? avgScore.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Level Distributions */}
      <div className="grid md:grid-cols-2 gap-6">
        {hasPermission('speaking') && testMetrics.speaking.levels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-blue-600" />
                Speaking CEFR Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  testMetrics.speaking.levels.reduce((acc: Record<string, number>, level: string) => {
                    acc[level] = (acc[level] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <Badge className={CEFR_COLORS[level as keyof typeof CEFR_COLORS]}>
                      {level}
                    </Badge>
                    <span className="font-semibold">{String(count)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('eq') && testMetrics.eq.levels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-orange-600" />
                EQ Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  testMetrics.eq.levels.reduce((acc: Record<string, number>, level: string) => {
                    acc[level] = (acc[level] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <Badge className={EQ_COLORS[level as keyof typeof EQ_COLORS] || 'bg-gray-100 text-gray-800'}>
                      {level}
                    </Badge>
                    <span className="font-semibold">{String(count)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SimpleComprehensiveReportPanel; 