import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const DEFAULT_MAP_CENTER = [10.7769, 106.7009];
const MAX_APARTMENT_IMAGES = 8;
const MAX_APARTMENT_IMAGE_SIZE = 5 * 1024 * 1024;
const FALLBACK_LISTING_IMAGE =
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';

const emptyApartmentForm = {
  title: '',
  description: '',
  transactionType: 'SALE',
  roomType: 'STUDIO',
  price: '',
  area: '',
  city: '',
  district: '',
  address: '',
  latitude: null,
  longitude: null
};

const roleMetaMap = {
  USER: {
    eyebrow: 'Buyer Workspace',
    title: 'Track your apartment journey',
    description: 'Review your appointments, manage favorites, and leave feedback after completed tours.'
  },
  AGENT: {
    eyebrow: 'Agent Workspace',
    title: 'Operate listings and booking flow',
    description: 'Publish new properties, manage your inventory status, and process incoming customer requests.'
  },
  ADMIN: {
    eyebrow: 'Admin Console',
    title: 'Control platform quality and users',
    description: 'Moderate users and listings while maintaining healthy booking activity across the marketplace.'
  }
};

const fieldClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/10';

const primaryButtonClass =
  'rounded-full bg-[#0f2d3f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173f56]';

const subtleButtonClass =
  'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900';

const successButtonClass =
  'rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700';

const dangerButtonClass =
  'rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700';

const toTitleCase = (value) => {
  if (typeof value !== 'string') {
    return '-';
  }

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatPrice = (value) => {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 'N/A';
  }
  return `$${number.toLocaleString('en-US')}`;
};

const formatDateTime = (dateValue, timeValue) => {
  if (!dateValue) {
    return '-';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const datePart = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return timeValue ? `${datePart} at ${timeValue}` : datePart;
};

const statusToneClassMap = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  HIDDEN: 'bg-slate-200 text-slate-700',
  SOLD: 'bg-rose-100 text-rose-700',
  RENTED: 'bg-slate-200 text-slate-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  BANNED: 'bg-rose-100 text-rose-700'
};

const getStatusClassName = (status) => statusToneClassMap[status] || 'bg-slate-200 text-slate-700';

const getUserId = (user) => user?.id || user?._id || '';

const isValidObjectId = (value) => typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value.trim());

const matchKeyword = (fields, keyword) => {
  return fields.some((value) => {
    if (typeof value === 'number') {
      return String(value).includes(keyword);
    }

    return typeof value === 'string' && value.toLowerCase().includes(keyword);
  });
};

const mergeUniqueFiles = (existingFiles, selectedFiles) => {
  const fileMap = new Map();

  [...existingFiles, ...selectedFiles].forEach((file) => {
    if (!file) {
      return;
    }

    const identity = `${file.name}-${file.size}-${file.lastModified}`;
    fileMap.set(identity, file);
  });

  return Array.from(fileMap.values());
};

const getImageUrls = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter((item) => typeof item === 'string' && item.trim() !== '');
};

