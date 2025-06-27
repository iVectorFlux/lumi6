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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Filter, Download, Upload, Edit, Trash2, BarChart3 } from 'lucide-react';
import axios from 'axios';

interface EQQuestion {
  id: string;
  text: string;
  type: 'likert' | 'mcq';
  module: string;
  submodule: string;
  category: string;
  difficulty: string;
  options?: any;
  correctAnswer?: string;
  normalizedScore: number;
  weight: number;
  scoring?: any;
  mediaUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EQModules {
  [key: string]: {
    name: string;
    submodules: string[];
  };
}

interface QuestionStats {
  totalQuestions: number;
  likertQuestions: number;
  mcqQuestions: number;
  activeQuestions: number;
  moduleStats: Record<string, number>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function EQQuestionBank() {
  const [questions, setQuestions] = useState<EQQuestion[]>([]);
  const [modules, setModules] = useState<EQModules>({});
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterSubmodule, setFilterSubmodule] = useState('all');
  const [filterActive, setFilterActive] = useState('true');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EQQuestion | null>(null);
  const { toast } = useToast();

  // Form state for creating/editing questions
  const [formData, setFormData] = useState({
    text: '',
    type: 'likert' as 'likert' | 'mcq',
    module: '',
    submodule: '',
    category: 'general',
    difficulty: 'medium',
    options: [],
    correctAnswer: '',
    normalizedScore: 100,
    weight: 1.0,
    mediaUrl: ''
  });

  // Bulk import state
  const [bulkImportData, setBulkImportData] = useState('');

  useEffect(() => {
    fetchQuestions();
    fetchModules();
    fetchStats();
  }, [currentPage, filterType, filterModule, filterSubmodule, filterActive, searchTerm]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterModule !== 'all' && { module: filterModule }),
        ...(filterSubmodule !== 'all' && { submodule: filterSubmodule }),
        isActive: filterActive,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await axios.get(`${API_URL}/api/eq-questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setQuestions(response.data.questions);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching EQ questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch EQ questions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/eq-questions/modules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModules(response.data.modules);
    } catch (error) {
      console.error('Error fetching EQ modules:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/eq-questions/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching EQ question stats:', error);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/eq-questions`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: 'Success',
        description: 'EQ question created successfully'
      });

      setShowCreateDialog(false);
      resetForm();
      fetchQuestions();
      fetchStats();
    } catch (error: any) {
      console.error('Error creating EQ question:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create EQ question',
        variant: 'destructive'
      });
    }
  };

  const handleBulkImport = async () => {
    try {
      const questions = JSON.parse(bulkImportData);
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_URL}/api/eq-questions/bulk-import`, { questions }, {
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

  const resetForm = () => {
    setFormData({
      text: '',
      type: 'likert',
      module: '',
      submodule: '',
      category: 'general',
      difficulty: 'medium',
      options: [],
      correctAnswer: '',
      normalizedScore: 0,
      weight: 1.0,
      mediaUrl: ''
    });
    setEditingQuestion(null);
  };

  const getTypeColor = (type: string) => {
    return type === 'likert' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getModuleColor = (module: string) => {
    const colors = {
      'goleman': 'bg-purple-100 text-purple-800',
      'msceit': 'bg-orange-100 text-orange-800',
      'eq-i-2.0': 'bg-teal-100 text-teal-800'
    };
    return colors[module as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold">EQ Question Bank</h1>
          <p className="text-gray-600">Manage Emotional Intelligence assessment questions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import EQ Questions</DialogTitle>
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'Edit EQ Question' : 'Create New EQ Question'}
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
                    <Select value={formData.type} onValueChange={(value: 'likert' | 'mcq') => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="likert">Likert Scale</SelectItem>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="module">Module</Label>
                    <Select value={formData.module} onValueChange={(value) => setFormData({ ...formData, module: value, submodule: '' })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(modules).map(([key, module]) => (
                          <SelectItem key={key} value={key}>{module.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="submodule">Submodule</Label>
                    <Select 
                      value={formData.submodule} 
                      onValueChange={(value) => setFormData({ ...formData, submodule: value })}
                      disabled={!formData.module}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select submodule" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.module && modules[formData.module]?.submodules.map((submodule) => (
                          <SelectItem key={submodule} value={submodule}>
                            {submodule.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                    <Label htmlFor="normalizedScore">Normalized Score (0-100)</Label>
                    <Input
                      id="normalizedScore"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.normalizedScore}
                      onChange={(e) => setFormData({ ...formData, normalizedScore: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  <p className="text-sm text-gray-600">Likert Scale</p>
                  <p className="text-2xl font-bold">{stats.likertQuestions}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">L</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Multiple Choice</p>
                  <p className="text-2xl font-bold">{stats.mcqQuestions}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">M</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
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
                  <p className="text-sm text-gray-600">Modules</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.moduleStats).length}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">M</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  <SelectItem value="likert">Likert</SelectItem>
                  <SelectItem value="mcq">MCQ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filterModule">Module</Label>
              <Select value={filterModule} onValueChange={(value) => { setFilterModule(value); setFilterSubmodule('all'); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {Object.entries(modules).map(([key, module]) => (
                    <SelectItem key={key} value={key}>{module.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filterSubmodule">Submodule</Label>
              <Select value={filterSubmodule} onValueChange={setFilterSubmodule} disabled={filterModule === 'all'}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submodules</SelectItem>
                  {filterModule !== 'all' && modules[filterModule]?.submodules.map((submodule) => (
                    <SelectItem key={submodule} value={submodule}>
                      {submodule.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filterActive">Status</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTypeColor(question.type)}>
                        {question.type.toUpperCase()}
                      </Badge>
                      <Badge className={getModuleColor(question.module)}>
                        {modules[question.module]?.name || question.module}
                      </Badge>
                      <Badge variant="outline">
                        {question.submodule.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                      <Badge variant={question.isActive ? 'default' : 'secondary'}>
                        {question.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{question.text}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Score: {question.normalizedScore}/100</span>
                      <span>Weight: {question.weight}</span>
                      <span>Difficulty: {question.difficulty}</span>
                      <span>Created: {new Date(question.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingQuestion(question);
                        setFormData({
                          text: question.text,
                          type: question.type,
                          module: question.module,
                          submodule: question.submodule,
                          category: question.category,
                          difficulty: question.difficulty,
                          options: question.options || [],
                          correctAnswer: question.correctAnswer || '',
                          normalizedScore: question.normalizedScore,
                          weight: question.weight,
                          mediaUrl: question.mediaUrl || ''
                        });
                        setShowCreateDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 