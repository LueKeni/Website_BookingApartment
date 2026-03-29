import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/auth/login', form);
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

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">Login</h1>
      <p className="mt-1 text-sm text-slate-600">Single entry point for USER, AGENT, and ADMIN.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="Email"
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="Password"
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
        />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
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
