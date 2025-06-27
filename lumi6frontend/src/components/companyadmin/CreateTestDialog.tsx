import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  const [firstName, setFirstName] = useState(candidate?.firstName || '');
  const [lastName, setLastName] = useState(candidate?.lastName || '');
  const [email, setEmail] = useState(candidate?.email || '');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const copyRef = useRef<HTMLTextAreaElement>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (candidate) {
      setFirstName(candidate.firstName);
      setLastName(candidate.lastName);
      setEmail(candidate.email);
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

  const handleCreateTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/companies/${companyId}/tests`,
        { name: `${firstName} ${lastName}`, email },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setResult(res.data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setResult({ error: err?.response?.data?.error || 'Failed to create test' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    if (candidate) {
      setFirstName(candidate.firstName);
      setLastName(candidate.lastName);
      setEmail(candidate.email);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
    }
  };

  // Add formatted info for copying
  const formattedInfo = result && !result.error ? `Name: ${result.candidateName || ''}\nTest Link: ${result.testLink || ''}\nLogin id: ${result.login || ''}\nPassword: ${result.password || ''}` : '';

  const handleCopyAll = () => {
    if (copyRef.current) {
      copyRef.current.select();
      document.execCommand('copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          {(!result || result.error) && !fetching && (
            <>
              <DialogTitle>Create speaking assessment</DialogTitle>
              <DialogDescription>
                Enter candidate details to create a test and generate credentials.
              </DialogDescription>
            </>
          )}
        </DialogHeader>
        {fetching ? (
          <div className="py-8 text-center text-gray-500">Checking for existing credentials...</div>
        ) : !result ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter first name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                disabled={loading || !!candidate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                disabled={loading || !!candidate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading || !!candidate}
                required
              />
            </div>
            <DialogFooter className="flex space-x-2 sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleCreateTest} disabled={loading || !firstName || !lastName || !email}>
                {loading ? 'Creating...' : 'Create Test'}
              </Button>
            </DialogFooter>
          </div>
        ) : result.error ? (
          <div className="text-red-600 py-4">{result.error}</div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="mb-2 font-medium">Generated Test Link & Credentials:</div>
            <div className="p-2 bg-gray-50 rounded">
              <div><span className="font-semibold">Name:</span> {result.candidateName}</div>
              <div><span className="font-semibold">Email/Login:</span> {result.login}</div>
              <div><span className="font-semibold">Test Link:</span> <a href={result.testLink} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{result.testLink}</a></div>
              <div><span className="font-semibold">Password:</span> {result.password}</div>
              <Button className="mt-2" onClick={() => navigator.clipboard.writeText(formattedInfo)}>Copy</Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => alert('Email sent (mock)!')}>Send Email</Button>
              <Button onClick={handleReset}>Create Another</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateTestDialog; 