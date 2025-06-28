import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Eye, Settings, Key, Trash2 } from 'lucide-react';
import CompanyCreditManagement from '@/components/superadmin/CompanyCreditManagement';
import axios from 'axios';
// import { CSVLink } from 'react-csv'; // Uncomment if using react-csv

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'trial', label: 'Trial' },
  { value: 'paid', label: 'Paid' },
];

const testTypes = [
  { key: 'SPEAKING', label: 'Speaking Assessment', description: 'CEFR-based language proficiency' },
  { key: 'PROFICIENCY', label: 'Proficiency Test', description: 'Comprehensive reading and comprehension' },
  { key: 'WRITING', label: 'Writing Assessment', description: 'Written communication and grammar' },
  { key: 'EQ', label: 'EQ Assessment', description: 'Emotional intelligence evaluation' },
];

export default function SuperAdminCompanies() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [companies, setCompanies] = useState([]); // Will be loaded from API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creditManagementOpen, setCreditManagementOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [form, setForm] = useState({ 
    name: '', 
    companyAdminEmail: '', 
    status: 'trial',
    testPermissions: [],
    credits: {
      SPEAKING: 1000,
      PROFICIENCY: 500,
      WRITING: 500,
      EQ: 100
    }
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [creationResult, setCreationResult] = useState(null);

  // Fetch companies from API
  const fetchCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/superadmin/companies`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const formatted = response.data.companies.map((c: { 
        id: string; 
        name: string; 
        admins: { email: string }[]; 
        status?: string; 
        totalCredits?: number; 
        availableCredits?: number;
        createdAt: string;
        companyCredits?: Array<{
          testType: string;
          totalCredits: number;
          usedCredits: number;
          availableCredits: number;
        }>;
        testPermissions?: Array<{
          testType: string;
          isEnabled: boolean;
        }>;
      }) => ({
        id: c.id,
        name: c.name,
        companyAdmin: c.admins && c.admins.length > 0 ? c.admins[0].email : '',
        status: c.status, // 'trial' or 'paid'
        totalCredits: c.totalCredits,
        availableCredits: c.availableCredits,
        createdAt: c.createdAt,
        companyCredits: c.companyCredits || [],
        testPermissions: c.testPermissions || [],
        admins: c.admins
      }));
      setCompanies(formatted);
    } catch (err) {
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  // Load companies on mount
  useEffect(() => { fetchCompanies(); }, []);

  const filtered = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.companyAdmin.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'all' || c.status === status;
    return matchesSearch && matchesStatus;
  });

  // CSV/Excel download logic placeholder
  const handleDownload = () => {
    // Implement CSV/Excel download here
    alert('Download not implemented yet');
  };

  const handleTestPermissionChange = (testType, checked) => {
    setForm(f => ({
      ...f,
      testPermissions: checked 
        ? [...f.testPermissions, testType]
        : f.testPermissions.filter(t => t !== testType)
    }));
  };

  const handleCreditChange = (testType, value) => {
    setForm(f => ({
      ...f,
      credits: {
        ...f.credits,
        [testType]: parseInt(value) || 0
      }
    }));
  };

  const handleCreate = async () => {
    setFormLoading(true);
    setFormError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/superadmin/companies`, {
        name: form.name,
        companyAdminEmail: form.companyAdminEmail,
        status: form.status,
        testPermissions: form.testPermissions,
        credits: form.credits
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setCreationResult(res.data);
      // Reset form
      setForm({ 
        name: '', 
        companyAdminEmail: '', 
        status: 'trial',
        testPermissions: [],
        credits: {
          SPEAKING: 1000,
          PROFICIENCY: 500,
          WRITING: 500,
          EQ: 100
        }
      });
      fetchCompanies();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!window.confirm('Are you sure you want to delete this company? This will also delete all company admins.')) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/superadmin/companies/${companyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchCompanies();
    } catch (err) {
      alert('Failed to delete company');
    }
  };

  const handleManageCredits = (company: any) => {
    setSelectedCompany(company);
    setCreditManagementOpen(true);
  };

  const getEnabledTestTypes = (company: any) => {
    return company.testPermissions?.filter((p: any) => p.isEnabled).map((p: any) => p.testType) || [];
  };

  const getTotalAvailableCredits = (company: any) => {
    return company.companyCredits?.reduce((sum: number, credit: any) => sum + credit.availableCredits, 0) || 0;
  };

  return (
    <div className="container mx-auto py-4 px-2">
      <Card className="mb-4 shadow-sm border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Companies</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline">Download CSV</Button>
            <Dialog open={createOpen || !!creationResult} onOpenChange={v => { setCreateOpen(v); if (!v) setCreationResult(null); }}>
              <DialogTrigger asChild>
                <Button variant="default">Create Company</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                </DialogHeader>
                {creationResult ? (
                  <div className="space-y-4 py-2">
                    <div className="text-green-700 font-semibold">Company and company admin created!</div>
                    <div><b>Login URL:</b> <a href={creationResult.companyAdminLoginUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{creationResult.companyAdminLoginUrl}</a></div>
                    <div><b>Company Admin Email:</b> {creationResult.companyAdminEmail}</div>
                    <div><b>Company Admin Password:</b> <span className="font-mono">{creationResult.companyAdminPassword}</span></div>
                    <Button onClick={() => { setCreationResult(null); setCreateOpen(false); }}>Close</Button>
                  </div>
                ) : (
                  <div className="space-y-6 py-2">
                    {/* Basic Company Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Company Information</h4>
                      <Input
                        placeholder="Company Name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      />
                      <Input
                        placeholder="Company Admin Email"
                        value={form.companyAdminEmail}
                        onChange={e => setForm(f => ({ ...f, companyAdminEmail: e.target.value }))}
                      />
                      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Test Permissions */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Test Permissions</h4>
                      <p className="text-sm text-gray-600">Select which test types this company can access</p>
                      <div className="grid grid-cols-2 gap-3">
                        {testTypes.map((testType) => (
                          <div key={testType.key} className="flex items-start space-x-2">
                            <Checkbox
                              id={`test-permission-${testType.key}`}
                              checked={form.testPermissions.includes(testType.key)}
                              onCheckedChange={(checked) => handleTestPermissionChange(testType.key, checked)}
                            />
                            <div className="flex flex-col">
                              <Label htmlFor={`test-permission-${testType.key}`} className="text-sm font-medium">
                                {testType.label}
                              </Label>
                              <span className="text-xs text-gray-500">{testType.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Credit Allocation */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Credit Allocation</h4>
                      <p className="text-sm text-gray-600">Set initial credits for each test type</p>
                      <div className="grid grid-cols-2 gap-3">
                        {testTypes.map((testType) => (
                          <div key={testType.key} className="space-y-1">
                            <Label className="text-sm font-medium">{testType.label}</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={form.credits[testType.key].toString()}
                              onChange={(e) => handleCreditChange(testType.key, e.target.value)}
                              min={0}
                              disabled={!form.testPermissions.includes(testType.key)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {formError && <div className="text-red-500 text-sm">{formError}</div>}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={formLoading}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={formLoading}>
                    {formLoading ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search by company or company admin"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading companies...</div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Company Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Credits</TableHead>
                  <TableHead>Available Credits</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">No companies found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.companyAdmin}</TableCell>
                      <TableCell>{c.status === 'trial' ? 'Trial' : 'Paid'}</TableCell>
                      <TableCell>{c.totalCredits}</TableCell>
                      <TableCell>{c.availableCredits}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">View</Button>{' '}
                        <Button size="sm" variant="outline">{c.status === 'trial' ? 'Activate' : 'Deactivate'}</Button>{' '}
                        <Button size="sm" variant="outline">Assign Credits</Button>{' '}
                        <Button size="sm" variant="outline">Reset Password</Button>{' '}
                        <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 