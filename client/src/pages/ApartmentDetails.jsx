import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChatBox from '../components/ChatBox.jsx';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';

const toLabel = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '-';
  }

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatPrice = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 'N/A';
  }

  return Math.round(parsed).toLocaleString('en-US');
};

const formatReviewDate = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatNumberField = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toString() : '-';
};

const getInitial = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'A';
  }

  return value.trim().charAt(0).toUpperCase();
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const ApartmentDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [apartment, setApartment] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingForm, setBookingForm] = useState({ scheduledDate: '', scheduledTime: '', customerNote: '' });
  const [bookingMessage, setBookingMessage] = useState({ type: '', text: '' });
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState([]);

  const canBook = useMemo(() => user?.role === 'USER', [user?.role]);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/apartments/${id}`);
      const nextApartment = response?.data?.data;
      setApartment(nextApartment || null);
      setActiveImageIndex(0);
      setFailedImageUrls([]);

      if (nextApartment?.agentId?._id) {
        const reviewResponse = await api.get(`/reviews/agent/${nextApartment.agentId._id}`);
        setReviews(reviewResponse?.data?.data || []);
      } else {
        setReviews([]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load apartment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const sourceImages = useMemo(
    () => (apartment?.images || []).filter((item) => typeof item === 'string' && item.trim() !== ''),
    [apartment?.images]
  );

  const galleryImages = useMemo(() => {
    const failedSet = new Set(failedImageUrls);
    const validImages = sourceImages.filter((imageUrl) => !failedSet.has(imageUrl));
    return validImages.length ? validImages : [FALLBACK_IMAGE];
  }, [failedImageUrls, sourceImages]);

  useEffect(() => {
    setActiveImageIndex((current) => (current >= galleryImages.length ? 0 : current));
  }, [galleryImages.length]);

  const removeBrokenImage = useCallback((imageUrl) => {
    if (!imageUrl || imageUrl === FALLBACK_IMAGE) {
      return;
    }

    setFailedImageUrls((prev) => (prev.includes(imageUrl) ? prev : [...prev, imageUrl]));
  }, []);

  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return null;
    }

    const total = reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const detailItems = useMemo(() => {
    const area = Number(apartment?.area);

    return [
      { label: 'Transaction', value: toLabel(apartment?.transactionType) },
      { label: 'Room Type', value: toLabel(apartment?.roomType) },
      { label: 'Area', value: Number.isFinite(area) ? `${area} m²` : '-' },
      { label: 'Bedrooms', value: formatNumberField(apartment?.details?.bedrooms) },
      { label: 'Bathrooms', value: formatNumberField(apartment?.details?.bathrooms) },
      { label: 'Price', value: `$${formatPrice(apartment?.price)}` }
    ];
  }, [apartment]);

  const moveToNextImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    setActiveImageIndex((current) => (current + 1) % galleryImages.length);
  };

  const moveToPreviousImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    setActiveImageIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
  };

  const onBookingChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitBooking = async (event) => {
    event.preventDefault();

    if (submittingBooking) {
      return;
    }

    if (!bookingForm.scheduledDate || !bookingForm.scheduledTime) {
      setBookingMessage({ type: 'error', text: 'Please select both date and time.' });
      return;
    }

    try {
      setSubmittingBooking(true);
      setBookingMessage({ type: '', text: '' });
      await api.post('/bookings', {
        apartmentId: id,
        scheduledDate: bookingForm.scheduledDate,
        scheduledTime: bookingForm.scheduledTime,
        customerNote: bookingForm.customerNote
      });
      setBookingMessage({ type: 'success', text: 'Booking request submitted successfully.' });
      setBookingForm({ scheduledDate: '', scheduledTime: '', customerNote: '' });
    } catch (err) {
      setBookingMessage({ type: 'error', text: err?.response?.data?.message || 'Booking failed' });
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="luxe-panel h-[26rem] animate-pulse rounded-[2rem]" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="luxe-panel h-72 animate-pulse rounded-3xl" />
          <div className="luxe-panel h-72 animate-pulse rounded-3xl" />
        </div>
      </section>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>;
  }

  if (!apartment) {
    return <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">Apartment not found.</p>;
  }

  const location = [apartment?.location?.address, apartment?.location?.district, apartment?.location?.city]
    .filter(Boolean)
    .join(', ');
  const latitude = Number(apartment?.location?.latitude);
  const longitude = Number(apartment?.location?.longitude);
  const hasMapPin = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapUrl = hasMapPin ? `https://www.google.com/maps?q=${latitude},${longitude}` : '';
  const mapEmbedUrl = hasMapPin ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed` : '';
  const agentName = apartment?.agentId?.fullName || 'Unknown agent';
  const agentAvatar = typeof apartment?.agentId?.avatar === 'string' ? apartment.agentId.avatar.trim() : '';
  const agentEmail = apartment?.agentId?.email || '';
  const agentPhone = apartment?.agentId?.phone || '';
  const agentLocation = apartment?.agentId?.agentInfo?.location || '';
  const agentBio = apartment?.agentId?.agentInfo?.bio || '';
  const agentSpecialties = apartment?.agentId?.agentInfo?.specialties || [];
  const agentAvailableDays = apartment?.agentId?.agentInfo?.availableDays || [];
  const agentProfileUrl = apartment?.agentId?._id ? `/agents/${apartment.agentId._id}` : '';
  const agentInitial = getInitial(agentName);
  const statusClassByType = {
    AVAILABLE: 'bg-[#dff5eb] text-[#1d6b50] border-[#c4e9d6]',
    SOLD: 'bg-[#fde9e9] text-[#9f3434] border-[#f3cbcb]',
    RENTED: 'bg-[#eceff3] text-[#4b5965] border-[#dbe3ea]',
    HIDDEN: 'bg-[#faefdc] text-[#9a5d1b] border-[#efd7b4]'
  };
  const statusClassName = statusClassByType[apartment?.status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="luxe-panel animate-rise rounded-[2rem] p-4 md:p-5">
          <div className="relative overflow-hidden rounded-[1.5rem]">
            <img
              src={galleryImages[activeImageIndex]}
              alt={apartment?.title || 'Apartment'}
              className="h-[20rem] w-full object-cover md:h-[30rem]"
              onError={() => removeBrokenImage(galleryImages[activeImageIndex])}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#173f56]">
                {toLabel(apartment?.transactionType)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${statusClassName}`}>
                {toLabel(apartment?.status)}
              </span>
            </div>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={moveToPreviousImage}
                  aria-label="Show previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/30 px-3 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/45"
                >
                  &#10094;
                </button>
                <button
                  type="button"
                  onClick={moveToNextImage}
                  aria-label="Show next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/30 px-3 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/45"
                >
                  &#10095;
                </button>
              </>
            )}

            <p className="absolute bottom-3 right-3 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
              Image {activeImageIndex + 1}/{galleryImages.length}
            </p>
          </div>

          {galleryImages.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                  className={`overflow-hidden rounded-xl border transition ${
                    index === activeImageIndex ? 'border-[#173f56] shadow-[0_10px_20px_-14px_rgba(15,45,63,1)]' : 'border-white/80 hover:border-[#c59351]'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Apartment view ${index + 1}`}
                    className="h-14 w-full object-cover"
                    onError={() => removeBrokenImage(image)}
                  />
                </button>
              ))}
            </div>
          )}

        </article>

        <article className="luxe-panel animate-rise rounded-[2rem] p-5 md:p-6" style={{ animationDelay: '80ms' }}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="rounded-full bg-[#173f56]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#173f56]">Prime Listing</p>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${statusClassName}`}>
              {toLabel(apartment?.status)}
            </span>
          </div>

          <h1 className="display-font mt-3 text-3xl leading-tight text-[#0f2d3f] md:text-5xl">{apartment?.title || 'Apartment Listing'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{location || 'Unknown location'}</p>

          <div className="mt-4">
            <p className="text-3xl font-extrabold text-[#0f2d3f] md:text-4xl">${formatPrice(apartment?.price)}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {apartment?.transactionType === 'SALE' ? 'Asking price' : 'Monthly rent'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {detailItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-[#e6edf1] bg-[#f6fafc] px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                <p className="text-sm font-semibold text-[#173f56]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#e5ecef] bg-white/85 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Description</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{apartment?.description || 'No description provided.'}</p>
          </div>

          <div className="mt-5 rounded-2xl border border-[#d6e4dd] bg-[#edf8f4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#236d56]">Listing Agent</p>
            {agentProfileUrl ? (
              <Link
                to={agentProfileUrl}
                className="group mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-[#c8dfd5] bg-white/85 px-2.5 py-2 transition hover:border-[#8dc1ad]"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#9dcab8] bg-white text-xl font-black text-[#236d56]">
                  {agentAvatar ? <img src={agentAvatar} alt={agentName} className="h-full w-full object-cover" /> : agentInitial}
                </div>

                <div>
                  <p className="text-lg font-bold text-[#133f32]">{agentName}</p>
                  <p className="text-sm font-semibold text-[#1d5f4d]">{agentPhone || 'No phone available'}</p>
                  {agentEmail && <p className="text-sm text-[#2a6f5a]">{agentEmail}</p>}
                  <p className="text-xs font-semibold text-[#236d56] underline-offset-2 group-hover:underline">View agent profile</p>
                </div>
              </Link>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#9dcab8] bg-white text-xl font-black text-[#236d56]">
                  {agentAvatar ? <img src={agentAvatar} alt={agentName} className="h-full w-full object-cover" /> : agentInitial}
                </div>

                <div>
                  <p className="text-lg font-bold text-[#133f32]">{agentName}</p>
                  <p className="text-sm font-semibold text-[#1d5f4d]">{agentPhone || 'No phone available'}</p>
                  {agentEmail && <p className="text-sm text-[#2a6f5a]">{agentEmail}</p>}
                </div>
              </div>
            )}

            {agentLocation && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2a6f5a]">Area: {agentLocation}</p>}

            {agentSpecialties.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {agentSpecialties.map((item, index) => (
                  <span key={`${item}-${index}`} className="rounded-full border border-[#b9dccc] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1c5c49]">
                    {item}
                  </span>
                ))}
              </div>
            )}

            {agentAvailableDays.length > 0 && (
              <p className="mt-2 text-xs text-[#2a6f5a]">Available: {agentAvailableDays.join(', ')}</p>
            )}

            {agentBio && <p className="mt-2 text-sm leading-relaxed text-[#215442]">{agentBio}</p>}

            <div className="mt-4 rounded-xl border border-[#cfe1d8] bg-white/75 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2a6f5a]">
                Need quick help?
              </p>
              <ChatBox
                apartmentId={apartment._id}
                agentId={apartment.agentId?._id}
                agentName={apartment.agentId?.fullName}
                embedded
              />
            </div>

          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="luxe-panel animate-rise rounded-3xl p-5" style={{ animationDelay: '120ms' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="display-font text-3xl text-[#0f2d3f]">Location Map</h2>
            {hasMapPin && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-[0.12em] text-[#236d56] hover:text-[#133f32]">
                Open full map
              </a>
            )}
          </div>

          {hasMapPin ? (
            <div className="mt-4 space-y-3">
              <iframe
                title="Apartment map pin"
                src={mapEmbedUrl}
                className="h-80 w-full rounded-2xl border border-[#d8e0e5]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Latitude {latitude} | Longitude {longitude}
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
              This listing does not have map coordinates yet.
            </p>
          )}
        </article>

        <article className="luxe-panel animate-rise rounded-3xl p-5" style={{ animationDelay: '160ms' }}>
          <h2 className="display-font text-3xl text-[#0f2d3f]">Book a Viewing</h2>
          <p className="mt-1 text-sm text-slate-600">Choose a date and preferred time to request a visit.</p>

          {!canBook ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              Sign in with a user account to submit booking requests.
            </p>
          ) : apartment?.status !== 'AVAILABLE' ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              This listing is currently not available for booking.
            </p>
          ) : (
            <form onSubmit={submitBooking} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Scheduled date</span>
                  <input
                    type="date"
                    name="scheduledDate"
                    min={getTodayDate()}
                    value={bookingForm.scheduledDate}
                    onChange={onBookingChange}
                    required
                    className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Scheduled time</span>
                  <input
                    type="time"
                    name="scheduledTime"
                    value={bookingForm.scheduledTime}
                    onChange={onBookingChange}
                    required
                    className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
                  />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Note for agent</span>
                <textarea
                  name="customerNote"
                  value={bookingForm.customerNote}
                  onChange={onBookingChange}
                  placeholder="Mention preferred contact time or extra requests"
                  className="min-h-24 w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/15"
                />
              </label>

              <button
                type="submit"
                disabled={submittingBooking}
                className="rounded-xl bg-gradient-to-r from-[#0f2d3f] to-[#173f56] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingBooking ? 'Submitting...' : 'Submit request'}
              </button>

              {bookingMessage.text && (
                <p
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    bookingMessage.type === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {bookingMessage.text}
                </p>
              )}
            </form>
          )}
        </article>
      </div>

      <article className="luxe-panel animate-rise rounded-3xl p-5" style={{ animationDelay: '220ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="display-font text-3xl text-[#0f2d3f]">Agent Reviews</h2>
            <p className="text-sm text-slate-600">{reviews.length} review(s)</p>
          </div>
          <div className="rounded-xl border border-[#eadcc8] bg-[#f8f1e5] px-3 py-2 text-right">
            <p className="text-lg font-extrabold text-[#0f2d3f]">{averageRating ? `${averageRating}/5` : 'N/A'}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Average rating</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {reviews.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review._id} className="rounded-xl border border-[#e5ecef] bg-white/90 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{review.customerId?.fullName || 'Customer'}</p>
                    <p className="text-xs text-slate-500">{formatReviewDate(review.createdAt)}</p>
                  </div>
                  <p className="rounded-full bg-[#fff2df] px-2.5 py-1 text-sm font-bold text-[#9a5d1b]">{Number(review?.rating || 0).toFixed(1)}/5</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{review.comment || 'No comment provided.'}</p>
              </div>
            ))
          )}
        </div>
      </article>

    </section>
  );
};

export default ApartmentDetails;
