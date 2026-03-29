import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

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
  images: ''
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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      if (role === 'USER') {
        const [bookingResponse] = await Promise.all([api.get('/bookings/me'), refreshProfile()]);
        setBookings(bookingResponse?.data?.data || []);
      }

      if (role === 'AGENT') {
        const [bookingResponse, apartmentResponse, profileResponse] = await Promise.all([
          api.get('/bookings/me'),
          api.get('/apartments', { params: { status: 'ALL', agentId: user.id } }),
          api.get('/users/profile')
        ]);
        setBookings(bookingResponse?.data?.data || []);
        setApartments(apartmentResponse?.data?.data || []);
        const profile = profileResponse?.data?.data;
        if (profile?.agentInfo?.availableDays) {
          setApartmentForm((prev) => ({ ...prev, availableDays: profile.agentInfo.availableDays.join(', ') }));
        }
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
  }, [isAuthenticated, role]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const saveApartment = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        title: apartmentForm.title,
        description: apartmentForm.description,
        transactionType: apartmentForm.transactionType,
        roomType: apartmentForm.roomType,
        price: Number(apartmentForm.price),
        area: Number(apartmentForm.area),
        location: {
          city: apartmentForm.city,
          district: apartmentForm.district,
          address: apartmentForm.address
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
      await api.post('/reviews', { bookingId, rating: Number(rating), comment });
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

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">{role} Dashboard</h1>
        <p className="mt-1 text-slate-600">Welcome back, {user?.fullName}</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      ) : (
        <>
          {role === 'USER' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-white p-4 shadow">Total Bookings: {userStats.total}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Completed: {userStats.completed}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Pending: {userStats.pending}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Favorites: {userStats.favorites}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow">
                <h2 className="text-xl font-black text-slate-900">Booking History</h2>
                <div className="mt-4 space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row">
                        <div>
                          <p className="font-bold text-slate-900">{booking.apartmentId?.title}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                          </p>
                          <p className="text-sm text-slate-600">Agent: {booking.agentId?.fullName}</p>
                        </div>
                        <div className="space-y-2 text-right">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{booking.status}</span>
                          {booking.apartmentId?._id && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleFavorite(booking.apartmentId._id)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                              >
                                Toggle Favorite
                              </button>
                            </div>
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
                            className="rounded-xl border border-slate-300 px-3 py-2"
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
                            className="rounded-xl border border-slate-300 px-3 py-2"
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
                            className="rounded-xl bg-slate-900 px-3 py-2 font-bold text-white"
                          >
                            Submit Review
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {role === 'AGENT' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-white p-4 shadow">Listings: {agentStats.listings}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Completed Deals: {agentStats.completed}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Pending Requests: {agentStats.pending}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Response Rate: {agentStats.responseRate}%</div>
              </div>

              <form onSubmit={saveApartment} className="rounded-3xl border border-slate-200 bg-white p-5 shadow">
                <h2 className="text-xl font-black text-slate-900">Create Listing</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    placeholder="Title"
                    value={apartmentForm.title}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <select
                    value={apartmentForm.transactionType}
                    onChange={(event) =>
                      setApartmentForm((prev) => ({ ...prev, transactionType: event.target.value }))
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="SALE">SALE</option>
                    <option value="RENT">RENT</option>
                  </select>
                  <select
                    value={apartmentForm.roomType}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, roomType: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="STUDIO">STUDIO</option>
                    <option value="1BR">1BR</option>
                    <option value="2BR">2BR</option>
                    <option value="3BR">3BR</option>
                    <option value="PENTHOUSE">PENTHOUSE</option>
                    <option value="DUPLEX">DUPLEX</option>
                  </select>
                  <input
                    placeholder="Price"
                    value={apartmentForm.price}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, price: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    placeholder="Area"
                    value={apartmentForm.area}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, area: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    placeholder="City"
                    value={apartmentForm.city}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, city: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    placeholder="District"
                    value={apartmentForm.district}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, district: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    placeholder="Address"
                    value={apartmentForm.address}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, address: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={apartmentForm.description}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
                    required
                  />
                  <input
                    placeholder="Image URLs (comma separated)"
                    value={apartmentForm.images}
                    onChange={(event) => setApartmentForm((prev) => ({ ...prev, images: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
                  />
                  <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white md:col-span-2">
                    Add Listing
                  </button>
                </div>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow">
                <h2 className="text-xl font-black text-slate-900">Manage Listings</h2>
                <div className="mt-4 space-y-3">
                  {apartments.map((item) => (
                    <div key={item._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.location?.district}, {item.location?.city}</p>
                        <p className="text-sm text-slate-600">Room Type: {item.roomType || '-'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setApartmentStatus(item._id, 'AVAILABLE')}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                        >
                          Available
                        </button>
                        <button
                          type="button"
                          onClick={() => setApartmentStatus(item._id, 'HIDDEN')}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                        >
                          Hide
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteApartment(item._id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow">
                <h2 className="text-xl font-black text-slate-900">Manage Bookings</h2>
                <div className="mt-4 space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{booking.apartmentId?.title}</p>
                        <p className="text-sm text-slate-600">Customer: {booking.customerId?.fullName}</p>
                        <p className="text-sm text-slate-600">Status: {booking.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {booking.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setBookingStatus(booking._id, 'CONFIRMED')}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setBookingStatus(booking._id, 'CANCELLED')}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {booking.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => setBookingStatus(booking._id, 'COMPLETED')}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {role === 'ADMIN' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-2xl bg-white p-4 shadow">Users: {adminStats.users}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Agents: {adminStats.agents}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Banned: {adminStats.banned}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Listings: {adminStats.listings}</div>
                <div className="rounded-2xl bg-white p-4 shadow">Bookings: {adminStats.bookings}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow">
                <h2 className="text-xl font-black text-slate-900">Manage Users</h2>
                <div className="mt-4 space-y-3">
                  {users.map((item) => (
                    <div key={item._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.fullName}</p>
                        <p className="text-sm text-slate-600">{item.email} | {item.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.role}
                          onChange={(event) => setUserRole(item._id, event.target.value)}
                          disabled={item._id === user?.id}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="USER">USER</option>
                          <option value="AGENT">AGENT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{item.status}</span>
                        {item._id === user?.id ? (
                          <span className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500">
                            Current Account
                          </span>
                        ) : item.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => setUserStatus(item._id, 'BANNED')}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Ban
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setUserStatus(item._id, 'ACTIVE')}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Unban
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow">
                <h2 className="text-xl font-black text-slate-900">Moderate Listings</h2>
                <div className="mt-4 space-y-3">
                  {apartments.map((item) => (
                    <div key={item._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">Agent: {item.agentId?.fullName || '-'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setApartmentStatus(item._id, 'HIDDEN')}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                        >
                          Hide
                        </button>
                        <button
                          type="button"
                          onClick={() => setApartmentStatus(item._id, 'AVAILABLE')}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                        >
                          Unhide
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteApartment(item._id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Delete
                        </button>
                        <Link
                          to={`/apartments/${item._id}`}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow">
                <h2 className="text-xl font-black text-slate-900">Booking Schedule</h2>
                <div className="mt-4 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="text-sm text-slate-600">No booking schedule found.</p>
                  ) : (
                    bookings.map((booking) => (
                      <div
                        key={booking._id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{booking.apartmentId?.title || 'Unknown apartment'}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                          </p>
                          <p className="text-sm text-slate-600">
                            User: {booking.customerId?.fullName || '-'} | Agent: {booking.agentId?.fullName || '-'}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {booking.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Dashboard;
