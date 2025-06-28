import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function SuperAdminAssessments() {
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('all');
  const [status, setStatus] = useState('all');
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch assessments from API
  const fetchAssessments = async () => {
    setLoading(true);
    setError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/superadmin/assessments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setAssessments(response.data.assessments);
    } catch (err) {
      setError('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssessments(); }, []);

  // Dynamically generate company options from data
  const companySet = new Set(assessments.map(a => a.company).filter(Boolean));
  const dynamicCompanyOptions = [
    { value: 'all', label: 'All Companies' },
    ...Array.from(companySet).map(name => ({ value: name, label: name })),
  ];

  const filtered = assessments.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.candidate.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = company === 'all' || a.company === company;
    const matchesStatus = status === 'all' || a.status === status;
    return matchesSearch && matchesCompany && matchesStatus;
  });

  const handleDownload = () => {
    alert('Download not implemented yet');
  };

  return (
    <div className="container mx-auto py-4 px-2">
      <Card className="mb-4 shadow-sm border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assessments</CardTitle>
          <Button onClick={handleDownload} variant="outline">Download CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search by assessment or candidate"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                {dynamicCompanyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="py-8 text-center text-gray-500">Loading assessments...</div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">No assessments found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.type === 'Speaking' ? 'bg-blue-100 text-blue-800' :
                          a.type === 'Proficiency' ? 'bg-green-100 text-green-800' :
                          a.type === 'EQ' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {a.type}
                        </span>
                      </TableCell>
                      <TableCell>{a.company}</TableCell>
                      <TableCell>{a.candidate}</TableCell>
                      <TableCell>{a.status.replace('_', ' ')}</TableCell>
                      <TableCell>{a.date ? new Date(a.date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{a.score !== null ? a.score : '-'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">View</Button>
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