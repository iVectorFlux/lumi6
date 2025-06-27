import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

interface EditCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  companyId?: string; // Optional for superadmin
  userRole: 'companyadmin' | 'superadmin';
  onSuccess: () => void;
}

interface CandidateFormData {
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  companyId?: string;
}

interface Company {
  id: string;
  name: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'inactive', label: 'Inactive' }
];

export default function EditCandidateDialog({ 
  open, 
  onOpenChange, 
  candidateId, 
  companyId, 
  userRole, 
  onSuccess 
}: EditCandidateDialogProps) {
  const [formData, setFormData] = useState<CandidateFormData>({
    firstName: '',
    lastName: '',
    email: '',
    status: 'pending',
    companyId: ''
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingCandidate, setFetchingCandidate] = useState(false);

  useEffect(() => {
    if (open && candidateId) {
      fetchCandidate();
      if (userRole === 'superadmin') {
        fetchCompanies();
      }
    }
  }, [open, candidateId, userRole]);

  const fetchCandidate = async () => {
    setFetchingCandidate(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const endpoint = userRole === 'superadmin' 
        ? `${API_URL}/api/superadmin/candidates/${candidateId}`
        : `${API_URL}/api/companies/${companyId}/candidates/${candidateId}`;
      
      const response = await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const candidate = response.data;
      const nameParts = candidate.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData({
        firstName,
        lastName,
        email: candidate.email,
        status: candidate.status,
        companyId: candidate.companyId || companyId
      });
    } catch (err: any) {
      setError('Failed to load candidate details');
      console.error('Error fetching candidate:', err);
    } finally {
      setFetchingCandidate(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/api/superadmin/companies`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setCompanies(response.data.companies);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const endpoint = userRole === 'superadmin' 
        ? `${API_URL}/api/superadmin/candidates/${candidateId}`
        : `${API_URL}/api/companies/${companyId}/candidates/${candidateId}`;

      await axios.put(endpoint, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CandidateFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
        </DialogHeader>

        {fetchingCandidate ? (
          <div className="py-8 text-center text-gray-500">Loading candidate details...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="First Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Last Name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {userRole === 'superadmin' && (
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <Select 
                  value={formData.companyId} 
                  onValueChange={(value) => handleInputChange('companyId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Candidate'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 