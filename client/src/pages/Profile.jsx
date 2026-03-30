import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const MAX_SOURCE_FILE_SIZE = 8 * 1024 * 1024;
const MAX_AVATAR_DATA_URL_BYTES = 350 * 1024;
const MAX_AVATAR_DIMENSION = 512;
const MIN_AVATAR_DIMENSION = 220;

const splitCommaValues = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getInitial = (name) => {
  if (typeof name !== 'string' || !name.trim()) {
    return 'U';
  }

  return name.trim().charAt(0).toUpperCase();
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

const getDataUrlBytes = (dataUrl) => {
  if (typeof dataUrl !== 'string') {
    return 0;
  }

  const encoded = dataUrl.split(',')[1] || '';
  const padding = (encoded.match(/=+$/) || [''])[0].length;
  return Math.max(0, (encoded.length * 3) / 4 - padding);
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Cannot decode image'));
    image.src = src;
  });

const drawToCanvas = (canvas, image, width, height) => {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported');
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
};

const compressAvatarFile = async (file) => {
  const sourceDataUrl = await readFileAsDataUrl(file);
  if (!sourceDataUrl) {
    throw new Error('Invalid file content');
  }

  const image = await loadImage(sourceDataUrl);
  const baseScale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * baseScale));
  let height = Math.max(1, Math.round(image.height * baseScale));
  const canvas = document.createElement('canvas');

  const encodeWithQuality = (quality) => canvas.toDataURL('image/jpeg', quality);

  drawToCanvas(canvas, image, width, height);

  let bestDataUrl = '';
  let quality = 0.84;

  while (quality >= 0.45) {
    const nextDataUrl = encodeWithQuality(quality);
    bestDataUrl = nextDataUrl;
    if (getDataUrlBytes(nextDataUrl) <= MAX_AVATAR_DATA_URL_BYTES) {
      return nextDataUrl;
    }
    quality -= 0.08;
  }

  while (Math.max(width, height) > MIN_AVATAR_DIMENSION) {
    width = Math.max(MIN_AVATAR_DIMENSION, Math.round(width * 0.85));
    height = Math.max(MIN_AVATAR_DIMENSION, Math.round(height * 0.85));

    drawToCanvas(canvas, image, width, height);
    quality = 0.78;

    while (quality >= 0.4) {
      const nextDataUrl = encodeWithQuality(quality);
      bestDataUrl = nextDataUrl;
      if (getDataUrlBytes(nextDataUrl) <= MAX_AVATAR_DATA_URL_BYTES) {
        return nextDataUrl;
      }
      quality -= 0.08;
    }
  }

  if (bestDataUrl && getDataUrlBytes(bestDataUrl) <= MAX_AVATAR_DATA_URL_BYTES) {
    return bestDataUrl;
  }

  throw new Error('Avatar is still too large after compression');
};

const Profile = () => {
  const { isAuthenticated, user, refreshProfile, updateUser } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    avatar: '',
    location: '',
    availableDays: '',
    specialties: '',
    bio: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

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
      availableDays: (user.agentInfo?.availableDays || []).join(', '),
      specialties: (user.agentInfo?.specialties || []).join(', '),
      bio: user.agentInfo?.bio || ''
    });
  }, [user]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [form.avatar]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file for avatar.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_SOURCE_FILE_SIZE) {
      setMessage('Please choose an image under 8 MB.');
      event.target.value = '';
      return;
    }

    try {
      setMessage('Optimizing avatar image...');
      const dataUrl = await compressAvatarFile(file);
      if (!dataUrl) {
        throw new Error('Invalid file content');
      }

      setForm((prev) => ({ ...prev, avatar: dataUrl }));
      setMessage('Avatar selected from your device. Click Save Profile to apply.');
      setAvatarLoadError(false);
    } catch (error) {
      setMessage('Cannot use this image. Please choose another one with lower resolution.');
    } finally {
      event.target.value = '';
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      const nextAvatar = form.avatar.trim();
      const currentAvatar = (user?.avatar || '').trim();
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim()
      };

      if (nextAvatar !== currentAvatar) {
        if (nextAvatar.startsWith('data:') && getDataUrlBytes(nextAvatar) > MAX_AVATAR_DATA_URL_BYTES) {
          setMessage('Avatar is too large. Please choose another image.');
          setLoading(false);
          return;
        }
        payload.avatar = nextAvatar;
      }

      if (isAgent) {
        payload.agentInfo = {
          location: form.location.trim(),
          availableDays: splitCommaValues(form.availableDays),
          specialties: splitCommaValues(form.specialties),
          bio: form.bio.trim()
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
      setMessage('Profile updated successfully.');
    } catch (err) {
      if (err?.response?.status === 413) {
        setMessage('Avatar payload is too large. Please choose a smaller image.');
      } else {
        setMessage(err?.response?.data?.message || 'Update failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const avatarSource = form.avatar.trim();
  const profileInitial = getInitial(form.fullName || user?.fullName);
  const responseRate = Number(user?.agentInfo?.responseRate || 0);
  const successDeals = Number(user?.agentInfo?.successDeals || 0);

  return (
    <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">Profile</h1>
          <p className="mt-1 text-sm text-slate-600">Role: {user?.role}</p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-lg font-black text-slate-700">
            {avatarSource && !avatarLoadError ? (
              <img
                src={avatarSource}
                alt={form.fullName || 'Profile avatar'}
                className="h-full w-full object-cover"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              profileInitial
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{form.fullName || 'Unnamed account'}</p>
            <p className="text-xs text-slate-600">{user?.email || '-'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Full name</span>
          <input
            name="fullName"
            value={form.fullName}
            onChange={onChange}
            placeholder="Full name"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</span>
          <input
            value={user?.email || ''}
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Upload Avatar</span>
          <input
            type="file"
            accept="image/*"
            onChange={onAvatarFileChange}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
          <p className="text-xs text-slate-500">Choose image from your computer. The app will automatically optimize before upload.</p>
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Avatar URL (optional)</span>
          <input
            name="avatar"
            value={form.avatar}
            onChange={onChange}
            placeholder="https://..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>

        {isAgent && (
          <>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Service Area</span>
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                placeholder="Districts or city you operate in"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Available Days</span>
              <input
                name="availableDays"
                value={form.availableDays}
                onChange={onChange}
                placeholder="Mon, Tue, Wed"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Specialties</span>
              <input
                name="specialties"
                value={form.specialties}
                onChange={onChange}
                placeholder="Studio, Family apartments, City center"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Agent Bio</span>
              <textarea
                name="bio"
                value={form.bio}
                onChange={onChange}
                placeholder="Write a short introduction about your experience and service style"
                className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Response Rate</p>
                <p className="mt-1 text-2xl font-extrabold text-[#173f56]">{responseRate}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Successful Deals</p>
                <p className="mt-1 text-2xl font-extrabold text-[#173f56]">{successDeals}</p>
              </div>
            </div>
          </>
        )}

        {message && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 md:col-span-2">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white disabled:opacity-60 md:col-span-2"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </section>
  );
};

export default Profile;
