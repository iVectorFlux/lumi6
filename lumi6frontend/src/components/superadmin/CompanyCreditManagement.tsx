import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Plus, CreditCard, Users, Calendar, TrendingUp } from 'lucide-react';
import axios from 'axios';

interface Company {
  id: string;
  name: string;
  createdAt: string;
  admins: { email: string }[];
}

interface CreditBalance {
  testType: string;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  expiryDate?: string;
  isActive: boolean;
}

interface Transaction {
  id: string;
  testType: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  createdBy?: string;
}

interface CompanyCreditManagementProps {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const testTypes = [
  { key: 'SPEAKING', label: 'Speaking Assessment', icon: '🎤', color: 'bg-blue-500' },
  { key: 'PROFICIENCY', label: 'Proficiency Test', icon: '📚', color: 'bg-green-500' },
  { key: 'WRITING', label: 'Writing Assessment', icon: '✍️', color: 'bg-yellow-500' },
  { key: 'EQ', label: 'EQ Assessment', icon: '🧠', color: 'bg-purple-500' },
];

const transactionTypeLabels = {
  PURCHASE: 'Purchase',
  CONSUMPTION: 'Consumption',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
  EXPIRY: 'Expiry',
};

export default function CompanyCreditManagement({ 
  company, 
  open, 
  onOpenChange, 
  onSuccess 
}: CompanyCreditManagementProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Credit data
  const [creditBalances, setCreditBalances] = useState<CreditBalance[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Forms
  const [assignForm, setAssignForm] = useState({
    testType: '',
    amount: '',
    expiryDate: '',
    description: ''
  });
  
  const [bulkAssignForm, setBulkAssignForm] = useState({
    SPEAKING: '0',
    PROFICIENCY: '0',
    WRITING: '0',
    EQ: '0',
    expiryDate: '',
    description: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch company credit data
  const fetchCreditData = async () => {
    if (!company.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const [balanceRes, permissionsRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/credits/balance/${company.id}`, {
          headers: getAuthHeaders()
        }),
        axios.get(`${API_URL}/api/credits/permissions/${company.id}`, {
          headers: getAuthHeaders()
        }),
        axios.get(`${API_URL}/api/credits/transactions/${company.id}?limit=50`, {
          headers: getAuthHeaders()
        })
      ]);

      setCreditBalances(balanceRes.data.credits || []);
      setPermissions(permissionsRes.data.permissions || []);
      setTransactions(transactionsRes.data.transactions || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load credit data');
    } finally {
      setLoading(false);
    }
  };

  // Assign credits to specific test type
  const handleAssignCredits = async () => {
    if (!assignForm.testType || !assignForm.amount || parseInt(assignForm.amount) <= 0) {
      setError('Please select a test type and enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_URL}/api/credits/assign`, {
        companyId: company.id,
        testType: assignForm.testType,
        amount: parseInt(assignForm.amount),
        expiryDate: assignForm.expiryDate || undefined,
        description: assignForm.description || `Assigned ${assignForm.amount} ${assignForm.testType} credits`
      }, {
        headers: getAuthHeaders()
      });

      setSuccess(`Successfully assigned ${assignForm.amount} ${assignForm.testType} credits`);
      setAssignForm({ testType: '', amount: '', expiryDate: '', description: '' });
      await fetchCreditData();
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign credits');
    } finally {
      setLoading(false);
    }
  };

  // Bulk assign credits to multiple test types
  const handleBulkAssignCredits = async () => {
    const assignments = testTypes.filter(type => 
      parseInt(bulkAssignForm[type.key as keyof typeof bulkAssignForm]) > 0
    );

    if (assignments.length === 0) {
      setError('Please enter at least one credit amount greater than 0');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Make parallel requests for each test type
      const promises = assignments.map(type => 
        axios.post(`${API_URL}/api/credits/assign`, {
          companyId: company.id,
          testType: type.key,
          amount: parseInt(bulkAssignForm[type.key as keyof typeof bulkAssignForm]),
          expiryDate: bulkAssignForm.expiryDate || undefined,
          description: bulkAssignForm.description || `Bulk assigned ${bulkAssignForm[type.key as keyof typeof bulkAssignForm]} ${type.key} credits`
        }, {
          headers: getAuthHeaders()
        })
      );

      await Promise.all(promises);
      
      const totalAssigned = assignments.reduce((sum, type) => 
        sum + parseInt(bulkAssignForm[type.key as keyof typeof bulkAssignForm]), 0
      );
      
      setSuccess(`Successfully assigned ${totalAssigned} credits across ${assignments.length} test types`);
      setBulkAssignForm({
        SPEAKING: '0',
        PROFICIENCY: '0',
        WRITING: '0',
        EQ: '0',
        expiryDate: '',
        description: ''
      });
      await fetchCreditData();
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign credits');
    } finally {
      setLoading(false);
    }
  };

  // Update test permissions
  const handleUpdatePermissions = async (testType: string, enabled: boolean) => {
    const newPermissions = enabled 
      ? [...permissions, testType]
      : permissions.filter(p => p !== testType);

    setLoading(true);
    setError('');

    try {
      await axios.put(`${API_URL}/api/credits/permissions/${company.id}`, {
        permissions: newPermissions
      }, {
        headers: getAuthHeaders()
      });

      setPermissions(newPermissions);
      setSuccess(`${enabled ? 'Enabled' : 'Disabled'} ${testType} test permission`);
      await fetchCreditData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  // Load data when dialog opens
  useEffect(() => {
    if (open && company.id) {
      fetchCreditData();
    }
  }, [open, company.id]);

  const getCreditBalance = (testType: string) => {
    return creditBalances.find(b => b.testType === testType);
  };

  const getTotalCredits = () => {
    return creditBalances.reduce((sum, balance) => sum + balance.totalCredits, 0);
  };

  const getAvailableCredits = () => {
    return creditBalances.reduce((sum, balance) => sum + balance.availableCredits, 0);
  };

  const getUsedCredits = () => {
    return creditBalances.reduce((sum, balance) => sum + balance.usedCredits, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Management - {company.name}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="assign" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Assign Credits
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalCredits()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{getAvailableCredits()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Used Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{getUsedCredits()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Credit Breakdown by Test Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {testTypes.map(type => {
                    const balance = getCreditBalance(type.key);
                    const hasPermission = permissions.includes(type.key);
                    
                    return (
                      <div key={type.key} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${type.color} flex items-center justify-center text-white text-sm`}>
                            {type.icon}
                          </div>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-gray-500">
                              {hasPermission ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {balance ? (
                            <>
                              <div className="font-bold text-green-600">{balance.availableCredits}</div>
                              <div className="text-xs text-gray-500">
                                {balance.usedCredits}/{balance.totalCredits} used
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-400">No credits</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assign" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Credits to Single Test Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testType">Test Type</Label>
                    <Select value={assignForm.testType} onValueChange={(value) => 
                      setAssignForm(prev => ({ ...prev, testType: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        {testTypes.map(type => (
                          <SelectItem key={type.key} value={type.key}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      placeholder="Enter credit amount"
                      value={assignForm.amount}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={assignForm.expiryDate}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter description for this credit assignment"
                      value={assignForm.description}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <Button onClick={handleAssignCredits} disabled={loading} className="w-full">
                    {loading ? 'Assigning...' : 'Assign Credits'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Assign Credits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {testTypes.map(type => (
                      <div key={type.key} className="space-y-1">
                        <Label className="text-sm">{type.label}</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={bulkAssignForm[type.key as keyof typeof bulkAssignForm]}
                          onChange={(e) => setBulkAssignForm(prev => ({ 
                            ...prev, 
                            [type.key]: e.target.value 
                          }))}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkExpiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="bulkExpiryDate"
                      type="date"
                      value={bulkAssignForm.expiryDate}
                      onChange={(e) => setBulkAssignForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkDescription">Description (Optional)</Label>
                    <Textarea
                      id="bulkDescription"
                      placeholder="Enter description for bulk credit assignment"
                      value={bulkAssignForm.description}
                      onChange={(e) => setBulkAssignForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <Button onClick={handleBulkAssignCredits} disabled={loading} className="w-full">
                    {loading ? 'Assigning...' : 'Bulk Assign Credits'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Type Permissions</CardTitle>
                <p className="text-sm text-gray-600">
                  Control which test types this company can access and create tests for.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testTypes.map(type => {
                    const hasPermission = permissions.includes(type.key);
                    const balance = getCreditBalance(type.key);
                    
                    return (
                      <div key={type.key} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full ${type.color} flex items-center justify-center text-white`}>
                            {type.icon}
                          </div>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-gray-500">
                              {balance ? `${balance.availableCredits} credits available` : 'No credits assigned'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={hasPermission ? 'default' : 'secondary'}>
                            {hasPermission ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Checkbox
                            checked={hasPermission}
                            onCheckedChange={(checked) => handleUpdatePermissions(type.key, !!checked)}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Test Type</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map(transaction => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.testType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={transaction.transactionType === 'CONSUMPTION' ? 'destructive' : 'default'}
                              >
                                {transactionTypeLabels[transaction.transactionType as keyof typeof transactionTypeLabels]}
                              </Badge>
                            </TableCell>
                            <TableCell className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                            </TableCell>
                            <TableCell>
                              {transaction.balanceBefore} → {transaction.balanceAfter}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 