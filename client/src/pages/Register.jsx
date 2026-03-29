import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!fullName || !email || !password) {
      setError('Full name, email, and password are required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        fullName,
        email,
        password,
        phone,
        role: 'USER'
      };

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
        <Input
          label="Full name"
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          placeholder="Full name"
          required
        />
        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={onChange}
          placeholder="Phone"
        />
        <div className="md:col-span-2">
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder="Email"
            required
          />
        </div>
        <Input
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="Password"
          required
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={onChange}
          placeholder="Confirm password"
          required
        />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 md:col-span-2">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="rounded-xl py-2 font-bold md:col-span-2"
        >
          {loading ? 'Creating account...' : 'Register'}
        </Button>
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
