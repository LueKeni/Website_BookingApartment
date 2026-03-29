import { Link } from 'react-router-dom';

const formatPrice = (value) => {
  if (typeof value !== 'number') {
    return 'Contact';
  }
  return value.toLocaleString('en-US');
};

const ApartmentCard = ({ apartment }) => {
  const image = apartment?.images?.[0] || 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';
  const location = apartment?.location
    ? `${apartment.location.address}, ${apartment.location.district}, ${apartment.location.city}`
    : 'Unknown location';

  return (
    <article className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl">
      <img src={image} alt={apartment?.title || 'Apartment'} className="h-44 w-full object-cover" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">{apartment?.transactionType}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{apartment?.status}</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room Type: {apartment?.roomType || '-'}</p>
        <h3 className="text-lg font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">{apartment?.title || 'Apartment'}</h3>
        <p className="text-sm text-slate-600">{location}</p>
        <div className="flex items-end justify-between">
          <p className="text-lg font-extrabold text-slate-900">${formatPrice(apartment?.price)}</p>
          <p className="text-sm font-semibold text-slate-600">{apartment?.area} m2</p>
        </div>
        <Link
          to={`/apartments/${apartment?._id}`}
          className="block rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-700"
        >
          View Details
        </Link>
      </div>
    </article>
  );
};

export default ApartmentCard;
