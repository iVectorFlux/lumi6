import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface TestStatistics {
  totalTests: number;
  completedTests: number;
  pendingTests: number;
  averageScore: number;
  cefrDistribution?: { [key: string]: number };
  eqDistribution?: { [key: string]: number };
}

interface CompanyStatistics {
  id: string;
  name: string;
  totalCandidates: number;
  completedCandidates: number;
  speakingStats: TestStatistics;
  proficiencyStats: TestStatistics;
  eqStats: TestStatistics;
}

interface EnhancedReportsSectionProps {
  userRole: 'companyadmin' | 'superadmin';
  companyId?: string; // Only for company admin
}

const CEFR_COLORS = {
  A1: 'bg-blue-200 text-blue-800',
  A2: 'bg-blue-300 text-blue-900',
  B1: 'bg-green-200 text-green-800',
  B2: 'bg-green-300 text-green-900',
  C1: 'bg-yellow-200 text-yellow-800',
  C2: 'bg-yellow-300 text-yellow-900'
};

const EQ_COLORS = {
  'Very High': 'bg-green-200 text-green-800',
  'High': 'bg-blue-200 text-blue-800',
  'Average': 'bg-yellow-200 text-yellow-800',
  'Below Average': 'bg-orange-200 text-orange-800',
  'Low': 'bg-red-200 text-red-800'
};

