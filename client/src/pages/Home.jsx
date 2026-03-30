import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const ROOM_TYPE_ORDER = ['STUDIO', '1BR', '2BR', '3BR', 'DUPLEX', 'PENTHOUSE'];
const APARTMENTS_PER_PAGE = 9;

const buildPaginationItems = (totalPages, currentPage) => {
  if (totalPages <= 1) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push('left-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push('right-ellipsis');
  }

  items.push(totalPages);
  return items;
};

const toLabel = (value) => {
  if (typeof value !== 'string') {
    return '-';
  }

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const findFirstImage = (apartment) => {
  const images = apartment?.images || [];
  return images.find((item) => typeof item === 'string' && item.trim() !== '') || '';
};

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
  const navigate = useNavigate();
  const [apartments, setApartments] = useState([]);
  const [inventoryApartments, setInventoryApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [showcaseSlides, setShowcaseSlides] = useState(fallbackShowcaseSlides);
  const [activeSlide, setActiveSlide] = useState(0);

  const fetchApartments = async (nextFilters, nextPage = 1) => {
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
      query.status = 'ALL';
      query.excludeHidden = 'true';
      query.page = nextPage;
      query.limit = APARTMENTS_PER_PAGE;

      const response = await api.get('/apartments', { params: query });
      const visibleApartments = (response?.data?.data || []).filter((item) => item?.status !== 'HIDDEN');
      const pagination = response?.data?.pagination;

      if (pagination) {
        setApartments(visibleApartments);
        setCurrentPage(pagination.page || nextPage);
        setTotalPages(pagination.totalPages || 1);
        setTotalMatches(pagination.totalItems ?? visibleApartments.length);
      } else {
        // Fallback in case backend is not restarted yet or does not return pagination metadata.
        const fallbackTotalItems = visibleApartments.length;
        const fallbackTotalPages = Math.max(1, Math.ceil(fallbackTotalItems / APARTMENTS_PER_PAGE));
        const fallbackPage = Math.min(Math.max(nextPage, 1), fallbackTotalPages);
        const sliceStart = (fallbackPage - 1) * APARTMENTS_PER_PAGE;
        const slicedApartments = visibleApartments.slice(sliceStart, sliceStart + APARTMENTS_PER_PAGE);

        setApartments(slicedApartments);
        setCurrentPage(fallbackPage);
        setTotalPages(fallbackTotalPages);
        setTotalMatches(fallbackTotalItems);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load apartments');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryApartments = async () => {
    try {
      setInventoryLoading(true);
      const response = await api.get('/apartments', {
        params: { status: 'ALL', includeRentalStats: 'true', excludeHidden: 'true' }
      });

      const visibleApartments = (response?.data?.data || []).filter((item) => item?.status !== 'HIDDEN');
      setInventoryApartments(visibleApartments);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load inventory data');
    } finally {
      setInventoryLoading(false);
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
    fetchApartments(defaultFilters, 1);
    fetchInventoryApartments();
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
    await fetchApartments(filters, 1);
  };

  const resetFilters = async () => {
    const next = { ...defaultFilters };
    setFilters(next);
    await fetchApartments(next, 1);
  };

  const onPageChange = async (nextPage) => {
    if (loading || nextPage === currentPage || nextPage < 1 || nextPage > totalPages) {
      return;
    }

    await fetchApartments(filters, nextPage);

    const section = document.getElementById('all-apartments');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const viewRoomType = (roomType) => {
    navigate(`/listings/${encodeURIComponent(roomType)}`);
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
  const paginationItems = useMemo(() => buildPaginationItems(totalPages, currentPage), [totalPages, currentPage]);

  const featuredRentals = useMemo(() => {
    const rentalApartments = inventoryApartments.filter((item) => item?.transactionType === 'RENT');

    if (rentalApartments.length === 0) {
      return [];
    }

    const sorted = [...rentalApartments].sort((a, b) => {
      const rentalDiff = Number(b?.rentalCount || 0) - Number(a?.rentalCount || 0);
      if (rentalDiff !== 0) {
        return rentalDiff;
      }

      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });

    const withRentCount = sorted.filter((item) => Number(item?.rentalCount || 0) > 0);
    return (withRentCount.length > 0 ? withRentCount : sorted).slice(0, 6);
  }, [inventoryApartments]);

  const apartmentTypeCards = useMemo(() => {
    const grouped = inventoryApartments.reduce((acc, apartment) => {
      const roomType = apartment?.roomType || 'OTHER';
      if (!acc[roomType]) {
        acc[roomType] = [];
      }
      acc[roomType].push(apartment);
      return acc;
    }, {});

    const orderedKeys = [
      ...ROOM_TYPE_ORDER,
      ...Object.keys(grouped).filter((key) => !ROOM_TYPE_ORDER.includes(key)).sort()
    ];

    return orderedKeys
      .filter((key) => Array.isArray(grouped[key]) && grouped[key].length > 0)
      .map((key, index) => {
        const items = grouped[key];
        const imageApartment = items.find((item) => findFirstImage(item)) || items[0];
        const image = findFirstImage(imageApartment) || fallbackShowcaseSlides[index % fallbackShowcaseSlides.length].image;

        return {
          roomType: key,
          count: items.length,
          availableCount: items.filter((item) => item?.status === 'AVAILABLE').length,
          image
        };
      });
  }, [inventoryApartments]);

  const fieldClassName =
    'w-full rounded-xl border border-[#e2d5c3] bg-white/95 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#173f56] focus:ring-2 focus:ring-[#173f56]/20';
  const fieldLabelClassName = 'text-xs font-semibold uppercase tracking-[0.1em] text-slate-500';

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

      <section id="featured-products" className="space-y-4">
        <div className="space-y-1">
          <h2 className="display-font text-3xl text-[#0f2d3f] md:text-4xl">Top Rental Picks</h2>
          <p className="text-sm text-slate-600">Featured rental apartments ranked by completed rentals.</p>
        </div>

        {inventoryLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="loading-sheen h-[23rem] rounded-[1.5rem] border border-white/70 bg-white/75" />
            ))}
          </div>
        ) : featuredRentals.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-semibold text-slate-700">
            Rental ranking data is not available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredRentals.map((apartment, index) => (
              <div key={apartment?._id || `featured-${index}`} className="space-y-2">
                <ApartmentCard apartment={apartment} index={index} />
                <p className="rounded-xl border border-[#d8e4ea] bg-[#f6fafc] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#173f56]">
                  Rented {Number(apartment?.rentalCount || 0)} times
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="all-apartments" className="space-y-4">
        <div className="space-y-1">
          <h2 className="display-font text-3xl text-[#0f2d3f] md:text-4xl">All Apartments</h2>
          <p className="text-sm text-slate-600">Use filters to narrow down your search quickly.</p>
        </div>

        <form
          onSubmit={onFilterSubmit}
          className="animate-rise grid w-full grid-cols-2 items-end gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
          style={{ animationDelay: '180ms' }}
        >
          <label className="space-y-1">
            <span className={fieldLabelClassName}>Deal type</span>
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

          <label className="space-y-1">
            <span className={fieldLabelClassName}>Room type</span>
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

          <label className="space-y-1">
            <span className={fieldLabelClassName}>Min price</span>
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

          <label className="space-y-1">
            <span className={fieldLabelClassName}>Max price</span>
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

          <label className="space-y-1">
            <span className={fieldLabelClassName}>Min area (m²)</span>
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

          <label className="space-y-1">
            <span className={fieldLabelClassName}>Max area (m²)</span>
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

          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1 sm:col-span-3 lg:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {totalMatches} matches {totalPages > 1 ? `(Page ${currentPage}/${totalPages})` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-[#d4c4ae] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f]"
              >
                Clear filters
              </button>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-[#0f2d3f] to-[#173f56] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
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
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {apartments.map((apartment, index) => (
                <ApartmentCard key={apartment?._id || `${apartment?.title || 'apartment'}-${index}`} apartment={apartment} index={index} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="rounded-full border border-[#d4c4ae] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>

                {paginationItems.map((item, index) => {
                  if (typeof item !== 'number') {
                    return (
                      <span key={`${item}-${index}`} className="px-2 text-sm font-semibold text-slate-400">
                        ...
                      </span>
                    );
                  }

                  const isActive = item === currentPage;
                  return (
                    <button
                      key={`page-${item}`}
                      type="button"
                      onClick={() => onPageChange(item)}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-[#173f56] bg-[#173f56] text-white'
                          : 'border-[#d4c4ae] bg-white text-slate-700 hover:border-[#c59351] hover:text-[#0f2d3f]'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="rounded-full border border-[#d4c4ae] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section id="apartment-types" className="space-y-4">
        <div className="space-y-1">
          <h2 className="display-font text-3xl text-[#0f2d3f] md:text-4xl">Browse by Apartment Type</h2>
          <p className="text-sm text-slate-600">A clean overview of each apartment type with quick access.</p>
        </div>

        {inventoryLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="loading-sheen h-[20rem] rounded-[1.5rem] border border-white/70 bg-white/75" />
            ))}
          </div>
        ) : apartmentTypeCards.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-semibold text-slate-700">
            No apartment type data available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {apartmentTypeCards.map((group) => (
              <article
                key={group.roomType}
                className="overflow-hidden rounded-[1.6rem] border border-white/85 bg-white/90 shadow-[0_20px_42px_-32px_rgba(15,45,63,0.95)]"
              >
                <div className="relative h-56 w-full overflow-hidden">
                  <img src={group.image} alt={toLabel(group.roomType)} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <p className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#173f56]">
                    {toLabel(group.roomType)}
                  </p>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-[#0f2d3f]">{toLabel(group.roomType)}</p>
                      <p className="text-sm text-slate-600">{group.count} listings</p>
                    </div>
                    <span className="rounded-full border border-[#dce5ec] bg-[#f6fafc] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#173f56]">
                      {group.availableCount} available
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => viewRoomType(group.roomType)}
                    className="w-full rounded-xl bg-[#e4b900] px-3 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-[#243241] transition hover:brightness-105"
                  >
                    View Listings
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default Home;
