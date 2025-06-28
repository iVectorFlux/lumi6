import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { handleApiError } from '@/utils/errorHandler';

interface EQQuestion {
  id: string;
  text: string;
  type: 'likert' | 'mcq';
  module: string;
  submodule: string;
  options: Array<{
    label: string;
    value: string;
    score: number;
  }>;
  mediaUrl?: string;
}

interface EQTestResult {
  resultId: string;
  evaluation: {
    overallScore: number;
    eqRating: string;
    moduleScores: Record<string, any>;
    inconsistencyIndex: number;
    inconsistencyRating: string;
  };
}

export default function EQCandidateTest() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidate');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [questions, setQuestions] = useState<EQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EQTestResult | null>(null);
  const [error, setError] = useState('');
  const [testInfo, setTestInfo] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await axios.get(getApiUrl(`/api/eq/tests/${testId}/questions`), {
        headers: { 'X-Test-Password': password }
      });
      
      setQuestions(res.data.questions);
      setTestInfo(res.data.test);
      setIsLoggedIn(true);
    } catch (err: any) {
      setError(handleApiError(err, 'Invalid password or test not found'));
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    
    try {
      // Convert answers to the expected format
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));

      const res = await axios.post(getApiUrl(`/api/eq/tests/${testId}/submit`), {
        candidateId,
        responses
      });
      
      setResult(res.data);
    } catch (err: any) {
      setError(handleApiError(err, 'Failed to submit test'));
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate progress
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">EQ Test Login</CardTitle>
            <p className="text-center text-gray-600">Enter your test password to begin</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Test Password</label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Enter test password"
                  required 
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
              <div className="bg-blue-50 p-3 rounded text-sm">
                <strong>About this EQ Test:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-gray-700">
                  <li>80 questions covering emotional intelligence</li>
                  <li>Takes approximately 15-20 minutes</li>
                  <li>Answer honestly for accurate results</li>
                  <li>Results available immediately after completion</li>
                </ul>
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                Start EQ Test
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    const { evaluation } = result;
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-purple-700">EQ Test Complete!</CardTitle>
            <p className="text-gray-600">Your Emotional Intelligence Assessment Results</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <div className="text-4xl font-bold text-purple-700 mb-2">
                {Math.round(evaluation.overallScore)}
              </div>
              <div className="text-lg font-semibold text-purple-600 mb-1">
                Overall EQ Score
              </div>
              <div className="text-sm text-gray-600">
                Rating: <span className="font-semibold">{evaluation.eqRating}</span>
              </div>
            </div>

            {/* Module Scores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detailed Breakdown</h3>
              {Object.entries(evaluation.moduleScores).map(([module, data]: [string, any]) => (
                <div key={module} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium capitalize">{module.replace('-', ' ')}</span>
                    <span className="font-bold text-purple-600">{Math.round(data.score)}</span>
                  </div>
                  <Progress value={data.score} className="h-2" />
                  {data.submodules && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(data.submodules).map(([submodule, score]: [string, any]) => (
                        <div key={submodule} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{submodule.replace('-', ' ')}</span>
                          <span className="font-medium">{Math.round(score)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Consistency Rating */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Response Consistency</span>
                <span className="font-semibold text-green-600">{evaluation.inconsistencyRating}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Inconsistency Index: {evaluation.inconsistencyIndex.toFixed(1)}%
              </div>
            </div>

            <div className="text-center pt-4">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="mr-4"
              >
                Retake Test
              </Button>
              <Button 
                onClick={() => window.print()} 
                className="bg-purple-600 hover:bg-purple-700"
              >
                Print Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading EQ test questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const canSubmit = answeredCount === questions.length;

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-purple-700">
              {testInfo?.title || 'EQ Assessment'}
            </h1>
            <div className="text-sm text-gray-600">
              Question {currentIndex + 1} of {questions.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>Progress: {Math.round(progress)}%</span>
            <span>Answered: {answeredCount}/{questions.length}</span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full capitalize">
                {currentQuestion.module}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                {currentQuestion.submodule.replace('-', ' ')}
              </span>
            </div>
            <CardTitle className="text-lg">{currentQuestion.text}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((opt: any, index) => {
                const value = typeof opt === 'string' ? opt : opt.value;
                const label = typeof opt === 'string' ? opt : opt.label;
                return (
                  <label
                    key={value}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`question_${currentQuestion.id}`}
                      value={value}
                      checked={answers[currentQuestion.id] === value}
                      onChange={() => handleAnswer(currentQuestion.id, value)}
                      className="text-purple-600"
                    />
                    <span className="flex-1">{label}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={handlePrevious} 
            disabled={currentIndex === 0}
            variant="outline"
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {!isLastQuestion ? (
              <Button 
                onClick={handleNext} 
                disabled={!answers[currentQuestion.id]}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !canSubmit}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {!canSubmit && isLastQuestion && (
          <div className="mt-4 text-amber-600 text-sm bg-amber-50 p-3 rounded">
            Please answer all questions before submitting the test.
          </div>
        )}
      </div>
    </div>
  );
} 