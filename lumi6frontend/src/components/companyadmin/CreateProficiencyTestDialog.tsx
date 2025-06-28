import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { designTokens } from '@/design-system/tokens';
import { BookOpen, Copy, Mail, Loader2, ExternalLink, Clock, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface CreateProficiencyTestDialogProps {
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

interface ProficiencyTestForm {
  firstName: string;
  lastName: string;
  email: string;
}

interface ProficiencyTestResult {
  candidateName: string;
  testLink: string;
  login: string;
  password: string;
  testId: string;
  error?: string;
}



const CreateProficiencyTestDialog = ({
  open,
  onOpenChange,
  companyId,
  onSuccess,
  candidate
}: CreateProficiencyTestDialogProps) => {
  const [form, setForm] = useState<ProficiencyTestForm>({
    firstName: candidate?.firstName || '',
    lastName: candidate?.lastName || '',
    email: candidate?.email || ''
  });
  
  const [result, setResult] = useState<ProficiencyTestResult | null>(null);
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
        `${API_URL}/api/companies/${companyId}/proficiency-tests`,
        {
          candidateName: `${form.firstName} ${form.lastName}`,
          candidateEmail: form.email
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setResult(response.data);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create proficiency test');
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
    
    const credentials = `CEFR Proficiency Test - Credentials

Candidate: ${result.candidateName}
Test Link: ${result.testLink}
Login ID: ${result.login}
Password: ${result.password}
Test ID: ${result.testId}

Instructions:
1. Click the test link above
2. Enter your login credentials
3. Complete all 40 questions
4. Submit when finished

The test takes approximately 45-60 minutes to complete.
Results will show your CEFR level (A1-C2) with detailed scoring.`;

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
              <BookOpen className="h-5 w-5 text-green-600" />
              Create Proficiency Test
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

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className={cn(designTokens.typography.bodySmall, 'text-green-800 font-medium mb-3')}>
                About CEFR Proficiency Test
              </div>
              <div className={cn(designTokens.typography.captionSmall, 'text-green-700 space-y-2')}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Duration: 25 - 30 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3" />
                  <span>40 comprehensive questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  <span>CEFR-based scoring (A1-C2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3" />
                  <span>Reading, grammar, and vocabulary assessment</span>
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
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Creating...' : 'Create Proficiency Test'}
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
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
              <h3 className={designTokens.typography.heading4}>
                Proficiency Test Created Successfully!
              </h3>
              <p className={designTokens.typography.caption}>
                CEFR test credentials have been generated for {result.candidateName}
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

                <div className="flex justify-between items-center">
                  <span className={cn(designTokens.typography.bodySmall, 'font-medium text-gray-700')}>
                    Test ID:
                  </span>
                  <span className={cn(designTokens.typography.bodySmall, 'font-mono bg-gray-100 px-2 py-1 rounded')}>
                    {result.testId}
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
                        'text-green-600 hover:text-green-800 flex items-center gap-1 max-w-xs break-all'
                      )}
                    >
                      {result.testLink}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className={cn(designTokens.typography.bodySmall, 'text-green-800 font-medium mb-2')}>
                Instructions for Candidate
              </div>
              <div className={cn(designTokens.typography.captionSmall, 'text-green-700 space-y-1')}>
                <p>• Click the test link and enter your credentials</p>
                <p>• Answer all 40 questions to the best of your ability</p>
                <p>• Take your time - no rush, but aim for 45-60 minutes</p>
                <p>• Results will show your CEFR level immediately</p>
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

export default CreateProficiencyTestDialog; 