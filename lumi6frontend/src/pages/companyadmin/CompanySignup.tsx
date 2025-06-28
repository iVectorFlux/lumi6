import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CompanySignup() {
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!companyName || !name || !workEmail || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/companies/signup', {
        companyName,
        name,
        workEmail,
        password,
      });
      // Save token, redirect
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Company Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Company Name</label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Work Email</label>
              <Input type="email" value={workEmail} onChange={e => setWorkEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 