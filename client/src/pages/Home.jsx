import { useEffect, useState } from 'react';
import ApartmentCard from '../components/ApartmentCard.jsx';
import api from '../services/api.js';

const defaultFilters = {
  transactionType: '',
  roomType: '',
  minPrice: '',
  maxPrice: '',
  minArea: '',
  maxArea: ''
};

const highlights = [
  {
    title: 'Verified Listings',
    description: 'Every apartment profile is moderated with transparent pricing and legal status.'
  },
  {
    title: 'Agent Direct Chat',
    description: 'Connect with brokers instantly and schedule tours without leaving the platform.'
  },
  {
    title: 'Citywide Coverage',
    description: 'Explore apartments across central districts and emerging residential hotspots.'
  }
];

const fallbackShowcaseSlides = [
  {
    id: 'fallback-1',
    title: 'Riverside Luxury Towers',
    subtitle: 'District 1, Ho Chi Minh City',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: 'fallback-2',
    title: 'Modern Family Residences',
    subtitle: 'District 7, Ho Chi Minh City',
    image: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: 'fallback-3',
    title: 'City View Penthouse Collection',
    subtitle: 'Thu Duc City, Ho Chi Minh City',
    image: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80'
  }
];

const shuffleItems = (items) => {
  const copied = [...items];

  for (let index = copied.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }

  return copied;
};

const buildShowcaseSlides = (sourceApartments, maxSlides = 6) => {
  const slides = (sourceApartments || [])
    .map((apartment, index) => {
      const image = apartment?.images?.find((item) => typeof item === 'string' && item.trim() !== '');

      if (!image) {
        return null;
      }

      const district = apartment?.location?.district || 'Unknown district';
      const city = apartment?.location?.city || 'Vietnam';

      return {
        id: apartment?._id || `apartment-${index}`,
        title: apartment?.title || 'Featured apartment',
        subtitle: `${district}, ${city}`,
        image
      };
    })
    .filter(Boolean);

  if (!slides.length) {
    return fallbackShowcaseSlides;
  }

  return shuffleItems(slides).slice(0, maxSlides);
};

