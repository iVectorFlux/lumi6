import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import authConfig from '@/utils/authConfig';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing token on login page load
    authConfig.removeToken();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log(`Attempting login with API URL: ${authConfig.apiUrl}`);
      const res = await axios.post(`${authConfig.apiUrl}/api/superadmin/login`, { email, password });
      
      if (!res.data.token) {
        throw new Error('No token received from server');
      }
      
      console.log('Login successful, token received');
      authConfig.setToken(res.data.token);
      
      // Verify the token has the correct role
      if (!authConfig.hasRole('superadmin')) {
        throw new Error('Invalid user role for super admin login');
      }
      
      navigate('/superadmin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response) {
        // Server responded with error
        setError(err.response.data?.error || `Server error: ${err.response.status}`);
      } else if (err.request) {
        // Request made but no response received
        setError(`Network error: Could not connect to server at ${authConfig.apiUrl}`);
      } else {
        // Error setting up the request
        setError(`Error: ${err.message}`);
      }
      // Clean up any token if there was an error
      authConfig.removeToken();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Super Admin Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
} 