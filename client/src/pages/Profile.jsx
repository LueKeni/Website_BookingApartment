import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const Profile = () => {
  const { isAuthenticated, user, refreshProfile, updateUser } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', avatar: '', location: '', availableDays: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isAgent = useMemo(() => user?.role === 'AGENT', [user?.role]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      location: user.agentInfo?.location || '',
      availableDays: (user.agentInfo?.availableDays || []).join(', ')
    });
  }, [user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        avatar: form.avatar
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

      const response = await api.put('/users/profile', payload);
      const data = response?.data?.data;
      if (data) {
        updateUser({
          id: data.id || user.id,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          avatar: data.avatar,
          role: data.role,
          status: data.status,
          agentInfo: data.agentInfo,
          favorites: data.favorites || user.favorites || []
        });
      }
      await refreshProfile();
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">Profile</h1>
      <p className="mt-1 text-sm text-slate-600">Role: {user?.role}</p>

      <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          placeholder="Full name"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
        <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" className="rounded-xl border border-slate-300 px-3 py-2" />
        <input
          name="avatar"
          value={form.avatar}
          onChange={onChange}
          placeholder="Avatar URL"
          className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
        />

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

        {message && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 md:col-span-2">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-60 md:col-span-2"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </section>
  );
};

export default Profile;