const Home = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [showcaseSlides, setShowcaseSlides] = useState(fallbackShowcaseSlides);
  const [activeSlide, setActiveSlide] = useState(0);

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

  const fetchShowcaseSlides = async () => {
    try {
      const response = await api.get('/apartments');
      const dbSlides = buildShowcaseSlides(response?.data?.data || []);
      setShowcaseSlides(dbSlides);
    } catch (err) {
      setShowcaseSlides(fallbackShowcaseSlides);
    }
  };

  useEffect(() => {
    fetchApartments(defaultFilters);
    fetchShowcaseSlides();
  }, []);

  useEffect(() => {
    if (showcaseSlides.length <= 1) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setActiveSlide((previous) => (previous + 1) % showcaseSlides.length);
    }, 3200);

    return () => {
      clearInterval(timerId);
    };
  }, [showcaseSlides.length]);

  useEffect(() => {
    setActiveSlide((previous) => (previous >= showcaseSlides.length ? 0 : previous));
  }, [showcaseSlides.length]);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onFilterSubmit = async (event) => {
    event.preventDefault();
    await fetchApartments(filters);
  };

  const resetFilters = async () => {
    const next = { ...defaultFilters };
    setFilters(next);
    await fetchApartments(next);
  };

  const moveToNextSlide = () => {
    if (showcaseSlides.length <= 1) {
      return;
    }

    setActiveSlide((previous) => (previous + 1) % showcaseSlides.length);
  };

  const moveToPreviousSlide = () => {
    if (showcaseSlides.length <= 1) {
      return;
    }

    setActiveSlide((previous) => (previous - 1 + showcaseSlides.length) % showcaseSlides.length);
  };

  const activeShowcaseSlide = showcaseSlides[activeSlide] || showcaseSlides[0];

  const fieldClassName =
    'w-full rounded-md border border-[#e2d5c3] bg-white/95 px-2 py-1.5 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#173f56] focus:ring-1 focus:ring-[#173f56]/20';

  return (
    <section className="space-y-9">
      <div className="relative overflow-hidden rounded-[2.2rem] border border-white/80 shadow-[0_34px_72px_-55px_rgba(15,45,63,0.95)]">
        {showcaseSlides.map((slide, index) => (
          <img
            key={`hero-${slide.id}`}
            src={slide.image}
            alt={slide.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              index === activeSlide ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-[#0b2537]/88 via-[#0b2537]/58 to-black/35" />
        <div className="pointer-events-none absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0.16) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 flex min-h-[24rem] flex-col justify-between p-5 md:min-h-[27rem] md:p-8 lg:p-10">
          <div className="animate-rise max-w-3xl space-y-4 text-white">
            <p className="inline-flex rounded-full border border-white/40 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
              UrbanNest Introduction
            </p>
            <h1 className="display-font text-4xl leading-tight md:text-[3.8rem] md:leading-[1.02]">
              Find your ideal apartment in one modern marketplace.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
              Verified listings, clear map locations, direct agent contact, and fast booking flow for buyers and renters.
            </p>
          </div>

          <div className="animate-rise space-y-3" style={{ animationDelay: '120ms' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Now showing</p>
                <p className="text-sm font-bold">{activeShowcaseSlide?.title}</p>
                <p className="text-xs text-white/85">{activeShowcaseSlide?.subtitle}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={moveToPreviousSlide}
                  aria-label="Show previous slide"
                  className="rounded-full border border-white/45 bg-white/20 px-2.5 py-1.5 text-sm font-bold text-white transition hover:bg-white/30"
                >
                  &#10094;
                </button>
                <button
                  type="button"
                  onClick={moveToNextSlide}
                  aria-label="Show next slide"
                  className="rounded-full border border-white/45 bg-white/20 px-2.5 py-1.5 text-sm font-bold text-white transition hover:bg-white/30"
                >
                  &#10095;
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {showcaseSlides.map((slide, index) => (
                <button
                  key={`hero-dot-${slide.id}`}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`dot-indicator ${index === activeSlide ? 'is-active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <section id="featured-listings" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Featured Inventory</p>
            <h2 className="display-font text-3xl text-[#0f2d3f] md:text-4xl">Apartments available now</h2>
          </div>
          <p className="rounded-full border border-[#dfd2be] bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700">
            {loading ? 'Loading listings...' : `${apartments.length} properties found`}
          </p>
        </div>

        <form
          onSubmit={onFilterSubmit}
          className="animate-rise grid w-full grid-cols-2 items-end gap-1.5 sm:grid-cols-3 lg:grid-cols-6"
          style={{ animationDelay: '180ms' }}
        >
          <label className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Deal type</span>
            <select
              name="transactionType"
              value={filters.transactionType}
              onChange={onFilterChange}
              className={fieldClassName}
            >
              <option value="">Any</option>
              <option value="SALE">For sale</option>
              <option value="RENT">For rent</option>
            </select>
          </label>

          <label className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Room type</span>
            <select name="roomType" value={filters.roomType} onChange={onFilterChange} className={fieldClassName}>
              <option value="">Any room type</option>
              <option value="STUDIO">Studio</option>
              <option value="1BR">1 Bedroom</option>
              <option value="2BR">2 Bedrooms</option>
              <option value="3BR">3 Bedrooms</option>
              <option value="DUPLEX">Duplex</option>
              <option value="PENTHOUSE">Penthouse</option>
            </select>
          </label>

          <label className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Min price</span>
            <input
              name="minPrice"
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={onFilterChange}
              placeholder="From"
              className={fieldClassName}
            />
          </label>

          <label className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Max price</span>
            <input
              name="maxPrice"
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={onFilterChange}
              placeholder="To"
              className={fieldClassName}
            />
          </label>

          <label className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Min area (m²)</span>
            <input
              name="minArea"
              type="number"
              min="0"
              value={filters.minArea}
              onChange={onFilterChange}
              placeholder="From"
              className={fieldClassName}
            />
          </label>

          <label className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Max area (m²)</span>
            <input
              name="maxArea"
              type="number"
              min="0"
              value={filters.maxArea}
              onChange={onFilterChange}
              placeholder="To"
              className={fieldClassName}
            />
          </label>

          <div className="col-span-2 flex flex-wrap items-center justify-between gap-1.5 pt-0.5 sm:col-span-3 lg:col-span-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{apartments.length} matches</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-[#d4c4ae] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f]"
              >
                Clear filters
              </button>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-[#0f2d3f] to-[#173f56] px-3 py-1 text-[11px] font-semibold text-white transition hover:brightness-110"
              >
                Search apartments
              </button>
            </div>
          </div>
        </form>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="loading-sheen h-[23rem] rounded-[1.5rem] border border-white/70 bg-white/75" />
            ))}
          </div>
        ) : apartments.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-semibold text-slate-700">
            No apartments match your current filters. Try expanding your budget or area range.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {apartments.map((apartment, index) => (
              <ApartmentCard key={apartment?._id || `${apartment?.title || 'apartment'}-${index}`} apartment={apartment} index={index} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {highlights.map((item, index) => (
          <article
            key={item.title}
            className="animate-rise rounded-2xl border border-white/75 bg-gradient-to-br from-white/90 to-[#f8f3ea]/85 p-4 shadow-[0_18px_34px_-32px_rgba(15,45,63,1)]"
            style={{ animationDelay: `${220 + index * 80}ms` }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#c59351]">0{index + 1}</p>
            <h2 className="display-font mt-1 text-2xl text-[#173f56]">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Home;
