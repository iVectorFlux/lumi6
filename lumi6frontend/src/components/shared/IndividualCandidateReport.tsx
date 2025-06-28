import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  Users, 
  CheckCircle, 
  Clock,
  Mic,
  BookOpen,
  PenTool,
  Brain,
  Award,
  Calendar,
  TrendingUp,
  Target,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { designTokens } from '@/design-system/tokens';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { usePermissions } from '@/hooks/api/useCompanyData';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => any;
    lastAutoTable: any;
  }
}

interface IndividualCandidateReportProps {
  candidateId: string;
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
  speaking: { icon: Mic, color: 'text-blue-600', bg: 'bg-blue-50', name: 'Speaking' },
  proficiency: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50', name: 'Proficiency' },
  writing: { icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50', name: 'Writing' },
  eq: { icon: Brain, color: 'text-orange-600', bg: 'bg-orange-50', name: 'EQ' }
};

export const IndividualCandidateReport = ({ candidateId, companyId }: IndividualCandidateReportProps) => {
  const [candidateData, setCandidateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Get permissions for filtering
  const { data: permissions } = usePermissions(companyId || '');
  
  const hasPermission = (testType: string) => {
    if (!permissions) return true;
    const permission = permissions.find(p => p.testType.toLowerCase() === testType.toLowerCase());
    return permission?.isEnabled ?? true;
  };

  useEffect(() => {
    fetchCandidateData();
  }, [candidateId, companyId]);

  const fetchCandidateData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      console.log('🔍 IndividualCandidateReport Debug Info:');
      console.log('  - candidateId:', candidateId);
      console.log('  - companyId prop:', companyId);
      console.log('  - API_URL:', API_URL);
      console.log('  - token exists:', !!token);

      // Get companyId from token if not provided
      let finalCompanyId = companyId;
      if (!finalCompanyId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          finalCompanyId = payload.companyId;
          console.log('  - companyId from token:', finalCompanyId);
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }

      if (!finalCompanyId) {
        throw new Error('Company ID is required');
      }

      const apiUrl = `${API_URL}/api/companies/${finalCompanyId}/candidates/${candidateId}/enhanced`;
      console.log('  - Final API URL:', apiUrl);

      // Fetch enhanced candidate data
      const response = await axios.get(apiUrl, { headers });
      console.log('  - API Response success:', response.data);
      setCandidateData(response.data);
    } catch (err: any) {
      console.error('🚨 Error fetching candidate data:', err);
      console.error('  - Error response:', err.response?.data);
      console.error('  - Error status:', err.response?.status);
      setError(`Failed to load candidate data: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processTestData = () => {
    if (!candidateData) return null;

    const tests = {
      speaking: candidateData.speakingTest,
      proficiency: candidateData.proficiencyTest,
      writing: candidateData.writingTest,
      eq: candidateData.eqTest
    };

    const completedTests = Object.values(tests).filter((test: any) => test?.status === 'completed').length;
    const totalTests = Object.values(tests).filter((test: any) => test).length;
    const progressPercentage = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

    return {
      tests,
      completedTests,
      totalTests,
      progressPercentage,
      overallStatus: progressPercentage === 100 ? 'Completed' : progressPercentage > 0 ? 'In Progress' : 'Not Started'
    };
  };

  const generatePDFReport = async () => {
    if (!candidateData) return;
    
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Individual Candidate Assessment Report', 14, 20);
      doc.setFontSize(12);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Reset colors
      doc.setTextColor(0, 0, 0);
      
      // Candidate Info
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 45, 182, 25, 'F');
      doc.setFontSize(14);
      doc.text('Candidate Information', 18, 55);
      doc.setFontSize(11);
      doc.text(`Name: ${candidateData.firstName} ${candidateData.lastName}`, 18, 65);
      doc.text(`Email: ${candidateData.email}`, 18, 72);
      
      // Test Results
      const testData = processTestData();
      let yPos = 85;
      
      if (testData) {
        doc.setFillColor(239, 246, 255);
        doc.rect(14, yPos, 182, 20, 'F');
        doc.setFontSize(12);
        doc.text(`Overall Progress: ${testData.completedTests}/${testData.totalTests} tests completed`, 18, yPos + 12);
        yPos += 30;

        Object.entries(testData.tests).forEach(([testType, test]) => {
          if (hasPermission(testType) && test) {
            doc.setFillColor(249, 250, 251);
            doc.rect(14, yPos, 182, 20, 'F');
            doc.setFontSize(11);
            doc.text(`${testType.charAt(0).toUpperCase() + testType.slice(1)} Test:`, 18, yPos + 8);
            doc.text(`Status: ${test.status}`, 18, yPos + 15);
            if (test.score) doc.text(`Score: ${test.score}`, 100, yPos + 15);
            if (test.level) doc.text(`Level: ${test.level}`, 150, yPos + 15);
            yPos += 25;
          }
        });
      }
      
      // Save the PDF
      doc.save(`${candidateData.firstName}_${candidateData.lastName}_Individual_Report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-10 w-36" />
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
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!candidateData) {
    return (
      <div className="text-center py-16">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Candidate data could not be loaded.</p>
      </div>
    );
  }

  const testData = processTestData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className={cn(designTokens.typography.heading1, 'text-gray-900')}>
            📊 Individual Assessment Report
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analytics for {candidateData.firstName} {candidateData.lastName}
          </p>
        </div>
        <Button 
          onClick={generatePDFReport} 
          disabled={exportingPDF}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          {exportingPDF ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      {/* Candidate Info Card */}
      <Card className="border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {candidateData.firstName} {candidateData.lastName}
                </h3>
                <p className="text-gray-600">{candidateData.email}</p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(candidateData.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {testData?.progressPercentage.toFixed(0)}%
              </div>
              <p className="text-sm text-gray-600">Overall Progress</p>
              <Badge 
                className={cn(
                  testData?.progressPercentage === 100 ? 'bg-green-100 text-green-800' :
                  testData?.progressPercentage > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                )}
              >
                {testData?.overallStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Status Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(testData?.tests || {}).map(([testType, test]) => {
          if (!hasPermission(testType) || !test) return null;
          
          const TestIcon = TEST_ICONS[testType as keyof typeof TEST_ICONS].icon;
          const testColor = TEST_ICONS[testType as keyof typeof TEST_ICONS].color;
          const testBg = TEST_ICONS[testType as keyof typeof TEST_ICONS].bg;
          const testName = TEST_ICONS[testType as keyof typeof TEST_ICONS].name;

          return (
            <Card key={testType} className={cn('border-2', testBg)}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TestIcon className={cn('h-6 w-6', testColor)} />
                  <h4 className="font-semibold text-gray-900">{testName}</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge 
                      className={cn(
                        test.status === 'completed' ? 'bg-green-100 text-green-800' :
                        test.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {test.status}
                    </Badge>
                  </div>
                  
                  {test.status === 'completed' && (
                    <>
                      {test.score && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Score</span>
                          <span className="font-semibold">{test.score}</span>
                        </div>
                      )}
                      
                      {test.level && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Level</span>
                          <Badge className={
                            testType === 'eq' ? 
                              EQ_COLORS[test.level as keyof typeof EQ_COLORS] || 'bg-gray-100 text-gray-800' :
                              CEFR_COLORS[test.level as keyof typeof CEFR_COLORS] || 'bg-gray-100 text-gray-800'
                          }>
                            {test.level}
                          </Badge>
                        </div>
                      )}
                      
                      {test.completedAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Completed</span>
                          <span className="text-sm font-medium">
                            {new Date(test.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Analysis */}
      {testData && testData.completedTests > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Assessment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Progress Overview</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Tests Completed</span>
                    <span className="font-semibold">{testData.completedTests}/{testData.totalTests}</span>
                  </div>
                  <Progress value={testData.progressPercentage} className="h-2" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Status: {testData.overallStatus}</span>
                    <span>{testData.progressPercentage.toFixed(0)}% Complete</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Next Steps</h4>
                <div className="space-y-2">
                  {Object.entries(testData.tests).map(([testType, test]) => {
                    if (!hasPermission(testType) || !test || test.status === 'completed') return null;
                    return (
                      <div key={testType} className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>Complete {TEST_ICONS[testType as keyof typeof TEST_ICONS].name} Assessment</span>
                      </div>
                    );
                  })}
                  {testData.completedTests === testData.totalTests && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>All assessments completed!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IndividualCandidateReport; 