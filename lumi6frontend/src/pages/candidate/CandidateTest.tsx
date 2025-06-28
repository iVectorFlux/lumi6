// Environment configuration loaded

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Mic, Video, Timer, AlertCircle } from 'lucide-react';
import { Question } from '@/lib/types';
import { submitAssessment, getAssessmentResults, submitAssessmentConcatenated } from "@/api/assessmentService";
import axios from 'axios';
import { Progress } from "@/components/ui/progress";


// Change default answer time to 45 seconds
const DEFAULT_ANSWER_TIME = 45;
const PREPARATION_TIME = 15;

// Upload optimization - use concatenated upload for faster performance
const USE_CONCATENATED_UPLOAD = true;

// Restore static array of 5 questions, with imageUrl for image questions
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: '1',
    type: 'introduction',
    text: 'Please introduce yourself and tell us about your hobbies.',
    preparationTime: 0,
    responseTime: 45
  },
  {
    id: '2',
    type: 'picture_description',
    text: 'Describe what you see in this image and explain what might be happening.',
    imageUrl: '/park-scene.jpg',
    preparationTime: 0,
    responseTime: 45
  },
  {
    id: '3',
    type: 'situation',
    text: 'Imagine you are planning a trip to another country. Describe where you would go and what activities you would do there.',
    preparationTime: 0,
    responseTime: 45
  },
  {
    id: '4',
    type: 'picture_description',
    text: 'Look at this picture of a family gathering. Describe the scene and talk about a similar experience you\'ve had.',
    imageUrl: '/family-gathering.jpg',
    preparationTime: 0,
    responseTime: 45
  },
  {
    id: '5',
    type: 'opinion',
    text: 'Discuss a challenging situation you\'ve faced and how you dealt with it.',
    preparationTime: 0,
    responseTime: 45
  }
];

function useTabSwitchTracker() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        setEvents(e => [...e, { type: 'hidden', timestamp: Date.now() }]);
      }
    }
    function handleBlur() {
      setEvents(e => [...e, { type: 'blur', timestamp: Date.now() }]);
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  return events;
}

