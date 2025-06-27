import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';
import { Clock, FileText, Mail, Image, CheckCircle } from 'lucide-react';

interface WritingQuestion {
  id: string;
  type: string;
  title: string;
  prompt: string;
  imageUrl?: string;
  order: number;
}

interface WritingTest {
  id: string;
  title: string;
  description?: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  timeLimit: number;
  startedAt?: string;
  completedAt?: string;
}

interface WritingResponse {
  id: string;
  questionId: string;
  answer: string;
  wordCount: number;
  timeSpent: number;
}

export default function WritingCandidateTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'auth' | 'test' | 'completed'>('auth');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<WritingTest | null>(null);
  const [questions, setQuestions] = useState<WritingQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Timer effect
  useEffect(() => {
    if (step === 'test' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeRemaining]);

  // Load test data
  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  const loadTestData = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.get(`${API_URL}/api/writing-tests/${testId}`);
      
      if (response.data.success) {
        const { test, questions, responses } = response.data.data;
        setTest(test);
        setQuestions(questions.sort((a: WritingQuestion, b: WritingQuestion) => a.order - b.order));
        
        // Load existing responses
        const responseMap: Record<string, string> = {};
        const wordCountMap: Record<string, number> = {};
        responses.forEach((resp: WritingResponse) => {
          responseMap[resp.questionId] = resp.answer;
          wordCountMap[resp.questionId] = resp.wordCount;
        });
        setResponses(responseMap);
        setWordCounts(wordCountMap);

        // If test is already in progress, go to test step
        if (test.status === 'in_progress') {
          setStep('test');
          // Calculate remaining time
          const startTime = new Date(test.startedAt).getTime();
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = Math.max(0, test.timeLimit - elapsed);
          setTimeRemaining(remaining);
        } else if (test.status === 'completed') {
          setStep('completed');
        }
      }
    } catch (error) {
      console.error('Error loading test:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test data',
        variant: 'destructive',
      });
    }
  };

  const handleAuthenticate = async () => {
    if (!password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the test password',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${API_URL}/api/writing-tests/${testId}/authenticate`, {
        password: password.trim()
      });

      if (response.data.success) {
        setStep('test');
        setTimeRemaining(test?.timeLimit || 600);
        setQuestionStartTime(Date.now());
        toast({
          title: 'Success',
          description: 'Authentication successful. Your test has started!',
        });
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Invalid password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Update word count
    const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCounts(prev => ({
      ...prev,
      [questionId]: wordCount
    }));
  };

  const handleSaveResponse = async (questionId: string) => {
    const answer = responses[questionId];
    if (!answer?.trim()) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      
      await axios.post(`${API_URL}/api/writing-tests/${testId}/responses`, {
        questionId,
        answer: answer.trim(),
        timeSpent
      });

      toast({
        title: 'Saved',
        description: 'Your response has been saved',
      });
    } catch (error) {
      console.error('Error saving response:', error);
      toast({
        title: 'Error',
        description: 'Failed to save response',
        variant: 'destructive',
      });
    }
  };

  const handleNextQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      handleSaveResponse(currentQuestion.id);
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmitTest = async () => {
    // Save current response before submitting
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion && responses[currentQuestion.id]?.trim()) {
      await handleSaveResponse(currentQuestion.id);
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${API_URL}/api/writing-tests/${testId}/submit`);

      if (response.data.success) {
        setStep('completed');
        toast({
          title: 'Success',
          description: 'Test submitted successfully! Results will be available shortly.',
        });
      }
    } catch (error: any) {
      console.error('Error submitting test:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'essay': return <FileText className="w-5 h-5" />;
      case 'email': return <Mail className="w-5 h-5" />;
      case 'image_description': return <Image className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getWordCountStatus = (questionId: string, type: string) => {
    const count = wordCounts[questionId] || 0;
    let target = 150; // default
    
    if (type === 'email') target = 120;
    else if (type === 'image_description') target = 150;
    else if (type === 'essay') target = 200;

    if (count === 0) return { color: 'gray', text: `0 / ~${target} words` };
    if (count < target * 0.7) return { color: 'red', text: `${count} / ~${target} words (too short)` };
    if (count > target * 1.3) return { color: 'yellow', text: `${count} / ~${target} words (too long)` };
    return { color: 'green', text: `${count} / ~${target} words` };
  };

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (step === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Writing Assessment</CardTitle>
            <CardDescription>
              Welcome {test.candidateName}! Please enter your test password to begin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter test password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
              />
            </div>
            <Button 
              onClick={handleAuthenticate} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Authenticating...' : 'Start Test'}
            </Button>
            <div className="text-sm text-gray-600 text-center">
              <p>Test Duration: {Math.floor((test.timeLimit || 600) / 60)} minutes</p>
              <p>Questions: {questions.length} writing tasks</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Test Completed!</CardTitle>
            <CardDescription>
              Thank you for completing the writing assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Your responses have been submitted and are being evaluated. 
              Results will be available shortly.
            </p>
            <Button onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const wordCountStatus = getWordCountStatus(currentQuestion?.id || '', currentQuestion?.type || '');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Writing Assessment</h1>
            <p className="text-sm text-gray-600">{test.candidateName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${timeRemaining <= 60 ? 'text-red-600' : 'text-gray-700'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <Badge variant="outline">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-4">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {currentQuestion && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {getQuestionIcon(currentQuestion.type)}
                <div>
                  <CardTitle className="text-lg">{currentQuestion.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {currentQuestion.prompt}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion.imageUrl && (
                <div className="flex justify-center">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Writing prompt" 
                    className="max-w-md rounded-lg border"
                  />
                </div>
              )}
              
              <div>
                <Textarea
                  placeholder="Start writing your response here..."
                  value={responses[currentQuestion.id] || ''}
                  onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
                  className="min-h-[300px] resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-sm ${
                    wordCountStatus.color === 'red' ? 'text-red-600' :
                    wordCountStatus.color === 'yellow' ? 'text-yellow-600' :
                    wordCountStatus.color === 'green' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {wordCountStatus.text}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveResponse(currentQuestion.id)}
                    disabled={!responses[currentQuestion.id]?.trim()}
                  >
                    Save Response
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous Question
          </Button>
          
          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : responses[questions[index]?.id]
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmitTest}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Submitting...' : 'Submit Test'}
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              disabled={!responses[currentQuestion?.id]?.trim()}
            >
              Next Question
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 