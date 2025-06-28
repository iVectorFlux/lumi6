import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface WritingResultsTableProps {
  companyId: string;
}

interface WritingTestRow {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  completedAt?: string | null;
  overallScore?: number | null;
  cefrLevel?: string | null;
}

const WritingResultsTable = ({ companyId }: WritingResultsTableProps) => {
  const [rows, setRows] = useState<WritingTestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/writing-tests/company/${companyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const mapped: WritingTestRow[] = res.data.data.writingTests.map((t: any) => ({
        id: t.id,
        candidateName: t.candidateName,
        candidateEmail: t.candidateEmail,
        status: t.status,
        completedAt: t.completedAt,
        overallScore: t.result?.overallScore || null,
        cefrLevel: t.result?.cefrLevel || null,
      }));
      setRows(mapped);
    } catch (err) {
      console.error('Error fetching writing results:', err);
      setError('Failed to load writing results');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const header = ['ID', 'Candidate Name', 'Email', 'Status', 'CEFR Level', 'Overall Score', 'Completed At'];
    const csvRows = rows.map(row => [
      row.id,
      row.candidateName,
      row.candidateEmail,
      row.status,
      row.cefrLevel || '',
      row.overallScore?.toString() || '',
      row.completedAt ? new Date(row.completedAt).toLocaleString() : ''
    ]);
    
    const csvContent = [header, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `writing_assessment_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchResults();
  }, [companyId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Writing Assessment Results</CardTitle>
          <Button onClick={exportToCSV} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Candidate Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>CEFR Level</TableHead>
              <TableHead>Overall Score</TableHead>
              <TableHead>Completed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No data available</TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.candidateName}</TableCell>
                  <TableCell>{row.candidateEmail}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.cefrLevel || ''}</TableCell>
                  <TableCell>{row.overallScore || ''}</TableCell>
                  <TableCell>{row.completedAt ? new Date(row.completedAt).toLocaleString() : ''}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WritingResultsTable; 