import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const BANKS = [
  { id: 1, name: 'English Speaking Test Questions', type: 'english_speaking' },
  { id: 2, name: 'Global Language Test Questions', type: 'global_language' },
  { id: 3, name: 'Emotional Intelligence Test Questions', type: 'emotional_intel' },
  { id: 4, name: 'Proficiency Test Questions', type: 'proficiency' },
];

export default function SuperAdminQuestionBank() {
  const [selectedBank, setSelectedBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedBank) {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      if (selectedBank.type === 'proficiency') {
        axios.get(`${API_URL}/api/superadmin/proficiency-questions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then(res => {
            setQuestions(res.data.questions);
            setLoading(false);
          })
          .catch(err => {
            setLoading(false);
            alert('Failed to load proficiency questions: ' + (err?.response?.data?.error || err.message));
          });
      } else {
        axios.get(`${API_URL}/api/superadmin/questionbanks/${selectedBank.id}/questions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then(res => {
            setQuestions(res.data.questions);
            setLoading(false);
          })
          .catch(err => {
            setLoading(false);
            alert('Failed to load questions: ' + (err?.response?.data?.error || err.message));
          });
      }
    }
  }, [selectedBank]);

  if (selectedBank) {
    // Only show the table for Proficiency Test Questions
    if (selectedBank.type === 'proficiency') {
      return (
        <div>
          <button className="mb-4 text-blue-600 underline" onClick={() => setSelectedBank(null)}>&larr; Back to Question Banks</button>
          <h2 className="text-2xl font-bold mb-4">{selectedBank.name}</h2>
          {loading ? <div>Loading questions...</div> : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Text</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Audio</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Language</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell>{q.id}</TableCell>
                      <TableCell>{q.text}</TableCell>
                      <TableCell>{q.type}</TableCell>
                      <TableCell>{q.category}</TableCell>
                      <TableCell>{q.difficulty}</TableCell>
                      <TableCell>{q.mediaUrl ? <a href={q.mediaUrl} target="_blank" rel="noopener noreferrer">View</a> : '-'}</TableCell>
                      <TableCell>{q.mediaAudio ? <a href={q.mediaAudio} target="_blank" rel="noopener noreferrer">Audio</a> : '-'}</TableCell>
                      <TableCell>{q.mediaImage ? <a href={q.mediaImage} target="_blank" rel="noopener noreferrer">Image</a> : '-'}</TableCell>
                      <TableCell>{q.options ? Array.isArray(q.options) ? q.options.join(', ') : JSON.stringify(q.options) : '-'}</TableCell>
                      <TableCell>{q.correctAnswer}</TableCell>
                      <TableCell>{q.score}</TableCell>
                      <TableCell>{q.language}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    }
    // Default for other banks
    return (
      <div>
        <button className="mb-4 text-blue-600 underline" onClick={() => setSelectedBank(null)}>&larr; Back to Question Banks</button>
        <h2 className="text-2xl font-bold mb-4">{selectedBank.name}</h2>
        {loading ? <div>Loading questions...</div> : (
          <div>
            <p>Questions will appear here. (Coming soon)</p>
            <ul className="list-disc pl-6">
              {questions.map((q: any) => (
                <li key={q.id}>{q.text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {BANKS.map(bank => (
        <Card key={bank.id} className="cursor-pointer hover:shadow-lg transition" onClick={() => setSelectedBank(bank)}>
          <CardHeader>
            <CardTitle>{bank.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage questions for the {bank.name.toLowerCase()} here.</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 