import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';

const formatPrice = (value) => {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Contact';
  }
  return amount.toLocaleString('en-US');
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

const getInitial = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'A';
  }

  return value.trim().charAt(0).toUpperCase();
};

const ApartmentCard = ({ apartment, index = 0 }) => {
  const imageCandidates = useMemo(() => {
    const images = Array.isArray(apartment?.images) ? apartment.images : [];
    const validImages = images.filter((item) => typeof item === 'string' && item.trim() !== '');
    return validImages.length ? validImages : [FALLBACK_IMAGE];
  }, [apartment?.images]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [apartment?._id, apartment?.images]);

  const image = imageCandidates[activeImageIndex] || FALLBACK_IMAGE;

  const handleImageError = () => {
    if (image === FALLBACK_IMAGE) {
      return;
    }

    setActiveImageIndex((current) => {
      const nextIndex = current + 1;
      return nextIndex < imageCandidates.length ? nextIndex : imageCandidates.length;
    });
  };

  const location = apartment?.location
    ? `${apartment.location.address}, ${apartment.location.district}, ${apartment.location.city}`
    : 'Unknown location';

  const price = typeof apartment?.price === 'number' ? apartment.price : Number(apartment?.price);
  const area = typeof apartment?.area === 'number' ? apartment.area : Number(apartment?.area);
  const isSale = apartment?.transactionType === 'SALE';

  const latitude = apartment?.location?.latitude;
  const longitude = apartment?.location?.longitude;
  const hasMapPin = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapUrl = hasMapPin ? `https://www.google.com/maps?q=${latitude},${longitude}` : '';

  const statusClassByType = {
    AVAILABLE: 'bg-[#dff5eb] text-[#1d6b50]',
    SOLD: 'bg-[#fde9e9] text-[#9f3434]',
    RENTED: 'bg-[#eceff3] text-[#4b5965]',
    HIDDEN: 'bg-[#faefdc] text-[#9a5d1b]'
  };
  const statusClass = statusClassByType[apartment?.status] || 'bg-slate-200 text-slate-700';
  const priceCaption = isSale ? 'Total price' : 'Monthly rent';
  const areaLabel = Number.isFinite(area) ? `${area} m²` : '-';
  const agentName = apartment?.agentId?.fullName || 'Unknown agent';
  const agentAvatar = typeof apartment?.agentId?.avatar === 'string' ? apartment.agentId.avatar.trim() : '';
  const agentLocation = apartment?.agentId?.agentInfo?.location || '';
  const agentInitial = getInitial(agentName);

  return (
    <article
      className="group animate-rise overflow-hidden rounded-[1.5rem] border border-white/85 bg-white/90 shadow-[0_22px_45px_-34px_rgba(15,45,63,0.9)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_48px_-24px_rgba(15,45,63,0.5)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative">
        <img
          src={image}
          alt={apartment?.title || 'Apartment'}
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
          onError={handleImageError}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 via-black/35 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#173f56]">
            {isSale ? 'For Sale' : 'For Rent'}
          </span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${statusClass}`}>
            {toLabel(apartment?.status)}
          </span>
          {apartment?.boostedAt && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
              Top Boost
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 rounded-xl bg-[#0f2d3f]/92 px-3 py-2 text-right text-white shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{priceCaption}</p>
          <p className="text-lg font-extrabold leading-none">${formatPrice(price)}</p>
        </div>

        {hasMapPin && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0f2d3f] transition hover:bg-white"
          >
            View map
          </a>
        )}
      </div>

      <div className="space-y-3.5 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{toLabel(apartment?.roomType)}</p>
        <div className="flex items-start justify-between gap-3">
          <h3 className="display-font text-[1.6rem] leading-tight text-[#0f2d3f]">{apartment?.title || 'Apartment Listing'}</h3>
          <div className="shrink-0 rounded-xl border border-[#e6edf1] bg-[#f6fafc] px-3 py-1.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Area</p>
            <p className="text-sm font-semibold text-[#173f56]">{areaLabel}</p>
          </div>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{location}</p>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e6edf1] bg-[#f6fafc] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dce7ec] bg-white text-sm font-bold text-[#173f56]">
              {agentAvatar ? <img src={agentAvatar} alt={agentName} className="h-full w-full object-cover" /> : agentInitial}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Listed by</p>
              <p className="truncate text-sm font-semibold text-[#173f56]">{agentName}</p>
            </div>
          </div>

          {agentLocation && <p className="max-w-[45%] truncate text-[11px] font-semibold text-slate-500">{agentLocation}</p>}
        </div>

        <div className="flex items-end justify-between border-t border-[#edf1f4] pt-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{priceCaption}</p>
            <p className="text-xl font-extrabold text-[#0f2d3f]">${formatPrice(price)}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a8a96]">
              {isSale ? 'Negotiable with owner' : 'Utilities not included'}
            </p>
          </div>
          <Link
            to={`/apartments/${apartment?._id}`}
            className="rounded-xl bg-gradient-to-r from-[#0f2d3f] to-[#173f56] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ApartmentCard;
