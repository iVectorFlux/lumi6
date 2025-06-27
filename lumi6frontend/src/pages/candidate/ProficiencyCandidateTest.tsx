import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';
import { getApiUrl, API_CONFIG } from '@/config/api';
import { handleApiError } from '@/utils/errorHandler';

interface ProficiencyQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  category: string;
}

interface TestResult {
  score: number;
  result: string;
}

export default function ProficiencyCandidateTest() {
  const { testId } = useParams();
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [questions, setQuestions] = useState<ProficiencyQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn && testId) {
      axios.get(getApiUrl(`${API_CONFIG.ENDPOINTS.PROFICIENCY_TESTS}/${testId}/questions`)).then(res => {
        setQuestions(res.data.questions);
      });
    }
  }, [isLoggedIn, testId]);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    // Optionally: verify password with backend
    setIsLoggedIn(true);
  };

  const handleAnswer = (qid: string, val: string) => {
    setAnswers(a => ({ ...a, [qid]: val }));
  };

  const handleNext = () => setCurrent(c => c + 1);
  const handlePrev = () => setCurrent(c => c - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const answerArr = questions.map(q => ({ questionId: q.id, answer: answers[q.id] || '' }));
      const res = await axios.post(getApiUrl(`${API_CONFIG.ENDPOINTS.PROFICIENCY_TESTS}/${testId}/submit`), { answers: answerArr });
      setResult(res.data);
    } catch (err: any) {
      setError(handleApiError(err, 'Failed to submit test'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Proficiency Test Login</CardTitle>
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
              <div className="bg-green-50 p-3 rounded text-sm">
                <strong>About this Proficiency Test:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-gray-700">
                  <li>40 multiple choice questions</li>
                  <li>CEFR-based language proficiency assessment</li>
                  <li>Takes approximately 20-25 minutes</li>
                  <li>Results available immediately after completion</li>
                </ul>
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Start Proficiency Test
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    const scorePercentage = (result.score / 40) * 100;
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-700">Proficiency Test Complete!</CardTitle>
            <p className="text-gray-600">Your CEFR Language Proficiency Results</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="text-4xl font-bold text-green-700 mb-2">
                {result.result}
              </div>
              <div className="text-lg font-semibold text-green-600 mb-1">
                CEFR Level
              </div>
              <div className="text-sm text-gray-600">
                Score: <span className="font-semibold">{result.score} / 40 ({Math.round(scorePercentage)}%)</span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Score Analysis</h3>
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Overall Performance</span>
                  <span className="font-bold text-green-600">{Math.round(scorePercentage)}%</span>
                </div>
                <Progress value={scorePercentage} className="h-3" />
                <div className="mt-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Correct Answers</span>
                    <span className="font-medium">{result.score} out of 40</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CEFR Level Achieved</span>
                    <span className="font-medium">{result.result}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CEFR Level Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Proficiency Level</span>
                <span className="font-semibold text-green-600">{result.result}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Based on the Common European Framework of Reference for Languages
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
                className="bg-green-600 hover:bg-green-700"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading proficiency test questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[current];
  const isLastQuestion = current === questions.length - 1;
  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-green-700">
              CEFR Proficiency Test
            </h1>
            <div className="text-sm text-gray-600">
              Question {current + 1} of {questions.length}
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
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full capitalize">
                {currentQuestion.category || 'Language Proficiency'}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                Multiple Choice
              </span>
            </div>
            <CardTitle className="text-lg">{currentQuestion.text}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options && Array.isArray(currentQuestion.options) && (
                currentQuestion.options.map((option: string, index: number) => (
                  <label 
                    key={index} 
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`question_${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswer(currentQuestion.id, option)}
                      className="text-green-600"
                    />
                    <span className="flex-1">{option}</span>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={handlePrev} 
            disabled={current === 0}
            variant="outline"
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {!isLastQuestion ? (
              <Button 
                onClick={handleNext} 
                disabled={!answers[currentQuestion.id]}
                className="bg-green-600 hover:bg-green-700"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !answers[currentQuestion.id]}
                className="bg-blue-600 hover:bg-blue-700"
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

        {!answers[currentQuestion.id] && isLastQuestion && (
          <div className="mt-4 text-amber-600 text-sm bg-amber-50 p-3 rounded">
            Please answer the current question before submitting the test.
          </div>
        )}
      </div>
    </div>
  );
} 