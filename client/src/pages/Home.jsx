import { useEffect, useState } from 'react';
import ApartmentCard from '../components/ApartmentCard.jsx';
import api from '../services/api.js';

const Home = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    transactionType: '',
    roomType: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: ''
  });

  const fetchApartments = async (nextFilters) => {
    try {
      setLoading(true);
      setError('');
      const baseFilters = nextFilters || filters;
      const query = Object.entries(baseFilters).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && typeof value !== 'undefined') {
          acc[key] = value;
        }
        return acc;
      }, {});

      const response = await api.get('/apartments', { params: query });
      setApartments(response?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load apartments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApartments(filters);
  }, []);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onFilterSubmit = async (event) => {
    event.preventDefault();
    await fetchApartments(filters);
  };

  const resetFilters = async () => {
    const next = { transactionType: '', roomType: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '' };
    setFilters(next);
    await fetchApartments(next);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-lg">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 [font-family:'Space_Grotesk',sans-serif]">
          Find Your Next Apartment Appointment
        </h1>
        <p className="mt-2 text-slate-600">Browse listings, compare details, and book viewing slots directly with agents.</p>
      </div>

      <form onSubmit={onFilterSubmit} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <select
          name="transactionType"
          value={filters.transactionType}
          onChange={onFilterChange}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="SALE">Sale</option>
          <option value="RENT">Rent</option>
        </select>
        <select
          name="roomType"
          value={filters.roomType}
          onChange={onFilterChange}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Room Types</option>
          <option value="STUDIO">STUDIO</option>
          <option value="1BR">1BR</option>
          <option value="2BR">2BR</option>
          <option value="3BR">3BR</option>
          <option value="DUPLEX">DUPLEX</option>
          <option value="PENTHOUSE">PENTHOUSE</option>
        </select>
        <input
          name="minPrice"
          value={filters.minPrice}
          onChange={onFilterChange}
          placeholder="Min Price"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="maxPrice"
          value={filters.maxPrice}
          onChange={onFilterChange}
          placeholder="Max Price"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="minArea"
          value={filters.minArea}
          onChange={onFilterChange}
          placeholder="Min Area"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="maxArea"
          value={filters.maxArea}
          onChange={onFilterChange}
          placeholder="Max Area"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">
            Filter
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
          >
            Reset
          </button>
        </div>
      </form>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : apartments.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center font-semibold text-slate-700">
          No apartments matched your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {apartments.map((apartment) => (
            <ApartmentCard key={apartment._id} apartment={apartment} />
          ))}
        </div>
      )}
    </section>
  );
};

export default Home;