export default function CandidateTest() {
  const { testId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [candidateTestId, setCandidateTestId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<'preparation' | 'recording' | 'review'>('preparation');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_ANSWER_TIME); // 45 seconds answer time
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [allAnswered, setAllAnswered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const tabSwitchEvents = useTabSwitchTracker();

  // Simple completion state
  const [showCompletion, setShowCompletion] = useState(false);

  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const allAnsweredRef = useRef(allAnswered);
  const allRecordingsRef = useRef<Blob[]>([]);

  // Add state for upload progress and uploading
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [prepTimeLeft, setPrepTimeLeft] = useState(PREPARATION_TIME);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    allAnsweredRef.current = allAnswered;
  }, [allAnswered]);

  // Update the video ref callback to handle stream attachment more carefully
  const videoRefCallback = (element: HTMLVideoElement | null) => {
    if (element) {
      console.log('Attaching stream to video element', element, stream);
      videoRef.current = element;
      if (stream && !element.srcObject) {
        element.srcObject = stream;
        // Only try to play if not already playing
        if (element.paused) {
          element.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Error playing video:', err);
            }
          });
        }
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation for demo
    if (email && password) {
      // Fetch candidateTestId
      await fetchCandidateTestId();
      
      setIsLoggedIn(true);
      toast({
        title: "Login successful",
        description: "Welcome to the English Speaking Test",
      });
    } else {
      toast({
        title: "Login failed",
        description: "Please enter your email and password",
        variant: "destructive",
      });
    }
  };

  const fetchCandidateTestId = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      
      // Get candidate info by email to find candidateTestId
      const response = await axios.get(`${API_URL}/api/candidates/by-email/${email}`);
      console.log('Candidate data response:', response.data);
      
      if (response.data?.tests && response.data.tests.length > 0) {
        // Find the most recent test for this test ID
        const candidateTest = response.data.tests.find((test: any) => test.testId === testId);
        console.log('Looking for testId:', testId);
        console.log('Available tests:', response.data.tests);
        
        if (candidateTest) {
          setCandidateTestId(candidateTest.id);
          console.log('Found candidateTestId:', candidateTest.id);
        } else {
          console.log('No matching candidateTest found for testId:', testId);
          // Try to use the first available test
          const firstTest = response.data.tests[0];
          if (firstTest) {
            setCandidateTestId(firstTest.id);
            console.log('Using first available candidateTestId:', firstTest.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching candidateTestId:', error);
      // Will proceed without candidateTestId - backend can handle this gracefully
    }
  };

  const startTest = async () => {
    setShowInstructions(false);
    setPhase('preparation');
    setPrepTimeLeft(PREPARATION_TIME);
  };

  // Auto-submit when all questions are answered
  useEffect(() => {
    if (allAnswered && !submitted && !uploading) {
      console.log('All questions answered, auto-submitting...');
      handleSubmitAssessment();
    }
  }, [allAnswered, submitted, uploading]);

  // Request permissions after login
  useEffect(() => {
    if (isLoggedIn && !permissionsRequested) {
      requestPermissions();
      setPermissionsRequested(true);
    }
  }, [isLoggedIn, permissionsRequested]);

  const requestPermissions = async () => {
    setPermissionError("");
    console.log('Requesting camera/mic permissions...');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 15, max: 24 },
          facingMode: "user"
        },
        audio: true
      });
      console.log('Got media stream:', mediaStream);
      setStream(mediaStream);
      setHasPermissions(true);
    } catch (error) {
      setHasPermissions(false);
      setPermissionError("Could not access your camera or microphone. Please check your browser permissions and try again.");
      console.error('Error requesting permissions:', error);
    }
  };

  // Preparation timer effect
  useEffect(() => {
    let prepTimer: NodeJS.Timeout;
    if (phase === 'preparation' && prepTimeLeft > 0) {
      console.log('[PrepTimer] Starting preparation timer for', prepTimeLeft, 'seconds');
      prepTimer = setInterval(() => {
        setPrepTimeLeft((prev) => {
          console.log('[PrepTimer] Preparation time remaining:', prev - 1);
          if (prev <= 1) {
            console.log('[PrepTimer] Preparation finished, starting recording');
            // Set recording phase and timer first
            setPhase('recording');
            setTimeLeft(DEFAULT_ANSWER_TIME);
            // Start recording after a small delay to ensure state is updated
            setTimeout(() => startRecording(), 200);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (prepTimer) {
        console.log('[PrepTimer] Cleaning up preparation timer');
        clearInterval(prepTimer);
      }
    };
  }, [phase, prepTimeLeft]);

  // Recording timer effect - fixed to not depend on timeLeft to prevent resets
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'recording' && hasPermissions && stream) {
      console.log('[Timer] Starting recording timer for', DEFAULT_ANSWER_TIME, 'seconds');
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          console.log('[Timer] Recording time remaining:', prev - 1);
          if (prev <= 1) {
            console.log('[Timer] Recording time finished, stopping recording');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) {
        console.log('[Timer] Cleaning up recording timer');
        clearInterval(timer);
      }
    };
  }, [phase, hasPermissions, stream]); // Removed timeLeft from dependencies

  const startRecording = () => {
    if (!stream || allAnsweredRef.current) {
      console.log('[startRecording] Cannot start - no stream or already answered');
      return;
    }
    
    // Stop any existing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[startRecording] Stopping existing recording');
      mediaRecorderRef.current.stop();
    }
    
    console.log('[startRecording] Starting recording for question', currentQuestionIndexRef.current);
    
    // Only use the audio track for recording
    const audioStream = new MediaStream(stream.getAudioTracks());
    const mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm; codecs=opus',
      audioBitsPerSecond: 12000 // 12kbps for smaller files (optimized for speech)
    });
    
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        console.log('[ondataavailable] Data chunk received:', event.data.size, 'bytes');
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      console.log('[onstop] Recording completed. Blob size:', blob.size, 'bytes');
      
      // Store each question's blob
      allRecordingsRef.current.push(blob);
      console.log('[onstop] Total recordings stored:', allRecordingsRef.current.length);
      
      // Set phase to review
      setPhase('review');
      
      // Check if this was the last question
      if (currentQuestionIndexRef.current >= SAMPLE_QUESTIONS.length - 1) {
        setAllAnswered(true);
        allAnsweredRef.current = true;
        console.log('[onstop] All questions completed');
        return;
      }
      
      // Move to next question after a brief delay
      setTimeout(() => {
        console.log('[onstop] Moving to next question');
        handleNext();
      }, 1000); // 1 second delay to show review phase
    };
    
    try {
      // Start recording and set initial state
      mediaRecorder.start();
      console.log('[startRecording] MediaRecorder started successfully');
      
      // Set recording phase and reset timer
      setPhase('recording');
      setTimeLeft(DEFAULT_ANSWER_TIME);
      
    } catch (error) {
      console.error('[startRecording] Error starting recording:', error);
      // Retry after a delay
      setTimeout(() => {
        if (mediaRecorder.state === 'inactive') {
          try {
            mediaRecorder.start();
            setPhase('recording');
            setTimeLeft(DEFAULT_ANSWER_TIME);
          } catch (retryError) {
            console.error('[startRecording] Retry failed:', retryError);
          }
        }
      }, 100);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleNext = () => {
    if (allAnsweredRef.current || currentQuestionIndexRef.current >= SAMPLE_QUESTIONS.length - 1) {
      setAllAnswered(true);
      allAnsweredRef.current = true;
      console.log('[handleNext] All questions completed');
      return;
    }
    
    console.log('[handleNext] Moving to next question:', currentQuestionIndexRef.current + 1);
    setCurrentQuestionIndex(prev => {
      const next = prev + 1;
      currentQuestionIndexRef.current = next;
      // Reset phase and timers for next question
      setPhase('preparation');
      setPrepTimeLeft(PREPARATION_TIME);
      setTimeLeft(DEFAULT_ANSWER_TIME);
      console.log('[handleNext] Set up question', next, 'for preparation');
      return next;
    });
  };

  const handleSubmitAssessment = async () => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const recordings = allRecordingsRef.current;
      if (!recordings.length) {
        toast({
          title: "No recordings found",
          description: "Unable to find any recordings to submit. Please try again.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
      
      const candidateInfo = {
        id: testId || 'guest',
        candidateTestId: candidateTestId || '',
        name: email.split('@')[0] || 'Guest User',
        email: email || 'guest@example.com',
      };
      
      // Upload assessment
      if (USE_CONCATENATED_UPLOAD) {
        console.log('Using optimized concatenated upload method');
        await submitAssessmentConcatenated(recordings, candidateInfo, (progress) => {
          setUploadProgress(progress);
        });
      } else {
        await submitAssessment(recordings, candidateInfo, (progress) => {
          setUploadProgress(progress);
        });
      }
      
      // Upload completed successfully
      setUploading(false);
      setUploadProgress(100);
      setSubmitted(true);
      
      // Show completion message immediately
      setTimeout(() => {
        setShowCompletion(true);
      }, 1000); // 1 second delay for upload completion
      
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      console.error('Error submitting assessment:', error);
      
      let errorMessage = "There was a problem submitting your assessment. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Update the useEffect for stream attachment to be more robust
  useEffect(() => {
    if (stream && videoRef.current) {
      const videoElement = videoRef.current;
      
      // Only set srcObject if it's not already set or if it's different
      if (!videoElement.srcObject || videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
      
      // Ensure video is playing
      if (videoElement.paused) {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Error playing video:', err);
            }
          });
        }
      }
    }
  }, [stream, currentQuestionIndex]); // Added currentQuestionIndex as dependency

  // Add cleanup for media recorder
  useEffect(() => {
    return () => {
      if (stream) {
        console.log('Cleaning up: stopping video stream');
        stream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Add debug logging for state
  useEffect(() => {
    console.log('[State] QuestionIndex:', currentQuestionIndex, 'Phase:', phase, 'TimeLeft:', timeLeft, 'HasPermissions:', hasPermissions, 'StreamActive:', stream?.active);
  }, [currentQuestionIndex, phase, timeLeft, hasPermissions, stream]);

  // No complex result handling needed

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Lexi</span>
              <span className="text-2xl font-semibold">Score</span>
            </div>
          </div>
          
          <h1 className="text-xl font-semibold text-center mb-6">English Speaking Test</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <Button type="submit" className="w-full">
              Start Test
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="flex items-center gap-2 mb-4">
            <img src="/placeholder.svg" alt="English Speaking Test" className="w-8 h-8 rounded-full" />
            <h1 className="text-xl font-bold text-blue-700">English Speaking Test</h1>
          </div>
          <div className="mb-4">
            <h2 className="text-lg text-blue-700">Take 5 minutes to find your speaking level.</h2>
          </div>
          <div className="space-y-2 text-left">
            <div>
              <h3 className="font-semibold text-base mb-2">Ready to start the test?</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your audio and video devices should be enabled.</li>
                <li>You cannot pause, exit, or return to finish the test. You need to complete it in one go. If you close the page, you will lose access to the test and will not be able to continue.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-base mb-2">How does the test work?</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>You'll be tested on your speaking skills.</li>
                <li>The assessment includes five (5) questions. The first one is an introduction question.</li>
                <li>
                  For each of the questions, you will have:
                  <ul className="list-disc pl-6 space-y-1">
                    <li>20 seconds to read the question and prepare your answer. The recording will start automatically when time is up.</li>
                    <li>45 seconds to record your answer. Your answer will be automatically submitted after this time.</li>
                  </ul>
                </li>
              </ul>
            </div>
            <Button onClick={startTest} className="w-full md:w-auto mt-4">
              Start the Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermissions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle />
              Permissions Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {permissionError || "This test requires access to your camera and microphone. Please grant permissions and refresh the page."}
            </p>
            <Button onClick={requestPermissions}>
              Request Permissions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoggedIn && showInstructions && hasPermissions) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <img src="/placeholder.svg" alt="English Speaking Test" className="w-10 h-10 rounded-full" />
            <h1 className="text-2xl font-bold text-blue-700">English Speaking Test</h1>
          </div>
          <div className="mb-8">
            <h2 className="text-xl text-blue-700">Take 5 minutes to find your speaking level.</h2>
          </div>
          <div className="mb-8">
            <div className="relative aspect-video mb-4">
              <video
                key="main-video"
                ref={videoRefCallback}
                autoPlay
                playsInline
                muted
                className="w-full h-full rounded-lg bg-black object-cover"
                style={{ transform: 'scaleX(-1)' }} // Mirror the video for selfie view
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <div className={`p-2 rounded-full bg-green-500`}> 
                  <Mic className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-4 text-center">
              Camera and microphone are enabled. You may now start the test.
            </div>
          </div>
          <Button onClick={startTest} className="w-full md:w-auto">
            Start the Assessment
          </Button>
        </div>
      </div>
    );
  }

  if (showCompletion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CardHeader>
            <CardTitle className="text-green-600 text-2xl">Thank You!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Your assessment has been submitted successfully.
            </p>
            <p className="text-gray-600 text-sm">
              Your results will be shared with you very soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use SAMPLE_QUESTIONS everywhere for navigation and rendering
  const currentQuestion = SAMPLE_QUESTIONS[currentQuestionIndex];

  if (phase === 'preparation') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <Card className="w-full min-h-[520px] p-8 flex flex-col justify-center mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Question {currentQuestionIndex + 1} of {SAMPLE_QUESTIONS.length}</span>
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  <span>{prepTimeLeft}s</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-1">
                  <p className="text-lg mb-4">{currentQuestion.text}</p>
                  {currentQuestion.imageUrl && (
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question prompt" 
                      className="max-w-full h-auto rounded-lg mb-4"
                    />
                  )}
                  <div className="mt-4 text-blue-700 font-semibold text-lg text-center">
                    Preparation Time: Read the question and prepare your answer.
                  </div>
                </div>
                <div className="flex-shrink-0 w-full md:w-[420px]">
                  <div className="relative aspect-video mb-4 md:mb-0 min-h-[260px]">
                    <video
                      key="main-video"
                      ref={videoRefCallback}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full rounded-lg bg-black object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-4 text-center">
                Recording will start automatically after the preparation time ends.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // No complex result display needed

  return (
    <>
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <Card className="w-full min-h-[520px] p-8 flex flex-col justify-center mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Question {currentQuestionIndex + 1} of {SAMPLE_QUESTIONS.length}</span>
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  <span>{timeLeft}s</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Responsive layout: question and video side by side on desktop, stacked on mobile */}
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-1">
                  <p className="text-lg mb-4">{currentQuestion.text}</p>
                  {currentQuestion.imageUrl && (
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question prompt" 
                      className="max-w-full h-auto rounded-lg mb-4"
                    />
                  )}
                </div>
                <div className="flex-shrink-0 w-full md:w-[420px]">
                  <div className="relative aspect-video mb-4 md:mb-0 min-h-[260px]">
                    <video
                      key="main-video"
                      ref={videoRefCallback}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full rounded-lg bg-black object-cover"
                      style={{ transform: 'scaleX(-1)' }} // Mirror the video for selfie view
                    />
                    {phase === 'recording' && (
                      <div className="absolute top-4 right-4">
                        <div className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium animate-pulse">
                          Recording
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-4 text-center">
                {phase !== 'recording' && allAnswered ? 'Submitting assessment...' : phase !== 'recording' ? 'Review completed' : ''}
              </div>
              {uploading && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="animate-spin">🔄</span> 
                    <span>Uploading... {uploadProgress}%</span>
                  </div>
                </div>
              )}
            </CardContent>
            {uploading && (
              <div className="w-full mt-2">
                <Progress value={uploadProgress} max={100} />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* No complex processing overlay needed */}
    </>
  );
}
