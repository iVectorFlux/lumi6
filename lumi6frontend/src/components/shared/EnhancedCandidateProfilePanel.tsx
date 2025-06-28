import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { designTokens } from '@/design-system/tokens';
import { 
  ArrowLeft, 
  Download, 
  User, 
  Building, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Mic,
  BookOpen,
  PenTool,
  Brain,
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import CandidateResultPanel from './CandidateResultPanel';

interface TestResult {
  id: string;
  type: 'speaking' | 'proficiency' | 'writing' | 'eq';
  status: 'completed' | 'pending' | 'not_taken';
  score?: number;
  level?: string;
  completedAt?: string;
  details?: any;
}

interface EnhancedCandidateProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  companyId: string;
  overallStatus: string;
  testsCompleted: number;
  totalTests: number;
  speakingTest?: TestResult;
  proficiencyTest?: TestResult;
  writingTest?: TestResult;
  eqTest?: TestResult;
  createdAt: string;
}

interface EnhancedCandidateProfilePanelProps {
  candidateId: string;
  onBack: () => void;
  userRole: 'companyadmin' | 'superadmin';
}

// Design system color schemes
const TEST_THEMES = {
  speaking: {
    primary: 'bg-blue-600',
    secondary: 'bg-blue-50',
    accent: 'text-blue-800',
    border: 'border-blue-200',
    icon: Mic,
    gradient: 'from-blue-50 to-blue-100'
  },
  proficiency: {
    primary: 'bg-green-600',
    secondary: 'bg-green-50',
    accent: 'text-green-800',
    border: 'border-green-200',
    icon: BookOpen,
    gradient: 'from-green-50 to-green-100'
  },
  writing: {
    primary: 'bg-orange-600',
    secondary: 'bg-orange-50',
    accent: 'text-orange-800',
    border: 'border-orange-200',
    icon: PenTool,
    gradient: 'from-orange-50 to-orange-100'
  },
  eq: {
    primary: 'bg-purple-600',
    secondary: 'bg-purple-50',
    accent: 'text-purple-800',
    border: 'border-purple-200',
    icon: Brain,
    gradient: 'from-purple-50 to-purple-100'
  }
};

const CEFR_LEVELS = {
  A1: { bg: 'bg-red-100', text: 'text-red-800', description: 'Beginner' },
  A2: { bg: 'bg-orange-100', text: 'text-orange-800', description: 'Elementary' },
  B1: { bg: 'bg-yellow-100', text: 'text-yellow-800', description: 'Intermediate' },
  B2: { bg: 'bg-green-100', text: 'text-green-800', description: 'Upper Intermediate' },
  C1: { bg: 'bg-blue-100', text: 'text-blue-800', description: 'Advanced' },
  C2: { bg: 'bg-purple-100', text: 'text-purple-800', description: 'Proficient' }
};

const EQ_LEVELS = {
  'Very High': { bg: 'bg-green-100', text: 'text-green-800' },
  'High': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Average': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Below Average': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Low': { bg: 'bg-red-100', text: 'text-red-800' }
};