const EnhancedReportsSection = ({ userRole, companyId }: EnhancedReportsSectionProps) => {
  const [statistics, setStatistics] = useState<CompanyStatistics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStatistics();
  }, [userRole, companyId]);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const endpoint = userRole === 'superadmin' 
        ? '/api/superadmin/reports/enhanced-statistics'
        : `/api/companies/${companyId}/reports/enhanced-statistics`;
      
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setStatistics(response.data.statistics);
    } catch (err: any) {
      setError('Failed to load statistics');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateComprehensiveReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('Lumi6 Enhanced Assessment Report', 14, 22);
    
    // Report Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Report Type: ${userRole === 'superadmin' ? 'Super Admin Overview' : 'Company Report'}`, 14, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);
    doc.text(`Total Companies: ${statistics.length}`, 14, 49);
    
    let yPosition = 65;
    
    // Overall Statistics
    const totalCandidates = statistics.reduce((sum, stat) => sum + stat.totalCandidates, 0);
    const totalCompleted = statistics.reduce((sum, stat) => sum + stat.completedCandidates, 0);
    
    doc.setFillColor(239, 246, 255);
    doc.rect(14, yPosition, 182, 30, 'F');
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text('Overall Statistics', 18, yPosition + 12);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Candidates: ${totalCandidates}`, 18, yPosition + 20);
    doc.text(`Completed Assessments: ${totalCompleted}`, 18, yPosition + 26);
    
    yPosition += 40;
    
    // Company-wise breakdown
    statistics.forEach((company, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFillColor(249, 250, 251);
      doc.rect(14, yPosition, 182, 25, 'F');
      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99);
      doc.text(`${company.name}`, 18, yPosition + 12);
      doc.text(`Candidates: ${company.totalCandidates} | Completed: ${company.completedCandidates}`, 18, yPosition + 20);
      
      yPosition += 30;
      
      // Test statistics
      doc.setFontSize(10);
      doc.text(`Speaking Tests: ${company.speakingStats.completedTests}/${company.speakingStats.totalTests} (Avg: ${company.speakingStats.averageScore.toFixed(1)})`, 18, yPosition);
      doc.text(`Proficiency Tests: ${company.proficiencyStats.completedTests}/${company.proficiencyStats.totalTests} (Avg: ${company.proficiencyStats.averageScore.toFixed(1)})`, 18, yPosition + 7);
      doc.text(`EQ Tests: ${company.eqStats.completedTests}/${company.eqStats.totalTests} (Avg: ${company.eqStats.averageScore.toFixed(1)})`, 18, yPosition + 14);
      
      yPosition += 25;
    });
    
    doc.save(`Lumi6_Enhanced_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportStatisticsToCSV = () => {
    const header = [
      'Company', 'Total Candidates', 'Completed Candidates', 
      'Speaking Tests', 'Speaking Completed', 'Speaking Avg Score',
      'Proficiency Tests', 'Proficiency Completed', 'Proficiency Avg Score',
      'EQ Tests', 'EQ Completed', 'EQ Avg Score'
    ];
    
    const rows = statistics.map(stat => [
      stat.name,
      stat.totalCandidates,
      stat.completedCandidates,
      stat.speakingStats.totalTests,
      stat.speakingStats.completedTests,
      stat.speakingStats.averageScore.toFixed(2),
      stat.proficiencyStats.totalTests,
      stat.proficiencyStats.completedTests,
      stat.proficiencyStats.averageScore.toFixed(2),
      stat.eqStats.totalTests,
      stat.eqStats.completedTests,
      stat.eqStats.averageScore.toFixed(2)
    ]);
    
    const csvContent = [header, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `enhanced_statistics_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading reports...</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;

  const totalCandidates = statistics.reduce((sum, stat) => sum + stat.totalCandidates, 0);
  const totalCompleted = statistics.reduce((sum, stat) => sum + stat.completedCandidates, 0);
  const totalSpeakingTests = statistics.reduce((sum, stat) => sum + stat.speakingStats.completedTests, 0);
  const totalProficiencyTests = statistics.reduce((sum, stat) => sum + stat.proficiencyStats.completedTests, 0);
  const totalEQTests = statistics.reduce((sum, stat) => sum + stat.eqStats.completedTests, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enhanced Assessment Reports</CardTitle>
            <div className="flex gap-2">
              <Button onClick={generateComprehensiveReport} className="bg-blue-600 hover:bg-blue-700">
                📄 Generate PDF Report
              </Button>
              <Button onClick={exportStatisticsToCSV} variant="outline">
                📊 Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overview Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{totalCandidates}</div>
                <p className="text-xs text-gray-600">Total Candidates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
                <p className="text-xs text-gray-600">Completed All Tests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-500">{totalSpeakingTests}</div>
                <p className="text-xs text-gray-600">Speaking Tests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-500">{totalProficiencyTests}</div>
                <p className="text-xs text-gray-600">Proficiency Tests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-purple-500">{totalEQTests}</div>
                <p className="text-xs text-gray-600">EQ Tests</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="speaking">Speaking Tests</TabsTrigger>
              <TabsTrigger value="proficiency">Proficiency Tests</TabsTrigger>
              <TabsTrigger value="eq">EQ Tests</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Company Performance Overview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-center font-semibold">Company</th>
                        <th className="px-4 py-3 text-center font-semibold">Candidates</th>
                        <th className="px-4 py-3 text-center font-semibold">Completion Rate</th>
                        <th className="px-4 py-3 text-center font-semibold">🗣️ Speaking</th>
                        <th className="px-4 py-3 text-center font-semibold">📚 Proficiency</th>
                        <th className="px-4 py-3 text-center font-semibold">🧠 EQ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.map((company) => (
                        <tr key={company.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{company.name}</td>
                          <td className="px-4 py-3 text-center">{company.totalCandidates}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={(company.completedCandidates / company.totalCandidates) * 100} 
                                className="w-16 h-2" 
                              />
                              <span className="text-xs">
                                {Math.round((company.completedCandidates / company.totalCandidates) * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-xs">
                              <div>{company.speakingStats.completedTests}/{company.speakingStats.totalTests}</div>
                              <div className="text-gray-500">Avg: {company.speakingStats.averageScore.toFixed(1)}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-xs">
                              <div>{company.proficiencyStats.completedTests}/{company.proficiencyStats.totalTests}</div>
                              <div className="text-gray-500">Avg: {company.proficiencyStats.averageScore.toFixed(1)}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-xs">
                              <div>{company.eqStats.completedTests}/{company.eqStats.totalTests}</div>
                              <div className="text-gray-500">Avg: {company.eqStats.averageScore.toFixed(1)}</div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="speaking" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🗣️ Speaking Test Analytics</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-blue-700">CEFR Level Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {statistics.length > 0 && statistics[0].speakingStats.cefrDistribution && 
                          Object.entries(statistics[0].speakingStats.cefrDistribution).map(([level, count]) => (
                            <div key={level} className="flex items-center justify-between">
                              <Badge className={CEFR_COLORS[level as keyof typeof CEFR_COLORS]}>
                                {level}
                              </Badge>
                              <span className="font-semibold">{count}</span>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-blue-700">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Total Tests:</span>
                          <span className="font-semibold">{totalSpeakingTests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Score:</span>
                          <span className="font-semibold">
                            {statistics.length > 0 ? 
                              (statistics.reduce((sum, s) => sum + s.speakingStats.averageScore, 0) / statistics.length).toFixed(1)
                              : '0'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completion Rate:</span>
                          <span className="font-semibold">
                            {statistics.length > 0 ? 
                              Math.round((totalSpeakingTests / statistics.reduce((sum, s) => sum + s.speakingStats.totalTests, 0)) * 100)
                              : 0
                            }%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="proficiency" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📚 Proficiency Test Analytics</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-700">CEFR Level Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {statistics.length > 0 && statistics[0].proficiencyStats.cefrDistribution && 
                          Object.entries(statistics[0].proficiencyStats.cefrDistribution).map(([level, count]) => (
                            <div key={level} className="flex items-center justify-between">
                              <Badge className={CEFR_COLORS[level as keyof typeof CEFR_COLORS]}>
                                {level}
                              </Badge>
                              <span className="font-semibold">{count}</span>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-700">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Total Tests:</span>
                          <span className="font-semibold">{totalProficiencyTests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Score:</span>
                          <span className="font-semibold">
                            {statistics.length > 0 ? 
                              (statistics.reduce((sum, s) => sum + s.proficiencyStats.averageScore, 0) / statistics.length).toFixed(1)
                              : '0'
                            }/40
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completion Rate:</span>
                          <span className="font-semibold">
                            {statistics.length > 0 ? 
                              Math.round((totalProficiencyTests / statistics.reduce((sum, s) => sum + s.proficiencyStats.totalTests, 0)) * 100)
                              : 0
                            }%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="eq" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🧠 Emotional Intelligence Test Analytics</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-purple-700">EQ Level Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {statistics.length > 0 && statistics[0].eqStats.eqDistribution && 
                          Object.entries(statistics[0].eqStats.eqDistribution).map(([level, count]) => (
                            <div key={level} className="flex items-center justify-between">
                              <Badge className={EQ_COLORS[level as keyof typeof EQ_COLORS]}>
                                {level}
                              </Badge>
                              <span className="font-semibold">{count}</span>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-purple-700">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Total Tests:</span>
                          <span className="font-semibold">{totalEQTests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Score:</span>
                          <span className="font-semibold">
                            {statistics.length > 0 ? 
                              (statistics.reduce((sum, s) => sum + s.eqStats.averageScore, 0) / statistics.length).toFixed(1)
                              : '0'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completion Rate:</span>
                          <span className="font-semibold">
                            {statistics.length > 0 ? 
                              Math.round((totalEQTests / statistics.reduce((sum, s) => sum + s.eqStats.totalTests, 0)) * 100)
                              : 0
                            }%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedReportsSection; 