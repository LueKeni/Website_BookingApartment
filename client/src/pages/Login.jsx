import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';

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

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError('Vui long nhap day du email va mat khau.');
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
      setError(err?.response?.data?.message || err.message || 'Dang nhap that bai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">Dang nhap</h1>
      <p className="mt-1 text-sm text-slate-600">Nhap thong tin tai khoan de tiep tuc.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="Nhap email"
          required
        />
        <Input
          label="Mat khau"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="Nhap mat khau"
          required
        />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2 font-bold"
        >
          {loading ? 'Dang dang nhap...' : 'Dang nhap'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Ban chua co tai khoan?{' '}
        <Link to="/register" className="font-bold text-slate-900 underline">
          Dang ky
        </Link>
      </p>
    </section>
  );
};

export default Login;