// React Query hook for candidate profile
const useCandidateProfile = (candidateId: string, userRole: string) => {
  return useQuery({
    queryKey: ['candidateProfile', candidateId, userRole],
    queryFn: async (): Promise<EnhancedCandidateProfile> => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const endpoint = userRole === 'superadmin' 
        ? `/api/superadmin/candidates/${candidateId}/complete-profile`
        : `/api/candidates/${candidateId}/complete-profile`;
      
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
};

const EnhancedCandidateProfilePanel = ({ candidateId, onBack, userRole }: EnhancedCandidateProfilePanelProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: profile, isLoading, error, refetch } = useCandidateProfile(candidateId, userRole);

  const handleBackClick = () => {
    console.log('Back button clicked in EnhancedCandidateProfilePanel!');
    onBack();
  };

  const generateCombinedReport = () => {
    if (!profile) return;

    const doc = new jsPDF();
    
    // Header with modern branding
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246);
    doc.text('Lumi6', 14, 20);
    doc.setFontSize(16);
    doc.setTextColor(75, 85, 99);
    doc.text('Complete Assessment Report', 14, 28);
    
    // Candidate information card
    doc.setFillColor(249, 250, 251);
    doc.rect(14, 35, 182, 25, 'F');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Candidate: ${profile.name}`, 18, 45);
    doc.text(`Email: ${profile.email}`, 18, 52);
    doc.text(`Company: ${profile.company}`, 18, 59);
    
    // Overall progress
    doc.setFillColor(239, 246, 255);
    doc.rect(14, 65, 182, 20, 'F');
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text(`Progress: ${profile.testsCompleted}/${profile.totalTests} Tests • ${profile.overallStatus}`, 18, 78);
    
    let yPosition = 95;
    
    // Test results sections
    const tests = [
      { test: profile.speakingTest, name: 'Speaking Assessment', icon: '🗣️', maxScore: 100 },
      { test: profile.proficiencyTest, name: 'Proficiency Test', icon: '📚', maxScore: 40 },
      { test: profile.writingTest, name: 'Writing Assessment', icon: '✍️', maxScore: 100 },
      { test: profile.eqTest, name: 'EQ Assessment', icon: '🧠', maxScore: 100 }
    ];
    
    tests.forEach(({ test, name, icon, maxScore }) => {
      if (test?.status === 'completed') {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, yPosition, 182, 25, 'F');
        doc.setFontSize(12);
        doc.setTextColor(51, 65, 85);
        doc.text(`${icon} ${name}`, 18, yPosition + 10);
        doc.text(`Level: ${test.level || 'N/A'}`, 18, yPosition + 17);
        doc.text(`Score: ${test.score}${maxScore ? `/${maxScore}` : ''}`, 100, yPosition + 17);
        doc.text(`Date: ${new Date(test.completedAt!).toLocaleDateString()}`, 18, yPosition + 24);
        yPosition += 35;
      }
    });
    
    // Summary
    doc.setFillColor(249, 250, 251);
    doc.rect(14, yPosition, 182, 20, 'F');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated on ${new Date().toLocaleDateString()} • Lumi6 Assessment Platform`, 18, yPosition + 12);
    
    doc.save(`${profile.name.replace(/\s+/g, '_')}_Complete_Assessment_Report.pdf`);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <Button variant="outline" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load candidate profile. Please try again.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <Button variant="outline" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
        </div>
        <div className="text-center py-12">
          <p className={cn(designTokens.typography.body, 'text-gray-500')}>
            No candidate data found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="outline" 
            onClick={handleBackClick}
            className="flex items-center gap-2 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </Button>
          
          <h1 className={cn(designTokens.typography.heading2, 'text-gray-900')}>
            Complete Candidate Profile
          </h1>
          
          <Button 
            onClick={generateCombinedReport} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Overview Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className={cn(designTokens.typography.captionSmall, 'text-gray-600 mb-1')}>
                    Candidate
                  </p>
                  <p className={cn(designTokens.typography.bodySmall, 'font-semibold text-gray-900')}>
                    {profile.name}
                  </p>
                  <p className={cn(designTokens.typography.captionSmall, 'text-gray-500')}>
                    {profile.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className={cn(designTokens.typography.captionSmall, 'text-gray-600 mb-1')}>
                    Company
                  </p>
                  <p className={cn(designTokens.typography.bodySmall, 'font-semibold text-gray-900')}>
                    {profile.company}
                  </p>
                  {userRole === 'superadmin' && (
                    <p className={cn(designTokens.typography.captionSmall, 'text-gray-500')}>
                      ID: {profile.companyId}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className={cn(designTokens.typography.captionSmall, 'text-gray-600 mb-1')}>
                    Progress
                  </p>
                  <p className={cn(designTokens.typography.bodySmall, 'font-semibold text-gray-900')}>
                    {profile.testsCompleted}/{profile.totalTests} Tests
                  </p>
                  <Progress 
                    value={(profile.testsCompleted / profile.totalTests) * 100} 
                    className="mt-1 h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Award className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className={cn(designTokens.typography.captionSmall, 'text-gray-600 mb-1')}>
                    Status
                  </p>
                  <Badge 
                    variant={profile.overallStatus === 'Completed' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {profile.overallStatus}
                  </Badge>
                  <p className={cn(designTokens.typography.captionSmall, 'text-gray-500 mt-1')}>
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Results Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'speakingTest', name: 'Speaking Test', type: 'speaking' as const },
            { key: 'proficiencyTest', name: 'Proficiency Test', type: 'proficiency' as const },
            { key: 'writingTest', name: 'Writing Test', type: 'writing' as const },
            { key: 'eqTest', name: 'EQ Assessment', type: 'eq' as const }
          ].map(({ key, name, type }) => {
            const test = profile[key as keyof EnhancedCandidateProfile] as TestResult | undefined;
            const theme = TEST_THEMES[type];
            const IconComponent = theme.icon;
            
            return (
              <Card key={key} className={cn('border-2', theme.border)}>
                <CardHeader className={cn('pb-3', theme.secondary)}>
                  <CardTitle className={cn(designTokens.typography.bodySmall, 'flex items-center gap-2')}>
                    <IconComponent className="h-4 w-4" />
                    {name}
                    <Badge 
                      variant={test?.status === 'completed' ? 'default' : 'secondary'}
                      className="ml-auto"
                    >
                      {test?.status === 'completed' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {test?.status === 'completed' ? 'Completed' : 
                       test?.status === 'pending' ? 'In Progress' : 'Not Started'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {test?.status === 'completed' ? (
                    <div className="space-y-3">
                      {test.level && (
                        <div className="flex justify-between items-center">
                          <span className={cn(designTokens.typography.captionSmall, 'text-gray-600')}>
                            Level:
                          </span>
                          <Badge className={cn(
                            'text-xs',
                            type === 'eq' 
                              ? EQ_LEVELS[test.level as keyof typeof EQ_LEVELS]?.bg + ' ' + EQ_LEVELS[test.level as keyof typeof EQ_LEVELS]?.text
                              : CEFR_LEVELS[test.level as keyof typeof CEFR_LEVELS]?.bg + ' ' + CEFR_LEVELS[test.level as keyof typeof CEFR_LEVELS]?.text
                          )}>
                            {test.level}
                          </Badge>
                        </div>
                      )}
                      
                      {test.score !== undefined && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.captionSmall, 'text-gray-600')}>
                              Score:
                            </span>
                            <span className={cn(designTokens.typography.bodySmall, 'font-semibold')}>
                              {test.score}{type === 'proficiency' ? '/40' : type !== 'eq' ? '/100' : ''}
                            </span>
                          </div>
                          <Progress 
                            value={type === 'proficiency' ? (test.score / 40) * 100 : test.score} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      {test.completedAt && (
                        <p className={cn(designTokens.typography.captionSmall, 'text-gray-500')}>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(test.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className={cn(designTokens.typography.captionSmall, 'text-gray-500')}>
                        {test?.status === 'pending' ? 'Test in progress...' : 'Not assigned yet'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Results Tabs */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className={designTokens.typography.heading3}>
              Detailed Assessment Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger 
                  value="speaking" 
                  disabled={profile.speakingTest?.status !== 'completed'}
                >
                  Speaking
                </TabsTrigger>
                <TabsTrigger 
                  value="proficiency" 
                  disabled={profile.proficiencyTest?.status !== 'completed'}
                >
                  Proficiency
                </TabsTrigger>
                <TabsTrigger 
                  value="writing" 
                  disabled={profile.writingTest?.status !== 'completed'}
                >
                  Writing
                </TabsTrigger>
                <TabsTrigger 
                  value="eq" 
                  disabled={profile.eqTest?.status !== 'completed'}
                >
                  EQ
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  <h3 className={cn(designTokens.typography.heading4, 'text-gray-900')}>
                    Assessment Summary
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Completed Assessments */}
                    <div className="space-y-4">
                      <h4 className={cn(designTokens.typography.bodySmall, 'font-semibold text-green-700 flex items-center gap-2')}>
                        <CheckCircle className="h-4 w-4" />
                        Completed Assessments
                      </h4>
                      
                      {[
                        { test: profile.speakingTest, name: 'Speaking Test', icon: '🗣️', type: 'speaking' },
                        { test: profile.proficiencyTest, name: 'Proficiency Test', icon: '📚', type: 'proficiency' },
                        { test: profile.writingTest, name: 'Writing Test', icon: '✍️', type: 'writing' },
                        { test: profile.eqTest, name: 'EQ Assessment', icon: '🧠', type: 'eq' }
                      ].filter(item => item.test?.status === 'completed').map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                          <span className="flex items-center gap-3">
                            <span className="text-lg">{item.icon}</span>
                            <div>
                              <p className={cn(designTokens.typography.bodySmall, 'font-medium')}>
                                {item.name}
                              </p>
                              <p className={cn(designTokens.typography.captionSmall, 'text-gray-600')}>
                                {new Date(item.test?.completedAt!).toLocaleDateString()}
                              </p>
                            </div>
                          </span>
                          <div className="text-right">
                            <Badge className={cn(
                              'mb-1',
                              item.type === 'eq' 
                                ? EQ_LEVELS[item.test?.level as keyof typeof EQ_LEVELS]?.bg + ' ' + EQ_LEVELS[item.test?.level as keyof typeof EQ_LEVELS]?.text
                                : CEFR_LEVELS[item.test?.level as keyof typeof CEFR_LEVELS]?.bg + ' ' + CEFR_LEVELS[item.test?.level as keyof typeof CEFR_LEVELS]?.text
                            )}>
                              {item.test?.level}
                            </Badge>
                            <p className={cn(designTokens.typography.captionSmall, 'text-gray-600')}>
                              Score: {item.test?.score}{item.type === 'proficiency' ? '/40' : item.type !== 'eq' ? '/100' : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {[
                        { test: profile.speakingTest, name: 'Speaking Test', icon: '🗣️' },
                        { test: profile.proficiencyTest, name: 'Proficiency Test', icon: '📚' },
                        { test: profile.writingTest, name: 'Writing Test', icon: '✍️' },
                        { test: profile.eqTest, name: 'EQ Assessment', icon: '🧠' }
                      ].filter(item => item.test?.status === 'completed').length === 0 && (
                        <div className="text-center py-8">
                          <p className={cn(designTokens.typography.body, 'text-gray-500')}>
                            No assessments completed yet
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Pending/Missing Assessments */}
                    <div className="space-y-4">
                      <h4 className={cn(designTokens.typography.bodySmall, 'font-semibold text-orange-700 flex items-center gap-2')}>
                        <Clock className="h-4 w-4" />
                        Pending/Missing Assessments
                      </h4>
                      
                      {[
                        { test: profile.speakingTest, name: 'Speaking Test', icon: '🗣️' },
                        { test: profile.proficiencyTest, name: 'Proficiency Test', icon: '📚' },
                        { test: profile.writingTest, name: 'Writing Test', icon: '✍️' },
                        { test: profile.eqTest, name: 'EQ Assessment', icon: '🧠' }
                      ].filter(item => item.test?.status !== 'completed').map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <span className="flex items-center gap-3">
                            <span className="text-lg">{item.icon}</span>
                            <p className={cn(designTokens.typography.bodySmall, 'font-medium')}>
                              {item.name}
                            </p>
                          </span>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {item.test?.status === 'pending' ? 'In Progress' : 'Not Assigned'}
                          </Badge>
                        </div>
                      ))}
                      
                      {[
                        { test: profile.speakingTest, name: 'Speaking Test', icon: '🗣️' },
                        { test: profile.proficiencyTest, name: 'Proficiency Test', icon: '📚' },
                        { test: profile.writingTest, name: 'Writing Test', icon: '✍️' },
                        { test: profile.eqTest, name: 'EQ Assessment', icon: '🧠' }
                      ].filter(item => item.test?.status !== 'completed').length === 0 && (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">🎉</div>
                          <p className={cn(designTokens.typography.body, 'text-green-600 font-medium')}>
                            All assessments completed!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="speaking" className="mt-6">
                {profile.speakingTest?.status === 'completed' && (
                  <CandidateResultPanel 
                    candidateId={candidateId} 
                    showAsFullReport={true}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="proficiency" className="mt-6">
                <div className="space-y-6">
                  <h3 className={cn(designTokens.typography.heading4, 'text-gray-900 flex items-center gap-2')}>
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Proficiency Test Details
                  </h3>
                  
                  {profile.proficiencyTest?.status === 'completed' ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className={cn(designTokens.typography.bodySmall, 'text-green-700')}>
                            Test Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.bodySmall, 'text-gray-600')}>
                              CEFR Level:
                            </span>
                            <Badge className={cn(
                              CEFR_LEVELS[profile.proficiencyTest.level as keyof typeof CEFR_LEVELS]?.bg,
                              CEFR_LEVELS[profile.proficiencyTest.level as keyof typeof CEFR_LEVELS]?.text
                            )}>
                              {profile.proficiencyTest.level}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.bodySmall, 'text-gray-600')}>
                              Score:
                            </span>
                            <span className={cn(designTokens.typography.bodySmall, 'font-semibold')}>
                              {profile.proficiencyTest.score}/40
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.bodySmall, 'text-gray-600')}>
                              Percentage:
                            </span>
                            <span className={cn(designTokens.typography.bodySmall, 'font-semibold')}>
                              {Math.round((profile.proficiencyTest.score! / 40) * 100)}%
                            </span>
                          </div>
                          
                          <Progress 
                            value={(profile.proficiencyTest.score! / 40) * 100} 
                            className="mt-4"
                          />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className={cn(designTokens.typography.bodySmall, 'text-green-700')}>
                            Test Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Test Type:</strong> Multiple Choice Questions
                          </div>
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Total Questions:</strong> 40
                          </div>
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Completed:</strong> {new Date(profile.proficiencyTest.completedAt!).toLocaleDateString()}
                          </div>
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Framework:</strong> CEFR (Common European Framework of Reference)
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className={cn(designTokens.typography.body, 'text-gray-500')}>
                        Proficiency test not completed yet
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="writing" className="mt-6">
                <div className="space-y-6">
                  <h3 className={cn(designTokens.typography.heading4, 'text-gray-900 flex items-center gap-2')}>
                    <PenTool className="h-5 w-5 text-orange-600" />
                    Writing Test Details
                  </h3>
                  
                  {profile.writingTest?.status === 'completed' ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className={cn(designTokens.typography.bodySmall, 'text-orange-700')}>
                            Test Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.bodySmall, 'text-gray-600')}>
                              CEFR Level:
                            </span>
                            <Badge className={cn(
                              CEFR_LEVELS[profile.writingTest.level as keyof typeof CEFR_LEVELS]?.bg,
                              CEFR_LEVELS[profile.writingTest.level as keyof typeof CEFR_LEVELS]?.text
                            )}>
                              {profile.writingTest.level}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.bodySmall, 'text-gray-600')}>
                              Score:
                            </span>
                            <span className={cn(designTokens.typography.bodySmall, 'font-semibold')}>
                              {profile.writingTest.score}/100
                            </span>
                          </div>
                          
                          <Progress 
                            value={profile.writingTest.score} 
                            className="mt-4"
                          />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className={cn(designTokens.typography.bodySmall, 'text-orange-700')}>
                            Assessment Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Assessment Type:</strong> Writing Prompts & Tasks
                          </div>
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Duration:</strong> 30-45 minutes
                          </div>
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Completed:</strong> {new Date(profile.writingTest.completedAt!).toLocaleDateString()}
                          </div>
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Evaluation:</strong> AI-powered scoring with detailed feedback
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <PenTool className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className={cn(designTokens.typography.body, 'text-gray-500')}>
                        Writing test not completed yet
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="eq" className="mt-6">
                <div className="space-y-6">
                  <h3 className={cn(designTokens.typography.heading4, 'text-gray-900 flex items-center gap-2')}>
                    <Brain className="h-5 w-5 text-purple-600" />
                    Emotional Intelligence Test Details
                  </h3>
                  
                  {profile.eqTest?.status === 'completed' ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className={cn(designTokens.typography.bodySmall, 'text-purple-700')}>
                            EQ Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.bodySmall, 'text-gray-600')}>
                              EQ Rating:
                            </span>
                            <Badge className={cn(
                              EQ_LEVELS[profile.eqTest.level as keyof typeof EQ_LEVELS]?.bg,
                              EQ_LEVELS[profile.eqTest.level as keyof typeof EQ_LEVELS]?.text
                            )}>
                              {profile.eqTest.level}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className={cn(designTokens.typography.bodySmall, 'text-gray-600')}>
                              Overall Score:
                            </span>
                            <span className={cn(designTokens.typography.bodySmall, 'font-semibold')}>
                              {profile.eqTest.score}
                            </span>
                          </div>
                          
                          <Progress 
                            value={profile.eqTest.score} 
                            className="mt-4"
                          />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className={cn(designTokens.typography.bodySmall, 'text-purple-700')}>
                            Assessment Framework
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700')}>
                            <strong>Frameworks Used:</strong>
                          </div>
                          <ul className={cn(designTokens.typography.captionSmall, 'text-gray-700 list-disc list-inside ml-2 space-y-1')}>
                            <li>Goleman's EQ Model</li>
                            <li>MSCEIT (Mayer-Salovey)</li>
                            <li>EQ-i 2.0 (Bar-On)</li>
                          </ul>
                          <div className={cn(designTokens.typography.captionSmall, 'text-gray-700 mt-3')}>
                            <strong>Completed:</strong> {new Date(profile.eqTest.completedAt!).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className={cn(designTokens.typography.body, 'text-gray-500')}>
                        EQ test not completed yet
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedCandidateProfilePanel; 