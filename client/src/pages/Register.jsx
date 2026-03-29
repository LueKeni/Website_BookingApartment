import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'USER',
    location: '',
    availableDays: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAgent = useMemo(() => form.role === 'AGENT', [form.role]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');

      const payload = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role
      };

      if (isAgent) {
        payload.agentInfo = {
          location: form.location,
          availableDays: form.availableDays
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        };
      }

      const response = await api.post('/auth/register', payload);
      const data = response?.data?.data;
      if (!data?.token || !data?.user) {
        throw new Error('Invalid register response');
      }

      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">Create Account</h1>
      <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          placeholder="Full name"
          required
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
        <input
          name="phone"
          value={form.phone}
          onChange={onChange}
          placeholder="Phone"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="Email"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
        />
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="Password"
          required
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
        <select
          name="role"
          value={form.role}
          onChange={onChange}
          className="rounded-xl border border-slate-300 px-3 py-2"
        >
          <option value="USER">USER</option>
          <option value="AGENT">AGENT</option>
        </select>

        {isAgent && (
          <>
            <input
              name="location"
              value={form.location}
              onChange={onChange}
              placeholder="Agent location"
              className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
            />
            <input
              name="availableDays"
              value={form.availableDays}
              onChange={onChange}
              placeholder="Available days (Mon, Tue, ...)"
              className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
            />
          </>
        )}

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 md:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-60 md:col-span-2"
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-bold text-slate-900 underline">
          Login
        </Link>
      </p>
    </section>
  );
};

export default Register;
