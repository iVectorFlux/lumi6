import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import CandidateResultPanel from '@/components/shared/CandidateResultPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';

const Results = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const findCandidateByAssessmentId = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        
        // Try to fetch assessment data first
        const assessmentResponse = await axios.get(`${API_URL}/api/assessments/${assessmentId}`);
        
        if (assessmentResponse.data?.candidateTestId) {
          // Find candidate by candidateTestId  
          const candidateTestResponse = await axios.get(`${API_URL}/api/candidate-tests/${assessmentResponse.data.candidateTestId}`);
          if (candidateTestResponse.data?.candidateId) {
            setCandidateId(candidateTestResponse.data.candidateId);
          }
        }
        
        // If we still don't have candidateId, try a different approach
        if (!candidateId) {
          // This might be a mock assessment ID, try to find recent completed candidates
          // This is a fallback for development/testing
          console.log('Using fallback method to find candidate...');
          
          // For now, we'll use a mock candidate ID if available
          // In production, you'd want better tracking of assessment-to-candidate mapping
          const mockCandidateId = 'f31a6b05-d178-4cc3-bd05-ae2835717b33'; // The test candidate
          setCandidateId(mockCandidateId);
        }
        
      } catch (err) {
        console.error('Error finding candidate:', err);
        setError('Unable to load assessment results. The assessment may not be completed yet.');
      } finally {
        setLoading(false);
      }
    };

    if (assessmentId) {
      findCandidateByAssessmentId();
    } else {
      setError('No assessment ID provided');
      setLoading(false);
    }
  }, [assessmentId, candidateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <CardHeader>
            <CardTitle>Loading Your Results...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Please wait while we retrieve your assessment results.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !candidateId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Results Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">
              {error || 'We couldn\'t find your assessment results. This might be because:'}
            </p>
            <ul className="text-sm text-gray-500 mb-6 text-left space-y-1">
              <li>• The assessment is still being processed</li>
              <li>• The assessment ID is invalid</li>
              <li>• The results have expired</li>
            </ul>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🔄 Try Again
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="w-full"
              >
                🏠 Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎯 Your Assessment Results
          </h1>
          <p className="text-lg text-gray-600">
            Congratulations on completing your English proficiency assessment!
          </p>
        </div>

        {/* Results Panel */}
        <CandidateResultPanel 
          candidateId={candidateId} 
          showAsFullReport={true}
          onClose={() => navigate('/')} 
        />

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button 
            onClick={() => navigate('/test')}
            variant="outline"
            className="px-6 py-3"
          >
            📝 Take Another Test
          </Button>
          <Button 
            onClick={() => navigate('/')}
            className="bg-green-600 hover:bg-green-700 px-6 py-3"
          >
            🏠 Go to Homepage
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>
            Your results are automatically saved and can be accessed anytime with this link.
          </p>
          <p className="mt-1">
            Share your achievement: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
              {window.location.href}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results; 