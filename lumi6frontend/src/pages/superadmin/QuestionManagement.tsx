import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Upload, Edit, Trash2, Download, BarChart3 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Question {
  id: string;
  text: string;
  type: string;
  category: string;
  difficulty: string;
  options?: any;
  correctAnswer?: string;
  score?: number;
  normalizedScore?: number;
  weight?: number;
  mediaUrl?: string;
  mediaAudio?: string;
  mediaImage?: string;
  module?: string;
  submodule?: string;
  isActive?: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface QuestionStats {
  totalQuestions: number;
  activeQuestions: number;
  byType: Record<string, number>;
  byDifficulty: Record<string, number>;
  byLanguage: Record<string, number>;
}

export default function QuestionManagement() {
  const [activeTab, setActiveTab] = useState('speaking');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [bulkImportData, setBulkImportData] = useState('');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    text: '',
    type: 'mcq',
    category: 'general',
    difficulty: 'medium',
    options: [] as string[],
    correctAnswer: '',
    score: 100,
    normalizedScore: 100,
    weight: 1.0,
    mediaUrl: '',
    mediaAudio: '',
    mediaImage: '',
    module: '',
    submodule: '',
    language: 'en'
  });

  useEffect(() => {
    fetchQuestions();
    fetchStats();
  }, [activeTab, currentPage, filterType, filterDifficulty, filterLanguage, searchTerm]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let endpoint = '';
      
      switch (activeTab) {
        case 'speaking':
          endpoint = '/api/questions';
          break;
        case 'proficiency':
          endpoint = '/api/superadmin/proficiency-questions';
          break;
        case 'eq':
          endpoint = '/api/eq-questions';
          break;
        default:
          return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterDifficulty !== 'all' && { difficulty: filterDifficulty }),
        ...(filterLanguage !== 'all' && { language: filterLanguage }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await axios.get(`${API_URL}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (activeTab === 'proficiency') {
        setQuestions(response.data.questions || []);
        setTotalPages(Math.ceil((response.data.questions || []).length / 20));
      } else {
        setQuestions(response.data.questions || []);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch questions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      
      switch (activeTab) {
        case 'speaking':
          endpoint = '/api/questions/stats';
          break;
        case 'proficiency':
          endpoint = '/api/superadmin/proficiency-questions/stats';
          break;
        case 'eq':
          endpoint = '/api/eq-questions/stats';
          break;
        default:
          return;
      }

      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let data = { ...formData };

      switch (activeTab) {
        case 'speaking':
          endpoint = '/api/questions';
          break;
        case 'proficiency':
          endpoint = '/api/superadmin/proficiency-questions';
          break;
        case 'eq':
          endpoint = '/api/eq-questions';
          break;
        default:
          return;
      }

      if (editingQuestion) {
        await axios.put(`${API_URL}${endpoint}/${editingQuestion.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({
          title: 'Success',
          description: 'Question updated successfully'
        });
      } else {
        await axios.post(`${API_URL}${endpoint}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({
          title: 'Success',
          description: 'Question created successfully'
        });
      }

      setShowCreateDialog(false);
      resetForm();
      fetchQuestions();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save question',
        variant: 'destructive'
      });
    }
  };

  const handleBulkImport = async () => {
    try {
      const questions = JSON.parse(bulkImportData);
      const token = localStorage.getItem('token');
      let endpoint = '';

      switch (activeTab) {
        case 'speaking':
          endpoint = '/api/questions/bulk-import';
          break;
        case 'proficiency':
          endpoint = '/api/superadmin/proficiency-questions/import';
          break;
        case 'eq':
          endpoint = '/api/eq-questions/bulk-import';
          break;
        default:
          return;
      }
      
      await axios.post(`${API_URL}${endpoint}`, { questions }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: 'Success',
        description: 'Questions imported successfully'
      });

      setShowBulkImportDialog(false);
      setBulkImportData('');
      fetchQuestions();
      fetchStats();
    } catch (error: any) {
      console.error('Error importing questions:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to import questions',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const token = localStorage.getItem('token');
      let endpoint = '';

      switch (activeTab) {
        case 'speaking':
          endpoint = `/api/questions/${questionId}`;
          break;
        case 'proficiency':
          endpoint = `/api/superadmin/proficiency-questions/${questionId}`;
          break;
        case 'eq':
          endpoint = `/api/eq-questions/${questionId}`;
          break;
        default:
          return;
      }

      await axios.delete(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: 'Success',
        description: 'Question deleted successfully'
      });

      fetchQuestions();
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete question',
        variant: 'destructive'
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';

      switch (activeTab) {
        case 'speaking':
          endpoint = '/api/questions/export';
          break;
        case 'proficiency':
          endpoint = '/api/superadmin/proficiency-questions/export';
          break;
        case 'eq':
          endpoint = '/api/eq-questions/export';
          break;
        default:
          return;
      }

      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}-questions.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Questions exported successfully'
      });
    } catch (error: any) {
      console.error('Error exporting questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to export questions',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      type: 'mcq',
      category: 'general',
      difficulty: 'medium',
      options: [],
      correctAnswer: '',
      score: 100,
      normalizedScore: 100,
      weight: 1.0,
      mediaUrl: '',
      mediaAudio: '',
      mediaImage: '',
      module: '',
      submodule: '',
      language: 'en'
    });
    setEditingQuestion(null);
  };

  const getQuestionTypeOptions = () => {
    switch (activeTab) {
      case 'speaking':
        return ['mcq', 'open-ended', 'audio-response'];
      case 'proficiency':
        return ['mcq', 'fill-in-blank', 'true-false'];
      case 'eq':
        return ['likert', 'mcq'];
      default:
        return ['mcq'];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Question Management</h1>
          <p className="text-gray-600">Manage all assessment questions across different test types</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Questions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulkData">JSON Data</Label>
                  <Textarea
                    id="bulkData"
                    placeholder="Paste JSON array of questions here..."
                    value={bulkImportData}
                    onChange={(e) => setBulkImportData(e.target.value)}
                    rows={10}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowBulkImportDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkImport}>Import Questions</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'Edit' : 'Create'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Question
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="text">Question Text</Label>
                  <Textarea
                    id="text"
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    placeholder="Enter the question text..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Question Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getQuestionTypeOptions().map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., grammar, vocabulary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* EQ-specific fields */}
                {activeTab === 'eq' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="module">Module</Label>
                      <Select value={formData.module} onValueChange={(value) => setFormData({ ...formData, module: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="goleman">Goleman Model</SelectItem>
                          <SelectItem value="msceit">MSCEIT</SelectItem>
                          <SelectItem value="eq-i-2.0">EQ-i 2.0</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="submodule">Submodule</Label>
                      <Input
                        id="submodule"
                        value={formData.submodule}
                        onChange={(e) => setFormData({ ...formData, submodule: e.target.value })}
                        placeholder="e.g., self-awareness"
                      />
                    </div>
                  </div>
                )}

                {/* MCQ Options */}
                {(formData.type === 'mcq' || formData.type === 'likert') && (
                  <div>
                    <Label htmlFor="options">Options (one per line)</Label>
                    <Textarea
                      id="options"
                      value={formData.options.join('\n')}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value.split('\n').filter(o => o.trim()) })}
                      placeholder="Option 1&#10;Option 2&#10;Option 3&#10;Option 4"
                      rows={4}
                    />
                  </div>
                )}

                {formData.type === 'mcq' && (
                  <div>
                    <Label htmlFor="correctAnswer">Correct Answer</Label>
                    <Input
                      id="correctAnswer"
                      value={formData.correctAnswer}
                      onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                      placeholder="Enter the correct answer"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="score">Score</Label>
                    <Input
                      id="score"
                      type="number"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  {activeTab === 'eq' && (
                    <div>
                      <Label htmlFor="weight">Weight</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateQuestion}>
                    {editingQuestion ? 'Update Question' : 'Create Question'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Questions</p>
                  <p className="text-2xl font-bold">{stats.totalQuestions}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Questions</p>
                  <p className="text-2xl font-bold">{stats.activeQuestions}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Languages</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.byLanguage || {}).length}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">L</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Question Types</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.byType || {}).length}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">T</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Question Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="speaking">Speaking Questions</TabsTrigger>
          <TabsTrigger value="proficiency">Proficiency Questions</TabsTrigger>
          <TabsTrigger value="eq">EQ Questions</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search Questions</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by question text..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="filterType">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {getQuestionTypeOptions().map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filterDifficulty">Difficulty</Label>
                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filterLanguage">Language</Label>
                  <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Questions ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Language</TableHead>
                    {activeTab === 'eq' && <TableHead>Module</TableHead>}
                    <TableHead>Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={question.text}>
                          {question.text}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {question.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.category}</TableCell>
                      <TableCell>
                        <Badge variant={
                          question.difficulty === 'easy' ? 'default' :
                          question.difficulty === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.language?.toUpperCase() || 'EN'}</TableCell>
                      {activeTab === 'eq' && (
                        <TableCell>
                          <Badge variant="outline">
                            {question.module}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>{question.score || question.normalizedScore || 0}</TableCell>
                      <TableCell>
                        {new Date(question.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingQuestion(question);
                              setFormData({
                                text: question.text,
                                type: question.type,
                                category: question.category,
                                difficulty: question.difficulty,
                                options: Array.isArray(question.options) ? question.options : [],
                                correctAnswer: question.correctAnswer || '',
                                score: question.score || question.normalizedScore || 100,
                                normalizedScore: question.normalizedScore || 100,
                                weight: question.weight || 1.0,
                                mediaUrl: question.mediaUrl || '',
                                mediaAudio: question.mediaAudio || '',
                                mediaImage: question.mediaImage || '',
                                module: question.module || '',
                                submodule: question.submodule || '',
                                language: question.language || 'en'
                              });
                              setShowCreateDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 