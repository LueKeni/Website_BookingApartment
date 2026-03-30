import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ApartmentCard from '../components/ApartmentCard.jsx';
import api from '../services/api.js';

const toLabel = (value) => {
  if (typeof value !== 'string') {
    return 'Apartment';
  }

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const RoomTypeListings = () => {
  const { roomType } = useParams();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const normalizedRoomType = useMemo(() => decodeURIComponent(roomType || '').trim().toUpperCase(), [roomType]);
  const roomTypeLabel = useMemo(() => toLabel(normalizedRoomType), [normalizedRoomType]);

  useEffect(() => {
    let active = true;

    const fetchApartmentsByRoomType = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/apartments', {
          params: {
            roomType: normalizedRoomType,
            status: 'ALL',
            excludeHidden: 'true'
          }
        });

        const nextApartments = (response?.data?.data || []).filter((item) => item?.status !== 'HIDDEN');
        if (active) {
          setApartments(nextApartments);
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || 'Failed to load room type listings');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (normalizedRoomType) {
      fetchApartmentsByRoomType();
    } else {
      setApartments([]);
      setLoading(false);
      setError('Invalid room type');
    }

    return () => {
      active = false;
    };
  }, [normalizedRoomType]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.6rem] border border-white/80 bg-white/90 p-5 shadow-[0_20px_45px_-30px_rgba(15,45,63,0.65)] md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Room Type Collection</p>
          <h1 className="display-font mt-1 text-3xl text-[#0f2d3f] md:text-4xl">{roomTypeLabel} Listings</h1>
          <p className="mt-2 text-sm text-slate-600">Browse all apartments available for this room type.</p>
        </div>

        <Link
          to="/"
          className="rounded-full border border-[#d4c4ae] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f]"
        >
          Back to Home
        </Link>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="loading-sheen h-[23rem] rounded-[1.5rem] border border-white/70 bg-white/75" />
          ))}
        </div>
      ) : apartments.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-semibold text-slate-700">
          No apartments found for {roomTypeLabel}.
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-600">{apartments.length} listing(s) found</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {apartments.map((apartment, index) => (
              <ApartmentCard key={apartment?._id || `${roomTypeLabel}-${index}`} apartment={apartment} index={index} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default RoomTypeListings;