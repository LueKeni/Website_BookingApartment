import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const initialFormState = {
  fullName: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  occupation: '',
  website: '',
  address: '',
  bio: '',
  location: '',
  availableDays: ''
};

const genderOptions = [
  { value: '', label: 'Not specified' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
];

const toDateInputValue = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    const matched = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (matched) {
      return matched[0];
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const buildAssetUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('data:image/')) {
    return value;
  }

  return `${API_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`;
};

const Profile = () => {
  const { isAuthenticated, user, refreshProfile, updateUser } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const isAgent = useMemo(() => user?.role === 'AGENT', [user?.role]);
  const persistedAvatarUrl = useMemo(() => buildAssetUrl(user?.avatar), [user?.avatar]);
  const avatarSource = avatarPreviewUrl || (removeAvatar ? '' : persistedAvatarUrl);
  const avatarFallback = (form.fullName || user?.fullName || 'U').trim().charAt(0).toUpperCase();

  const profileCompletion = useMemo(() => {
    const checks = [
      form.fullName.trim(),
      form.phone.trim(),
      avatarSource,
      form.dateOfBirth,
      form.gender,
      form.occupation.trim(),
      form.address.trim(),
      form.bio.trim()
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [form, avatarSource]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const personalInfo = user.personalInfo || {};

    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      gender: personalInfo.gender || '',
      dateOfBirth: toDateInputValue(personalInfo.dateOfBirth),
      occupation: personalInfo.occupation || '',
      website: personalInfo.website || '',
      address: personalInfo.address || '',
      bio: personalInfo.bio || '',
      location: user.agentInfo?.location || '',
      availableDays: (user.agentInfo?.availableDays || []).join(', ')
    });

    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setRemoveAvatar(false);
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onAvatarFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file for avatar.' });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Avatar image must be 5MB or less.' });
      return;
    }

    setAvatarFile(selectedFile);
    setRemoveAvatar(false);
    setMessage({ type: '', text: '' });
  };

  const onRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setRemoveAvatar(true);
    setMessage({ type: '', text: '' });
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!form.fullName.trim()) {
      setMessage({ type: 'error', text: 'Full name is required.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const payload = new FormData();
      payload.append('fullName', form.fullName.trim());
      payload.append('phone', form.phone.trim());
      payload.append(
        'personalInfo',
        JSON.stringify({
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          occupation: form.occupation.trim(),
          website: form.website.trim(),
          address: form.address.trim(),
          bio: form.bio.trim()
        })
      );

      if (isAgent) {
        payload.append(
          'agentInfo',
          JSON.stringify({
          location: form.location.trim(),
          availableDays: form.availableDays
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
          })
        );
      }

      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }

      if (removeAvatar) {
        payload.append('removeAvatar', 'true');
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
          personalInfo: data.personalInfo,
          favorites: data.favorites || user.favorites || []
        });
      }
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="luxe-panel rounded-[2rem] p-5">
          <div className="flex flex-col items-center text-center">
            {avatarSource ? (
              <img src={avatarSource} alt={form.fullName || 'User avatar'} className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#0f2d3f] to-[#173f56] text-3xl font-black text-white shadow-lg">
                {avatarFallback}
              </div>
            )}

            <h1 className="display-font mt-4 text-4xl leading-tight text-[#0f2d3f]">{form.fullName || 'Your Profile'}</h1>
            <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
            <p className="mt-3 rounded-full border border-[#d6e4dd] bg-[#edf8f4] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#236d56]">
              {user?.role}
            </p>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-[#e5ecef] bg-white/85 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Phone</p>
              <p className="text-sm font-semibold text-slate-700">{form.phone || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Profile Completion</p>
              <p className="text-sm font-semibold text-[#173f56]">{profileCompletion}%</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-[#0f2d3f] to-[#173f56]" style={{ width: `${profileCompletion}%` }} />
              </div>
            </div>
          </div>
        </aside>

        <article className="luxe-panel rounded-[2rem] p-5 md:p-6">
          <h2 className="display-font text-4xl leading-tight text-[#0f2d3f]">Personal Information</h2>
          <p className="mt-1 text-sm text-slate-600">Update your profile details. Changes are saved directly to the database.</p>

          <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Full name</span>
              <input
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                placeholder="Full name"
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phone</span>
              <input
                name="phone"
                value={form.phone}
                onChange={onChange}
                placeholder="Phone"
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Avatar image</span>
              <div className="rounded-xl border border-[#d9cdbb] bg-white p-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarFileChange}
                  className="w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-[#173f56] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">Choose image from your device (max 5MB).</p>
                  {avatarSource && (
                    <button
                      type="button"
                      onClick={onRemoveAvatar}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300"
                    >
                      Remove avatar
                    </button>
                  )}
                </div>
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date of birth</span>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={onChange}
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gender</span>
              <select
                name="gender"
                value={form.gender}
                onChange={onChange}
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
              >
                {genderOptions.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Occupation</span>
              <input
                name="occupation"
                value={form.occupation}
                onChange={onChange}
                placeholder="Occupation"
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Website</span>
              <input
                name="website"
                value={form.website}
                onChange={onChange}
                placeholder="https://your-site.com"
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Address</span>
              <input
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Address"
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Bio</span>
              <textarea
                name="bio"
                value={form.bio}
                onChange={onChange}
                rows={4}
                maxLength={500}
                placeholder="Tell others a little about yourself"
                className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
              />
            </label>

            {isAgent && (
              <>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Agent location</span>
                  <input
                    name="location"
                    value={form.location}
                    onChange={onChange}
                    placeholder="Agent location"
                    className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Available days</span>
                  <input
                    name="availableDays"
                    value={form.availableDays}
                    onChange={onChange}
                    placeholder="Mon, Tue, Wed"
                    className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
                  />
                </label>
              </>
            )}

            {message.text && (
              <p
                className={`rounded-xl px-3 py-2 text-sm font-semibold md:col-span-2 ${
                  message.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-[#0f2d3f] to-[#173f56] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
};

export default Profile;
