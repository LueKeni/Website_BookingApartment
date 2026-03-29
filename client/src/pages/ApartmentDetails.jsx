import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const ApartmentDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [apartment, setApartment] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingForm, setBookingForm] = useState({ scheduledDate: '', scheduledTime: '', customerNote: '' });
  const [bookingMessage, setBookingMessage] = useState('');

  const canBook = useMemo(() => user?.role === 'USER', [user?.role]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/apartments/${id}`);
      const nextApartment = response?.data?.data;
      setApartment(nextApartment);
      if (nextApartment?.agentId?._id) {
        const reviewResponse = await api.get(`/reviews/agent/${nextApartment.agentId._id}`);
        setReviews(reviewResponse?.data?.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load apartment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const onBookingChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    try {
      setBookingMessage('');
      await api.post('/bookings', {
        apartmentId: id,
        scheduledDate: bookingForm.scheduledDate,
        scheduledTime: bookingForm.scheduledTime,
        customerNote: bookingForm.customerNote
      });
      setBookingMessage('Appointment request submitted.');
      setBookingForm({ scheduledDate: '', scheduledTime: '', customerNote: '' });
    } catch (err) {
      setBookingMessage(err?.response?.data?.message || 'Booking failed');
    }
  };

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />;
  }

  if (error) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>;
  }

  if (!apartment) {
    return <p className="rounded-xl bg-white px-4 py-3">Apartment not found</p>;
  }

  const location = `${apartment.location.address}, ${apartment.location.district}, ${apartment.location.city}`;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <img
          src={apartment.images?.[0] || 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'}
          alt={apartment.title}
          className="h-80 w-full rounded-3xl object-cover"
        />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-3xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">{apartment.title}</h1>
          <p className="mt-2 text-slate-600">{location}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p className="rounded-xl bg-slate-100 px-3 py-2 font-semibold">Type: {apartment.transactionType}</p>
            <p className="rounded-xl bg-slate-100 px-3 py-2 font-semibold">Room Type: {apartment.roomType || '-'}</p>
            <p className="rounded-xl bg-slate-100 px-3 py-2 font-semibold">Status: {apartment.status}</p>
            <p className="rounded-xl bg-slate-100 px-3 py-2 font-semibold">Area: {apartment.area} m2</p>
            <p className="rounded-xl bg-slate-100 px-3 py-2 font-semibold">Price: ${Number(apartment.price).toLocaleString('en-US')}</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{apartment.description}</p>
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">Agent</p>
            <p className="text-base font-semibold text-slate-900">{apartment.agentId?.fullName}</p>
            <p className="text-sm text-slate-700">{apartment.agentId?.phone}</p>
          </div>
        </div>
      </div>

      {canBook && apartment.status === 'AVAILABLE' && (
        <form onSubmit={submitBooking} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-black text-slate-900">Book Appointment</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="date"
              name="scheduledDate"
              value={bookingForm.scheduledDate}
              onChange={onBookingChange}
              required
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              name="scheduledTime"
              value={bookingForm.scheduledTime}
              onChange={onBookingChange}
              placeholder="09:30"
              required
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">
              Submit Request
            </button>
          </div>
          <textarea
            name="customerNote"
            value={bookingForm.customerNote}
            onChange={onBookingChange}
            placeholder="Add note for agent"
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
          {bookingMessage && <p className="mt-2 text-sm font-semibold text-slate-700">{bookingMessage}</p>}
        </form>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-black text-slate-900">Agent Reviews</h2>
        <div className="mt-4 space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-600">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review._id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{review.customerId?.fullName || 'Customer'}</p>
                  <p className="font-bold text-orange-700">{review.rating}/5</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{review.comment || 'No comment'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ApartmentDetails;
