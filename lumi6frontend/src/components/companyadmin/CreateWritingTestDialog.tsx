import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { designTokens } from '@/design-system/tokens';
import { PenTool, Copy, Mail, Loader2, ExternalLink, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import TestCredentialsCard from './TestCredentialsCard';

interface CreateWritingTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCreated?: () => void;
  candidate?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface WritingTestForm {
  firstName: string;
  lastName: string;
  email: string;
}

interface WritingTestResult {
  candidateName: string;
  testLink: string;
  login: string;
  password: string;
  testId: string;
  error?: string;
}

const CreateWritingTestDialog = ({
  open,
  onOpenChange,
  onTestCreated,
  candidate
}: CreateWritingTestDialogProps) => {
  const [form, setForm] = useState<WritingTestForm>({
    firstName: candidate?.firstName || '',
    lastName: candidate?.lastName || '',
    email: candidate?.email || ''
  });
  
  const [result, setResult] = useState<WritingTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when candidate prop changes
  useEffect(() => {
    if (candidate) {
      setForm({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email
      });
    }
  }, [candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/api/writing-tests/create`,
        {
          candidateName: `${form.firstName} ${form.lastName}`,
          candidateEmail: form.email
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setResult(response.data);
      onTestCreated?.();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create writing test');
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
    
    const credentials = `Writing Assessment - Test Credentials

Candidate: ${result.candidateName}
Test Link: ${result.testLink}
Login ID: ${result.login}
Password: ${result.password}
Test ID: ${result.testId}

Instructions:
1. Click the test link above
2. Enter your login credentials
3. Complete the writing prompts
4. Submit when finished

The test takes approximately 30-45 minutes to complete.`;

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
              <PenTool className="h-5 w-5 text-orange-600" />
              Create Writing Assessment
            </div>
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className={cn(designTokens.typography.bodySmall, 'text-orange-800 font-medium mb-2')}>
                About Writing Assessment
              </div>
              <div className={cn(designTokens.typography.captionSmall, 'text-orange-700 space-y-1')}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Duration: 20-30 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  <span>Multiple writing prompts and tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <PenTool className="h-3 w-3" />
                  <span>Grammar, vocabulary, and structure evaluation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 bg-orange-500 rounded-full flex-shrink-0"></span>
                  <span>AI-powered scoring with detailed feedback</span>
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
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Creating...' : 'Create Writing Test'}
              </Button>
            </DialogFooter>
          </form>
        ) : result.error ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{result.error}</AlertDescription>
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
          <TestCredentialsCard
            accentColor="orange-600"
            icon={<PenTool className="h-8 w-8 text-orange-600" />}
            heading="Writing Test Created Successfully!"
            candidateName={result.candidateName}
            login={result.login}
            password={result.password}
            testId={result.testId}
            testLink={result.testLink}
            instructions={[]}
            onCopy={handleCopyCredentials}
            onSend={handleSendEmail}
            onCreateAnother={handleReset}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateWritingTestDialog; 