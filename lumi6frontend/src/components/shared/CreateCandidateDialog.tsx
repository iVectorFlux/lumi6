import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { designTokens } from '@/design-system/tokens';
import { Loader2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (candidate: { firstName: string; lastName: string; email: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

interface CandidateForm {
  firstName: string;
  lastName: string;
  email: string;
}

const CreateCandidateDialog = ({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  error = null
}: CreateCandidateDialogProps) => {
  const [form, setForm] = useState<CandidateForm>({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [validationErrors, setValidationErrors] = useState<Partial<CandidateForm>>({});

  const validateForm = (): boolean => {
    const errors: Partial<CandidateForm> = {};
    
    if (!form.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!form.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await onSubmit(form);
      // Reset form on success
      setForm({ firstName: '', lastName: '', email: '' });
      setValidationErrors({});
      onOpenChange(false);
    } catch (error) {
      // Error will be handled by parent component
      console.error('Failed to create candidate:', error);
    }
  };

  const handleInputChange = (field: keyof CandidateForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      // Reset form when closing
      setForm({ firstName: '', lastName: '', email: '' });
      setValidationErrors({});
    }
    onOpenChange(newOpen);
  };

  const isFormValid = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={designTokens.typography.heading3}>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New Candidate
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label 
                htmlFor="firstName" 
                className={cn(designTokens.typography.label, 'text-gray-700')}
              >
                First Name *
              </Label>
              <Input
                id="firstName"
                type="text"
                value={form.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                disabled={loading}
                className={cn(
                  validationErrors.firstName && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                )}
                autoComplete="given-name"
              />
              {validationErrors.firstName && (
                <p className={cn(designTokens.typography.captionSmall, 'text-red-600')}>
                  {validationErrors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="lastName"
                className={cn(designTokens.typography.label, 'text-gray-700')}
              >
                Last Name *
              </Label>
              <Input
                id="lastName"
                type="text"
                value={form.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                disabled={loading}
                className={cn(
                  validationErrors.lastName && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                )}
                autoComplete="family-name"
              />
              {validationErrors.lastName && (
                <p className={cn(designTokens.typography.captionSmall, 'text-red-600')}>
                  {validationErrors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor="email"
              className={cn(designTokens.typography.label, 'text-gray-700')}
            >
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              disabled={loading}
              className={cn(
                validationErrors.email && 'border-red-500 focus:border-red-500 focus:ring-red-500'
              )}
              autoComplete="email"
            />
            {validationErrors.email && (
              <p className={cn(designTokens.typography.captionSmall, 'text-red-600')}>
                {validationErrors.email}
              </p>
            )}
          </div>

          <div className={cn(designTokens.typography.captionSmall, 'text-gray-600')}>
            * Required fields
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="flex-1 sm:flex-none"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Candidate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCandidateDialog; 