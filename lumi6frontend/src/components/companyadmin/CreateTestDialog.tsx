import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { designTokens } from '@/design-system/tokens';
import { Mic, Copy, Mail, Loader2, ExternalLink, Clock, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import React from 'react';

interface CreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
  candidate?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const CreateTestDialog = ({ open, onOpenChange, companyId, onSuccess, candidate }: CreateTestDialogProps) => {
  const [form, setForm] = useState({
    firstName: candidate?.firstName || '',
    lastName: candidate?.lastName || '',
    email: candidate?.email || ''
  });
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (candidate) {
      setForm({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email
      });
    }
  }, [candidate]);

  useEffect(() => {
    let ignore = false;
    const fetchExisting = async () => {
      if (candidate) {
        setFetching(true);
        try {
          const API_URL = import.meta.env.VITE_API_URL || '';
          const token = localStorage.getItem('token');
          const res = await axios.get(
            `${API_URL}/api/companies/${companyId}/candidates/credentials?email=${encodeURIComponent(candidate.email)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          if (!ignore && res.data && res.data.credentials) {
            setResult(res.data.credentials);
          }
        } catch (err) {
          // No existing credentials, show form
        } finally {
          setFetching(false);
        }
      }
    };
    fetchExisting();
    return () => { ignore = true; };
  }, [candidate, companyId]);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/companies/${companyId}/tests`,
        { name: `${form.firstName} ${form.lastName}`, email: form.email },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setResult(res.data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    if (candidate) {
      setForm({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email
      });
    } else {
      setForm({ firstName: '', lastName: '', email: '' });
    }
  };

  const handleCopyCredentials = async () => {
    if (!result || result.error) return;
    
    const credentials = `Speaking Assessment - Credentials

Candidate: ${result.candidateName}
Test Link: ${result.testLink}
Login ID: ${result.login}
Password: ${result.password}

Instructions:
1. Click the test link above
2. Enter your login credentials
3. Complete the speaking assessment
4. Submit when finished

The test includes face detection and voice recording.
Results will be available immediately after completion.`;

    try {
      await navigator.clipboard.writeText(credentials);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy credentials:', err);
    }
  };

  const handleSendEmail = () => {
    // TODO: Implement email sending
    alert('Email sending functionality will be implemented');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      // Reset state when closing
      setResult(null);
      setError(null);
      if (!candidate) {
        setForm({ firstName: '', lastName: '', email: '' });
      }
    }
    onOpenChange(newOpen);
  };

  const isFormValid = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className={designTokens.typography.heading3}>
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              Create Speaking Assessment
            </div>
          </DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="py-8 text-center text-gray-500">Checking for existing credentials...</div>
        ) : !result ? (
          <form onSubmit={handleCreateTest} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="firstName"
                    className={cn(designTokens.typography.label, 'text-gray-700')}
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    disabled={loading || !!candidate}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="lastName"
                    className={cn(designTokens.typography.label, 'text-gray-700')}
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    disabled={loading || !!candidate}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="email"
                  className={cn(designTokens.typography.label, 'text-gray-700')}
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  disabled={loading || !!candidate}
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className={cn(designTokens.typography.bodySmall, 'text-blue-800 font-medium mb-3')}>
                About Speaking Assessment
              </div>
              <div className={cn(designTokens.typography.captionSmall, 'text-blue-700 space-y-2')}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Duration: 5-7 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3" />
                  <span>AI-powered speech analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  <span>Real-time face detection required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="h-3 w-3" />
                  <span>Multiple speaking prompts and responses</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Creating...' : 'Create Speaking Test'}
              </Button>
            </DialogFooter>
          </form>
        ) : error ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                Try Again
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className={designTokens.typography.heading4}>
                Speaking Test Created Successfully!
              </h3>
              <p className={designTokens.typography.caption}>
                Test credentials have been generated for {result.candidateName}
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className={cn(designTokens.typography.bodySmall, 'font-medium text-gray-700')}>
                    Candidate:
                  </span>
                  <span className={designTokens.typography.bodySmall}>
                    {result.candidateName}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={cn(designTokens.typography.bodySmall, 'font-medium text-gray-700')}>
                    Login ID:
                  </span>
                  <span className={cn(designTokens.typography.bodySmall, 'font-mono bg-gray-100 px-2 py-1 rounded')}>
                    {result.login}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={cn(designTokens.typography.bodySmall, 'font-medium text-gray-700')}>
                    Password:
                  </span>
                  <span className={cn(designTokens.typography.bodySmall, 'font-mono bg-gray-100 px-2 py-1 rounded')}>
                    {result.password}
                  </span>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-start">
                    <span className={cn(designTokens.typography.bodySmall, 'font-medium text-gray-700')}>
                      Test Link:
                    </span>
                    <a
                      href={result.testLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        designTokens.typography.bodySmall,
                        'text-blue-600 hover:text-blue-800 flex items-center gap-1 max-w-xs break-all'
                      )}
                    >
                      {result.testLink}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className={cn(designTokens.typography.bodySmall, 'text-blue-800 font-medium mb-2')}>
                Instructions for Candidate
              </div>
              <div className={cn(designTokens.typography.captionSmall, 'text-blue-700 space-y-1')}>
                <p>• Click the test link and enter your credentials</p>
                <p>• Allow camera and microphone access when prompted</p>
                <p>• Ensure good lighting and face visibility</p>
                <p>• Complete all speaking prompts clearly</p>
                <p>• Results will be available immediately after completion</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleCopyCredentials}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Credentials
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSendEmail}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              
              <Button onClick={handleReset} className="flex-1">
                Create Another
              </Button>
              
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateTestDialog; 