const StatCard = ({ label, value }) => {
  return (
    <article className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-[#173f56]">{value}</p>
    </article>
  );
};

const Panel = ({ title, description, action, children }) => {
  return (
    <section className="rounded-[1.6rem] border border-white/80 bg-white/90 p-5 shadow-[0_20px_45px_-30px_rgba(15,45,63,0.65)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display-font text-3xl text-[#0f2d3f]">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
};

const StatusBadge = ({ status }) => {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusClassName(status)}`}>
      {toTitleCase(status)}
    </span>
  );
};

const MapClickHandler = ({ onPinSelect }) => {
  useMapEvents({
    click(event) {
      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));
      onPinSelect({ latitude, longitude });
    }
  });

  return null;
};

const MapViewUpdater = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [map, position]);

  return null;
};

const MapPinPicker = ({ latitude, longitude, onPinSelect, onClearPin }) => {
  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude);
  const selectedPosition = hasPin ? [latitude, longitude] : null;

  return (
    <div className="space-y-2 md:col-span-2">
      <p className="text-sm font-semibold text-slate-800">Map Pin Location</p>
      <div className="overflow-hidden rounded-2xl border border-slate-300">
        <MapContainer
          center={selectedPosition || DEFAULT_MAP_CENTER}
          zoom={selectedPosition ? 16 : 12}
          scrollWheelZoom
          className="h-72 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPinSelect={onPinSelect} />
          <MapViewUpdater position={selectedPosition} />
          {selectedPosition && <CircleMarker center={selectedPosition} radius={10} pathOptions={{ color: '#ef4444', fillOpacity: 0.65 }} />}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">Click directly on the map to pin the apartment location.</p>
      {hasPin ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
          <span>Lat: {latitude} | Lng: {longitude}</span>
          <button
            type="button"
            onClick={onClearPin}
            className={subtleButtonClass}
          >
            Clear Pin
          </button>
        </div>
      ) : (
        <p className="text-xs font-semibold text-amber-700">No pin selected yet.</p>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { isAuthenticated, user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookings, setBookings] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [apartmentForm, setApartmentForm] = useState(emptyApartmentForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [editingApartmentId, setEditingApartmentId] = useState('');
  const [retainedEditingImages, setRetainedEditingImages] = useState([]);
  const [savingApartment, setSavingApartment] = useState(false);
  const [reviewMap, setReviewMap] = useState({});
  const [agentListingSearch, setAgentListingSearch] = useState('');
  const [agentListingStatusFilter, setAgentListingStatusFilter] = useState('ALL');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminRoomSearch, setAdminRoomSearch] = useState('');

  const role = user?.role;
  const userId = getUserId(user);

  const showSuccess = (message) => {
    setError('');
    setSuccess(message);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!role) {
        setLoading(false);
        return;
      }

      if (role === 'USER') {
        const [bookingResponse] = await Promise.all([api.get('/bookings/me'), refreshProfile()]);
        setBookings(bookingResponse?.data?.data || []);
      }

      if (role === 'AGENT') {
        let effectiveUserId = userId;
        if (!isValidObjectId(effectiveUserId)) {
          const refreshedProfile = await refreshProfile();
          effectiveUserId = getUserId(refreshedProfile || {});
        }

        if (!isValidObjectId(effectiveUserId)) {
          setError('Invalid account session. Please sign in again.');
          setApartments([]);
          setBookings([]);
          setLoading(false);
          return;
        }

        const apartmentQuery = { status: 'ALL' };
        apartmentQuery.agentId = effectiveUserId;

        const [bookingResponse, apartmentResponse] = await Promise.all([
          api.get('/bookings/me'),
          api.get('/apartments', { params: apartmentQuery }),
          refreshProfile()
        ]);

        setBookings(bookingResponse?.data?.data || []);
        setApartments(apartmentResponse?.data?.data || []);
      }

      if (role === 'ADMIN') {
        const [userResponse, apartmentResponse, bookingResponse] = await Promise.all([
          api.get('/users'),
          api.get('/apartments', { params: { status: 'ALL' } }),
          api.get('/bookings/me')
        ]);
        setUsers(userResponse?.data?.data || []);
        setApartments(apartmentResponse?.data?.data || []);
        setBookings(bookingResponse?.data?.data || []);
      }
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, role, userId]);

  useEffect(() => {
    if (error) {
      setSuccess('');
    }
  }, [error]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccess('');
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const onApartmentImagesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const hasNonImageFile = selectedFiles.some((file) => !file.type.startsWith('image/'));
    if (hasNonImageFile) {
      setError('Only image files are allowed.');
      event.target.value = '';
      return;
    }

    const hasOversizedFile = selectedFiles.some((file) => file.size > MAX_APARTMENT_IMAGE_SIZE);
    if (hasOversizedFile) {
      setError('Each image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    const mergedFiles = mergeUniqueFiles(imageFiles, selectedFiles);
    const existingImageCount = editingApartmentId ? retainedEditingImages.length : 0;

    if (mergedFiles.length + existingImageCount > MAX_APARTMENT_IMAGES) {
      setError(
        editingApartmentId
          ? `This listing already has ${existingImageCount} image(s). You can add up to ${Math.max(
              MAX_APARTMENT_IMAGES - existingImageCount,
              0
            )} more.`
          : `You can upload up to ${MAX_APARTMENT_IMAGES} images.`
      );
      event.target.value = '';
      return;
    }

    setError('');
    setImageFiles(mergedFiles);
    event.target.value = '';
  };

  const resetApartmentEditor = () => {
    setApartmentForm(emptyApartmentForm);
    setImageFiles([]);
    setImageInputKey((current) => current + 1);
    setEditingApartmentId('');
    setRetainedEditingImages([]);
  };

  const startEditingApartment = (apartment) => {
    if (!apartment) {
      return;
    }

    setEditingApartmentId(apartment._id);
    setApartmentForm({
      title: apartment.title || '',
      description: apartment.description || '',
      transactionType: apartment.transactionType || 'SALE',
      roomType: apartment.roomType || 'STUDIO',
      price: typeof apartment.price === 'number' ? String(apartment.price) : apartment.price || '',
      area: typeof apartment.area === 'number' ? String(apartment.area) : apartment.area || '',
      city: apartment.location?.city || '',
      district: apartment.location?.district || '',
      address: apartment.location?.address || '',
      latitude: Number.isFinite(apartment.location?.latitude) ? apartment.location.latitude : null,
      longitude: Number.isFinite(apartment.location?.longitude) ? apartment.location.longitude : null
    });
    setImageFiles([]);
    setImageInputKey((current) => current + 1);
    setRetainedEditingImages(getImageUrls(apartment.images));
    setError('');
  };

  const saveApartment = async (event) => {
    event.preventDefault();

    if (savingApartment) {
      return;
    }

    try {
      const hasPin = Number.isFinite(apartmentForm.latitude) && Number.isFinite(apartmentForm.longitude);
      if (!hasPin) {
        setError('Please pin apartment location on the map.');
        return;
      }

      const price = Number(apartmentForm.price);
      const area = Number(apartmentForm.area);

      if (!Number.isFinite(price) || price <= 0) {
        setError('Price must be a valid number greater than 0.');
        return;
      }

      if (!Number.isFinite(area) || area <= 0) {
        setError('Area must be a valid number greater than 0.');
        return;
      }

      if (!editingApartmentId && imageFiles.length === 0) {
        setError('Please upload at least one apartment image.');
        return;
      }

      const existingImageCount = editingApartmentId ? retainedEditingImages.length : 0;
      if (editingApartmentId && imageFiles.length > 0 && existingImageCount + imageFiles.length > MAX_APARTMENT_IMAGES) {
        setError(
          `This listing already has ${existingImageCount} image(s). You can add up to ${Math.max(
            MAX_APARTMENT_IMAGES - existingImageCount,
            0
          )} more.`
        );
        return;
      }

      if (editingApartmentId && existingImageCount + imageFiles.length === 0) {
        setError('Please keep at least one image or upload new images before saving.');
        return;
      }

      const payload = {
        title: apartmentForm.title,
        description: apartmentForm.description,
        transactionType: apartmentForm.transactionType,
        roomType: apartmentForm.roomType,
        price,
        area,
        location: {
          city: apartmentForm.city,
          district: apartmentForm.district,
          address: apartmentForm.address,
          latitude: apartmentForm.latitude,
          longitude: apartmentForm.longitude
        }
      };

      if (editingApartmentId) {
        payload.images = retainedEditingImages;
      }

      const didUpdate = Boolean(editingApartmentId);
      setSavingApartment(true);

      if (editingApartmentId) {
        if (imageFiles.length > 0) {
          const formData = new FormData();
          formData.append('payload', JSON.stringify(payload));
          imageFiles.forEach((file) => {
            formData.append('images', file);
          });

          await api.put(`/apartments/${editingApartmentId}`, formData);
        } else {
          await api.put(`/apartments/${editingApartmentId}`, payload);
        }
      } else {
        const formData = new FormData();
        formData.append('payload', JSON.stringify(payload));
        imageFiles.forEach((file) => {
          formData.append('images', file);
        });

        await api.post('/apartments', formData);
      }

      resetApartmentEditor();
      await loadDashboardData();
      showSuccess(
        didUpdate
          ? `Updated listing "${payload.title}" successfully.`
          : `Added listing "${payload.title}" successfully.`
      );
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot save apartment');
    } finally {
      setSavingApartment(false);
    }
  };

  const setApartmentStatus = async (apartmentId, status) => {
    try {
      await api.patch(`/apartments/${apartmentId}/status`, { status });
      await loadDashboardData();
      if (status === 'AVAILABLE') {
        showSuccess('Listing is now available.');
        return;
      }

      if (status === 'HIDDEN') {
        showSuccess('Listing hidden successfully.');
        return;
      }

      showSuccess('Listing status updated successfully.');
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot update apartment status');
    }
  };

  const deleteApartment = async (apartmentId) => {
    try {
      await api.delete(`/apartments/${apartmentId}`);
      await loadDashboardData();
      showSuccess('Listing deleted successfully.');
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot delete apartment');
    }
  };

  const setBookingStatus = async (bookingId, status) => {
    try {
      const payload = status === 'CANCELLED' ? { status, cancelReason: 'Cancelled by operator' } : { status };
      await api.patch(`/bookings/${bookingId}/status`, payload);
      await loadDashboardData();
      if (status === 'CONFIRMED') {
        showSuccess('Booking confirmed successfully.');
        return;
      }

      if (status === 'CANCELLED') {
        showSuccess('Booking cancelled successfully.');
        return;
      }

      if (status === 'COMPLETED') {
        showSuccess('Booking marked as completed.');
        return;
      }

      showSuccess('Booking status updated successfully.');
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot update booking status');
    }
  };

  const toggleFavorite = async (apartmentId) => {
    try {
      await api.post('/users/favorites', { apartmentId });
      await refreshProfile();
      showSuccess('Favorites updated successfully.');
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot update favorites');
    }
  };

  const submitReview = async (bookingId, rating, comment) => {
    try {
      const safeRating = Number(rating);
      if (!Number.isFinite(safeRating) || safeRating < 1 || safeRating > 5) {
        setError('Rating must be a number from 1 to 5.');
        return;
      }

      await api.post('/reviews', { bookingId, rating: safeRating, comment });
      setReviewMap((prev) => ({ ...prev, [bookingId]: { rating: '', comment: '' } }));
      await loadDashboardData();
      showSuccess('Review submitted successfully.');
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot submit review');
    }
  };

  const setUserStatus = async (userId, status) => {
    try {
      await api.patch(`/users/${userId}/status`, { status });
      await loadDashboardData();
      if (status === 'BANNED') {
        showSuccess('User banned successfully.');
        return;
      }

      if (status === 'ACTIVE') {
        showSuccess('User unbanned successfully.');
        return;
      }

      showSuccess('User status updated successfully.');
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot update user status');
    }
  };

  const setUserRole = async (userId, role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      await loadDashboardData();
      showSuccess('User role updated successfully.');
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'Cannot update user role');
    }
  };

  const userStats = useMemo(() => {
    const completed = bookings.filter((item) => item.status === 'COMPLETED').length;
    const pending = bookings.filter((item) => item.status === 'PENDING').length;
    return { total: bookings.length, completed, pending, favorites: user?.favorites?.length || 0 };
  }, [bookings, user?.favorites]);

  const agentStats = useMemo(() => {
    const completed = bookings.filter((item) => item.status === 'COMPLETED').length;
    const pending = bookings.filter((item) => item.status === 'PENDING').length;
    const responseRate = user?.agentInfo?.responseRate || 0;
    return { listings: apartments.length, completed, pending, responseRate };
  }, [apartments, bookings, user?.agentInfo?.responseRate]);

  const adminStats = useMemo(() => {
    return {
      users: users.length,
      agents: users.filter((item) => item.role === 'AGENT').length,
      banned: users.filter((item) => item.status === 'BANNED').length,
      listings: apartments.length,
      bookings: bookings.length
    };
  }, [users, apartments, bookings]);

  const filteredUsers = useMemo(() => {
    const keyword = adminUserSearch.trim().toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((item) =>
      matchKeyword(
        [
          item.fullName,
          item.email,
          item.phone,
          item.role,
          item.status,
          item.agentInfo?.location
        ],
        keyword
      )
    );
  }, [users, adminUserSearch]);

  const filteredAgentApartments = useMemo(() => {
    const keyword = agentListingSearch.trim().toLowerCase();

    return apartments.filter((item) => {
      const statusMatches = agentListingStatusFilter === 'ALL' || item.status === agentListingStatusFilter;
      if (!statusMatches) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return matchKeyword(
        [
          item.title,
          item.description,
          item.transactionType,
          item.roomType,
          item.status,
          item.price,
          item.area,
          item.location?.city,
          item.location?.district,
          item.location?.address
        ],
        keyword
      );
    });
  }, [apartments, agentListingSearch, agentListingStatusFilter]);

  const filteredAdminApartments = useMemo(() => {
    const keyword = adminRoomSearch.trim().toLowerCase();

    if (!keyword) {
      return apartments;
    }

    return apartments.filter((item) =>
      matchKeyword(
        [
          item.title,
          item.description,
          item.transactionType,
          item.roomType,
          item.status,
          item.price,
          item.area,
          item.location?.city,
          item.location?.district,
          item.location?.address,
          item.agentId?.fullName
        ],
        keyword
      )
    );
  }, [apartments, adminRoomSearch]);

  const currentEditingApartment = useMemo(() => {
    if (!editingApartmentId) {
      return null;
    }

    return apartments.find((item) => item._id === editingApartmentId) || null;
  }, [apartments, editingApartmentId]);

  const selectedImagePreviews = useMemo(
    () => imageFiles.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file)
    })),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      selectedImagePreviews.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, [selectedImagePreviews]);

  const existingEditingImages = useMemo(
    () => retainedEditingImages,
    [retainedEditingImages]
  );

  const hasRemovedEditingImages = useMemo(() => {
    const initialImages = getImageUrls(currentEditingApartment?.images);
    return existingEditingImages.length < initialImages.length;
  }, [currentEditingApartment?.images, existingEditingImages.length]);

  const removeRetainedEditingImage = (imageIndex) => {
    setRetainedEditingImages((prev) => prev.filter((_, index) => index !== imageIndex));
  };

  const restoreRetainedEditingImages = () => {
    setRetainedEditingImages(getImageUrls(currentEditingApartment?.images));
    setError('');
  };

  const roleMeta = roleMetaMap[role] || {
    eyebrow: 'Workspace',
    title: 'Manage your activity',
    description: 'Use this dashboard to operate your apartment marketplace workflow.'
  };

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_30px_55px_-38px_rgba(15,45,63,0.75)] md:p-8">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#cf7a3f]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-12 h-44 w-44 rounded-full bg-[#7aa7a0]/20 blur-3xl" />

        <div className="relative space-y-3">
          <p className="inline-flex rounded-full bg-[#173f56]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#173f56]">
            {roleMeta.eyebrow}
          </p>
          <h1 className="display-font text-4xl leading-tight text-[#0f2d3f] md:text-5xl">{roleMeta.title}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">{roleMeta.description}</p>
          <p className="text-sm font-semibold text-slate-700">Welcome back, {user?.fullName || 'there'}.</p>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </p>
      )}

      {success && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_14px_35px_-18px_rgba(16,185,129,0.75)]">
          {success}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="loading-sheen h-28 rounded-2xl border border-white/80 bg-white/75" />
          ))}
        </div>
      ) : (
        <>
          {role === 'USER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Total Bookings" value={userStats.total} />
                <StatCard label="Completed" value={userStats.completed} />
                <StatCard label="Pending" value={userStats.pending} />
                <StatCard label="Favorites" value={userStats.favorites} />
              </div>

              <Panel
                title="Booking Timeline"
                description="Track your booking progress and submit reviews for completed tours."
              >
                <div className="mt-4 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      You do not have any booking records yet.
                    </p>
                  ) : (
                    bookings.map((booking) => (
                      <article key={booking._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-slate-900">{booking.apartmentId?.title || 'Apartment listing'}</p>
                            <p className="text-sm text-slate-600">{formatDateTime(booking.scheduledDate, booking.scheduledTime)}</p>
                            <p className="text-sm text-slate-600">Agent: {booking.agentId?.fullName || '-'}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={booking.status} />
                            {booking.apartmentId?._id && (
                              <button
                                type="button"
                                onClick={() => toggleFavorite(booking.apartmentId._id)}
                                className={subtleButtonClass}
                              >
                                Toggle Favorite
                              </button>
                            )}
                          </div>
                        </div>

                        {booking.status === 'COMPLETED' && (
                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <input
                              placeholder="Rating (1-5)"
                              value={reviewMap[booking._id]?.rating || ''}
                              onChange={(event) =>
                                setReviewMap((prev) => ({
                                  ...prev,
                                  [booking._id]: { ...(prev[booking._id] || {}), rating: event.target.value }
                                }))
                              }
                              className={fieldClassName}
                            />
                            <input
                              placeholder="Comment"
                              value={reviewMap[booking._id]?.comment || ''}
                              onChange={(event) =>
                                setReviewMap((prev) => ({
                                  ...prev,
                                  [booking._id]: { ...(prev[booking._id] || {}), comment: event.target.value }
                                }))
                              }
                              className={fieldClassName}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                submitReview(
                                  booking._id,
                                  reviewMap[booking._id]?.rating || 5,
                                  reviewMap[booking._id]?.comment || ''
                                )
                              }
                              className={primaryButtonClass}
                            >
                              Submit Review
                            </button>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          )}

          {role === 'AGENT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Listings" value={agentStats.listings} />
                <StatCard label="Completed Deals" value={agentStats.completed} />
                <StatCard label="Pending Requests" value={agentStats.pending} />
                <StatCard label="Response Rate" value={`${agentStats.responseRate}%`} />
              </div>

              <Panel
                title={editingApartmentId ? 'Edit Listing' : 'Create Listing'}
                description={
                  editingApartmentId
                    ? 'Update apartment information. Add more images to extend the gallery (up to 8 images total).'
                    : 'Publish a new apartment listing with precise map location.'
                }
                action={
                  editingApartmentId ? (
                    <button type="button" onClick={resetApartmentEditor} className={subtleButtonClass}>
                      Cancel Editing
                    </button>
                  ) : null
                }
              >
                <form id="listing-editor" onSubmit={saveApartment} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listing title</span>
                    <input
                      placeholder="Ex: Modern 2BR in District 1"
                      value={apartmentForm.title}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, title: event.target.value }))}
                      className={fieldClassName}
                      required
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transaction type</span>
                    <select
                      value={apartmentForm.transactionType}
                      onChange={(event) =>
                        setApartmentForm((prev) => ({ ...prev, transactionType: event.target.value }))
                      }
                      className={fieldClassName}
                    >
                      <option value="SALE">For Sale</option>
                      <option value="RENT">For Rent</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room type</span>
                    <select
                      value={apartmentForm.roomType}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, roomType: event.target.value }))}
                      className={fieldClassName}
                    >
                      <option value="STUDIO">Studio</option>
                      <option value="1BR">1 Bedroom</option>
                      <option value="2BR">2 Bedrooms</option>
                      <option value="3BR">3 Bedrooms</option>
                      <option value="PENTHOUSE">Penthouse</option>
                      <option value="DUPLEX">Duplex</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 120000"
                      value={apartmentForm.price}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, price: event.target.value }))}
                      className={fieldClassName}
                      required
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area (m²)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 75"
                      value={apartmentForm.area}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, area: event.target.value }))}
                      className={fieldClassName}
                      required
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</span>
                    <input
                      placeholder="Ex: Ho Chi Minh City"
                      value={apartmentForm.city}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, city: event.target.value }))}
                      className={fieldClassName}
                      required
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">District</span>
                    <input
                      placeholder="Ex: District 7"
                      value={apartmentForm.district}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, district: event.target.value }))}
                      className={fieldClassName}
                      required
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</span>
                    <input
                      placeholder="Full street address"
                      value={apartmentForm.address}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, address: event.target.value }))}
                      className={fieldClassName}
                      required
                    />
                  </label>

                  <MapPinPicker
                    latitude={apartmentForm.latitude}
                    longitude={apartmentForm.longitude}
                    onPinSelect={({ latitude, longitude }) =>
                      setApartmentForm((prev) => ({ ...prev, latitude, longitude }))
                    }
                    onClearPin={() => setApartmentForm((prev) => ({ ...prev, latitude: null, longitude: null }))}
                  />

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
                    <textarea
                      placeholder="Write key highlights of this apartment"
                      value={apartmentForm.description}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, description: event.target.value }))}
                      className={`${fieldClassName} min-h-28`}
                      required
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Apartment Images</span>
                    <input
                      key={imageInputKey}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onApartmentImagesChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0f2d3f] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                    />
                    <p className="text-xs text-slate-500">
                      {imageFiles.length > 0
                        ? `${imageFiles.length} new image(s) selected`
                        : 'Upload up to 8 images, max 5 MB per image.'}
                    </p>
                    {imageFiles.length > 0 && (
                      <p className="text-xs text-slate-500">
                        {imageFiles.slice(0, 3).map((file) => file.name).join(', ')}
                        {imageFiles.length > 3 ? ` +${imageFiles.length - 3} more` : ''}
                      </p>
                    )}

                    {editingApartmentId && imageFiles.length === 0 && (
                      <p className="text-xs text-slate-500">Current images: {existingEditingImages.length}. Add new files to append more images.</p>
                    )}

                    {editingApartmentId && existingEditingImages.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Current Gallery ({existingEditingImages.length})
                          </p>
                          {hasRemovedEditingImages && (
                            <button
                              type="button"
                              onClick={restoreRetainedEditingImages}
                              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400"
                            >
                              Restore removed images
                            </button>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                          {existingEditingImages.slice(0, MAX_APARTMENT_IMAGES).map((imageUrl, imageIndex) => (
                            <div key={`${imageUrl}-${imageIndex}`} className="relative">
                              <img
                                src={imageUrl}
                                alt={`Current apartment ${imageIndex + 1}`}
                                className="h-16 w-full rounded-lg border border-slate-200 object-cover"
                                onError={(event) => {
                                  event.currentTarget.onerror = null;
                                  event.currentTarget.src = FALLBACK_LISTING_IMAGE;
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => removeRetainedEditingImage(imageIndex)}
                                className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-rose-600 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                                aria-label={`Remove current image ${imageIndex + 1}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {editingApartmentId && existingEditingImages.length === 0 && (
                      <p className="text-xs font-semibold text-amber-700">
                        You removed all current images. Please upload at least one new image before saving.
                      </p>
                    )}

                    {selectedImagePreviews.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          New Images To Upload ({selectedImagePreviews.length})
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                          {selectedImagePreviews.map((imageItem) => (
                            <figure key={imageItem.key} className="space-y-1">
                              <img
                                src={imageItem.url}
                                alt={imageItem.name}
                                className="h-16 w-full rounded-lg border border-slate-200 object-cover"
                              />
                              <figcaption className="truncate text-[11px] text-slate-500">{imageItem.name}</figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    )}
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={savingApartment}
                      className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {savingApartment
                        ? editingApartmentId
                          ? 'Saving Changes...'
                          : 'Adding Listing...'
                        : editingApartmentId
                          ? 'Save Changes'
                          : 'Add Listing'}
                    </button>
                  </div>
                </form>
              </Panel>

              <Panel
                title="Manage Listings"
                description="Control visibility and remove outdated properties."
                action={
                  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <input
                      type="text"
                      value={agentListingSearch}
                      onChange={(event) => setAgentListingSearch(event.target.value)}
                      placeholder="Search title, district, room type..."
                      className={`${fieldClassName} md:min-w-[16rem]`}
                    />

                    <select
                      value={agentListingStatusFilter}
                      onChange={(event) => setAgentListingStatusFilter(event.target.value)}
                      className={`${fieldClassName} md:w-auto`}
                    >
                      <option value="ALL">All statuses</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="HIDDEN">Hidden</option>
                      <option value="SOLD">Sold</option>
                      <option value="RENTED">Rented</option>
                    </select>

                    {(agentListingSearch.trim() || agentListingStatusFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setAgentListingSearch('');
                          setAgentListingStatusFilter('ALL');
                        }}
                        className={subtleButtonClass}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                }
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Showing {filteredAgentApartments.length} of {apartments.length} listing(s)
                </p>
                <div className="space-y-3">
                  {filteredAgentApartments.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      {agentListingSearch.trim() || agentListingStatusFilter !== 'ALL'
                        ? 'No listings match your current filters.'
                        : 'No listings found for your account yet.'}
                    </p>
                  ) : (
                    filteredAgentApartments.map((item) => {
                      const listingImages = getImageUrls(item.images);
                      const coverImage = listingImages[0] || FALLBACK_LISTING_IMAGE;

                      return (
                        <article
                          key={item._id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <img
                              src={coverImage}
                              alt={item.title || 'Listing image'}
                              className="h-20 w-28 shrink-0 rounded-xl border border-slate-200 object-cover"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = FALLBACK_LISTING_IMAGE;
                              }}
                            />

                            <div className="min-w-0 space-y-1">
                              <p className="text-lg font-bold text-slate-900">{item.title}</p>
                              <p className="text-sm text-slate-600">
                                {item.location?.district || '-'}, {item.location?.city || '-'}
                              </p>
                              <p className="text-sm text-slate-600">
                                {toTitleCase(item.transactionType)} | {toTitleCase(item.roomType)} | {formatPrice(item.price)}
                              </p>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Images: {listingImages.length}</p>
                              {Number.isFinite(item.location?.latitude) && Number.isFinite(item.location?.longitude) && (
                                <p className="text-sm text-slate-600">
                                  Map Pin: {item.location.latitude}, {item.location.longitude}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={item.status} />
                            <Link
                              to={`/apartments/${item._id}`}
                              className={subtleButtonClass}
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => startEditingApartment(item)}
                              className={primaryButtonClass}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setApartmentStatus(item._id, 'AVAILABLE')}
                              disabled={item.status === 'AVAILABLE'}
                              className={`${subtleButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              Set Available
                            </button>
                            <button
                              type="button"
                              onClick={() => setApartmentStatus(item._id, 'HIDDEN')}
                              disabled={item.status === 'HIDDEN'}
                              className={`${subtleButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              Hide
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteApartment(item._id)}
                              className={dangerButtonClass}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </Panel>

              <Panel title="Manage Bookings" description="Approve, cancel, and complete customer booking requests.">
                <div className="mt-4 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      No bookings assigned to you yet.
                    </p>
                  ) : (
                    bookings.map((booking) => (
                      <article
                        key={booking._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-slate-900">{booking.apartmentId?.title || 'Apartment listing'}</p>
                          <p className="text-sm text-slate-600">Customer: {booking.customerId?.fullName || '-'}</p>
                          <p className="text-sm text-slate-600">{formatDateTime(booking.scheduledDate, booking.scheduledTime)}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={booking.status} />
                          {booking.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setBookingStatus(booking._id, 'CONFIRMED')}
                                className={successButtonClass}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setBookingStatus(booking._id, 'CANCELLED')}
                                className={dangerButtonClass}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {booking.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => setBookingStatus(booking._id, 'COMPLETED')}
                              className={primaryButtonClass}
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          )}

          {role === 'ADMIN' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard label="Users" value={adminStats.users} />
                <StatCard label="Agents" value={adminStats.agents} />
                <StatCard label="Banned" value={adminStats.banned} />
                <StatCard label="Listings" value={adminStats.listings} />
                <StatCard label="Bookings" value={adminStats.bookings} />
              </div>

              <Panel
                title="Manage Users"
                description="Adjust roles and enforce account status for platform safety."
                action={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={adminUserSearch}
                      onChange={(event) => setAdminUserSearch(event.target.value)}
                      placeholder="Search name, email, role..."
                      className={`${fieldClassName} sm:min-w-[18rem]`}
                    />
                    {adminUserSearch.trim() && (
                      <button type="button" onClick={() => setAdminUserSearch('')} className={subtleButtonClass}>
                        Clear
                      </button>
                    )}
                  </div>
                }
              >
                <div className="mt-4 space-y-3">
                  {filteredUsers.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      {adminUserSearch.trim() ? 'No users match your search.' : 'No users found.'}
                    </p>
                  ) : (
                    filteredUsers.map((item) => (
                      <article
                        key={item._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-slate-900">{item.fullName}</p>
                          <p className="text-sm text-slate-600">{item.email}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={item.role}
                            onChange={(event) => setUserRole(item._id, event.target.value)}
                            disabled={item._id === userId}
                            className={`${fieldClassName} w-auto disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <option value="USER">USER</option>
                            <option value="AGENT">AGENT</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>

                          <StatusBadge status={item.status} />

                          {item._id === userId ? (
                            <span className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Current Account
                            </span>
                          ) : item.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => setUserStatus(item._id, 'BANNED')}
                              className={dangerButtonClass}
                            >
                              Ban
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUserStatus(item._id, 'ACTIVE')}
                              className={successButtonClass}
                            >
                              Unban
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </Panel>

              <Panel
                title="Moderate Listings"
                description="Control listing visibility and remove policy-violating posts."
                action={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={adminRoomSearch}
                      onChange={(event) => setAdminRoomSearch(event.target.value)}
                      placeholder="Search title, district, agent..."
                      className={`${fieldClassName} sm:min-w-[18rem]`}
                    />
                    {adminRoomSearch.trim() && (
                      <button type="button" onClick={() => setAdminRoomSearch('')} className={subtleButtonClass}>
                        Clear
                      </button>
                    )}
                  </div>
                }
              >
                <div className="mt-4 space-y-3">
                  {filteredAdminApartments.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      {adminRoomSearch.trim() ? 'No listings match your search.' : 'No listings found.'}
                    </p>
                  ) : (
                    filteredAdminApartments.map((item) => (
                      <article
                        key={item._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-600">Agent: {item.agentId?.fullName || '-'}</p>
                          <p className="text-sm text-slate-600">
                            {toTitleCase(item.transactionType)} | {formatPrice(item.price)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />

                          <button
                            type="button"
                            onClick={() => setApartmentStatus(item._id, 'HIDDEN')}
                            className={subtleButtonClass}
                          >
                            Hide
                          </button>

                          <button
                            type="button"
                            onClick={() => setApartmentStatus(item._id, 'AVAILABLE')}
                            className={subtleButtonClass}
                          >
                            Unhide
                          </button>

                        <button
                          type="button"
                          onClick={() => deleteApartment(item._id)}
                          className={dangerButtonClass}
                        >
                          Delete
                        </button>

                        <Link
                          to={`/apartments/${item._id}`}
                          className={primaryButtonClass}
                        >
                          View
                        </Link>
                      </div>
                    </article>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="Booking Schedule" description="Monitor all scheduled visits across the platform.">
                <div className="mt-4 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      No booking schedule found.
                    </p>
                  ) : (
                    bookings.map((booking) => (
                      <article
                        key={booking._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-slate-900">{booking.apartmentId?.title || 'Unknown apartment'}</p>
                          <p className="text-sm text-slate-600">{formatDateTime(booking.scheduledDate, booking.scheduledTime)}</p>
                          <p className="text-sm text-slate-600">
                            User: {booking.customerId?.fullName || '-'} | Agent: {booking.agentId?.fullName || '-'}
                          </p>
                        </div>

                        <StatusBadge status={booking.status} />
                      </article>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Dashboard;
