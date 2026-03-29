import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const DEFAULT_MAP_CENTER = [10.7769, 106.7009];

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
  longitude: null,
  images: ''
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
  const [bookings, setBookings] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [apartmentForm, setApartmentForm] = useState(emptyApartmentForm);
  const [reviewMap, setReviewMap] = useState({});

  const role = user?.role;
  const userId = getUserId(user);

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
        const apartmentQuery = { status: 'ALL' };
        if (userId) {
          apartmentQuery.agentId = userId;
        }

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const saveApartment = async (event) => {
    event.preventDefault();
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
        },
        images: apartmentForm.images
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      };

      await api.post('/apartments', payload);
      setApartmentForm(emptyApartmentForm);
      await loadDashboardData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot create apartment');
    }
  };

  const setApartmentStatus = async (apartmentId, status) => {
    try {
      await api.patch(`/apartments/${apartmentId}/status`, { status });
      await loadDashboardData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot update apartment status');
    }
  };

  const deleteApartment = async (apartmentId) => {
    try {
      await api.delete(`/apartments/${apartmentId}`);
      await loadDashboardData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot delete apartment');
    }
  };

  const setBookingStatus = async (bookingId, status) => {
    try {
      const payload = status === 'CANCELLED' ? { status, cancelReason: 'Cancelled by operator' } : { status };
      await api.patch(`/bookings/${bookingId}/status`, payload);
      await loadDashboardData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot update booking status');
    }
  };

  const toggleFavorite = async (apartmentId) => {
    try {
      await api.post('/users/favorites', { apartmentId });
      await refreshProfile();
    } catch (err) {
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
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot submit review');
    }
  };

  const setUserStatus = async (userId, status) => {
    try {
      await api.patch(`/users/${userId}/status`, { status });
      await loadDashboardData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot update user status');
    }
  };

  const setUserRole = async (userId, role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      await loadDashboardData();
    } catch (err) {
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

              <Panel title="Create Listing" description="Publish a new apartment listing with precise map location.">
                <form onSubmit={saveApartment} className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Image URLs</span>
                    <input
                      placeholder="Comma separated URLs"
                      value={apartmentForm.images}
                      onChange={(event) => setApartmentForm((prev) => ({ ...prev, images: event.target.value }))}
                      className={fieldClassName}
                    />
                  </label>

                  <div className="md:col-span-2">
                    <button type="submit" className={primaryButtonClass}>
                      Add Listing
                    </button>
                  </div>
                </form>
              </Panel>

              <Panel title="Manage Listings" description="Control visibility and remove outdated properties.">
                <div className="space-y-3">
                  {apartments.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      No listings found for your account yet.
                    </p>
                  ) : (
                    apartments.map((item) => (
                      <article
                        key={item._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-600">
                            {item.location?.district || '-'}, {item.location?.city || '-'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {toTitleCase(item.transactionType)} | {toTitleCase(item.roomType)} | {formatPrice(item.price)}
                          </p>
                          {Number.isFinite(item.location?.latitude) && Number.isFinite(item.location?.longitude) && (
                            <p className="text-sm text-slate-600">
                              Map Pin: {item.location.latitude}, {item.location.longitude}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                          <button
                            type="button"
                            onClick={() => setApartmentStatus(item._id, 'AVAILABLE')}
                            className={subtleButtonClass}
                          >
                            Set Available
                          </button>
                          <button
                            type="button"
                            onClick={() => setApartmentStatus(item._id, 'HIDDEN')}
                            className={subtleButtonClass}
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
                    ))
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

              <Panel title="Manage Users" description="Adjust roles and enforce account status for platform safety.">
                <div className="mt-4 space-y-3">
                  {users.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      No users found.
                    </p>
                  ) : (
                    users.map((item) => (
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

              <Panel title="Moderate Listings" description="Control listing visibility and remove policy-violating posts.">
                <div className="mt-4 space-y-3">
                  {apartments.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600">
                      No listings found.
                    </p>
                  ) : (
                    apartments.map((item) => (
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
