import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface SessionRecoveryBannerProps {
  candidateId: string;
}

const SessionRecoveryBanner = ({ candidateId }: SessionRecoveryBannerProps) => {
  const [hasInterruptedSession, setHasInterruptedSession] = useState(false);
  const [recoveringSession, setRecoveringSession] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if the candidate has any interrupted sessions
    const checkForInterruptedSessions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(
          `${API_URL}/api/candidates/${candidateId}/sessions/interrupted`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        setHasInterruptedSession(response.data.hasInterruptedSession);
      } catch (error) {
        console.error('Error checking for interrupted sessions:', error);
      }
    };
    
    if (candidateId) {
      checkForInterruptedSessions();
    }
  }, [candidateId]);
  
  const handleRecoverSession = async () => {
    try {
      setRecoveringSession(true);
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');
      
      const response = await axios.post(
        `${API_URL}/api/candidates/${candidateId}/sessions/recover`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // If recovery successful, navigate to the test page
      if (response.data.recovered) {
        const testId = response.data.candidateTest.id;
        navigate(`/candidate/test/${testId}`);
      } else {
        // No session to recover
        setHasInterruptedSession(false);
      }
    } catch (error) {
      console.error('Error recovering session:', error);
    } finally {
      setRecoveringSession(false);
    }
  };
  
  if (!hasInterruptedSession) {
    return null;
  }
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Resume your previous test</AlertTitle>
      <AlertDescription className="flex flex-col space-y-4">
        <p>
          You have an unfinished test session. Would you like to resume where you left off?
        </p>
        <div className="flex space-x-4">
          <Button 
            variant="outline" 
            onClick={handleRecoverSession}
            disabled={recoveringSession}
          >
            {recoveringSession ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Resuming...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Resume Test
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setHasInterruptedSession(false)}
            disabled={recoveringSession}
          >
            Start a new test
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default SessionRecoveryBanner; 