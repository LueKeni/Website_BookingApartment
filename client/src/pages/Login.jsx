import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.post('/auth/login', { email, password });
      const payload = response?.data?.data;
      if (!payload?.token || !payload?.user) {
        throw new Error('Invalid login response');
      }
      login(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');

      const credential = credentialResponse?.credential;
      if (!credential) {
        setError('Google login failed. Missing credential.');
        return;
      }

      const response = await api.post('/auth/google', { credential });
      const payload = response?.data?.data;
      if (!payload?.token || !payload?.user) {
        throw new Error('Invalid Google login response');
      }

      login(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleError = () => {
    if (!currentOrigin) {
      setError('Google login failed.');
      return;
    }

    setError(
      `Google login is not available for this origin (${currentOrigin}). Add this origin in Google Cloud Console > OAuth 2.0 Client ID > Authorized JavaScript origins.`
    );
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">Login</h1>
      <p className="mt-1 text-sm text-slate-600">Enter your account details to continue.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="Enter email"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="Enter password"
          required
        />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2 font-bold"
        >
          {loading ? 'Signing in...' : 'Login'}
        </Button>
        {googleEnabled && (
          <div className="pt-1">
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
              text="signin_with"
              locale="en"
              shape="pill"
              width="100%"
            />
          </div>
        )}
      </form>
      <p className="mt-4 text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/register" className="font-bold text-slate-900 underline">
          Register
        </Link>
      </p>
    </section>
  );
};

export default Login;
