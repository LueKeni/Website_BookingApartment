import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ApartmentCard from '../components/ApartmentCard.jsx';
import api from '../services/api.js';

const emptyStats = {
  totalListings: 0,
  publicListings: 0,
  soldCount: 0,
  rentedCount: 0,
  closedDeals: 0
};

const getEntityId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
};

const buildFromListings = (allListings, agentId) => {
  const normalizedListings = Array.isArray(allListings) ? allListings : [];
  const ownListings = normalizedListings.filter((item) => getEntityId(item?.agentId) === agentId);
  const soldCount = ownListings.filter((item) => item?.status === 'SOLD').length;
  const rentedCount = ownListings.filter((item) => item?.status === 'RENTED').length;
  const publicListings = ownListings.filter((item) => item?.status !== 'HIDDEN');
  const agent = ownListings[0]?.agentId || null;

  return {
    agent,
    listings: publicListings,
    stats: {
      totalListings: ownListings.length,
      publicListings: publicListings.length,
      soldCount,
      rentedCount,
      closedDeals: soldCount + rentedCount
    }
  };
};

const getInitial = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'A';
  }

  return value.trim().charAt(0).toUpperCase();
};

const isValidObjectId = (value) => typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value.trim());

const AgentProfile = () => {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAgentProfile = async () => {
      try {
        setLoading(true);
        setError('');

        try {
          const response = await api.get(`/users/agents/${id}/profile`);
          const data = response?.data?.data;

          if (data?.agent) {
            setAgent(data.agent);
            setListings(data?.listings || []);
            setStats(data?.stats || emptyStats);
            return;
          }
        } catch (primaryError) {
          const isRouteMissing =
            primaryError?.response?.status === 404
            && String(primaryError?.response?.data?.message || '').toLowerCase().includes('route not found');

          if (!isRouteMissing) {
            throw primaryError;
          }
        }

        const fallbackResponse = await api.get('/apartments', {
          params: { agentId: id, status: 'ALL' }
        });
        const fallbackData = buildFromListings(fallbackResponse?.data?.data || [], id);

        setAgent(fallbackData.agent);
        setListings(fallbackData.listings);
        setStats(fallbackData.stats);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load agent profile');
      } finally {
        setLoading(false);
      }
    };

    if (!id || !isValidObjectId(id)) {
      setError('Invalid agent profile link.');
      setLoading(false);
      return;
    }

    if (id) {
      loadAgentProfile();
    }
  }, [id]);

  const agentName = agent?.fullName || 'Unknown agent';
  const agentAvatar = typeof agent?.avatar === 'string' ? agent.avatar.trim() : '';
  const agentPhone = agent?.phone || 'No phone available';
  const agentEmail = agent?.email || '';
  const agentLocation = agent?.agentInfo?.location || '';
  const agentBio = agent?.agentInfo?.bio || '';
  const specialties = useMemo(() => agent?.agentInfo?.specialties || [], [agent?.agentInfo?.specialties]);
  const availableDays = useMemo(() => agent?.agentInfo?.availableDays || [], [agent?.agentInfo?.availableDays]);
  const avatarInitial = getInitial(agentName);

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="loading-sheen h-56 rounded-3xl border border-white/80 bg-white/75" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="loading-sheen h-24 rounded-2xl border border-white/80 bg-white/75" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="loading-sheen h-[22rem] rounded-[1.5rem] border border-white/80 bg-white/75" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>;
  }

  if (!agent) {
    return <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">Agent not found.</p>;
  }

  return (
    <section className="space-y-6">
      <Link
        to="/"
        className="inline-flex rounded-full border border-[#d4c4ae] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f]"
      >
        Back to listings
      </Link>

      <article className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_26px_48px_-34px_rgba(15,45,63,0.85)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#dbe6ec] bg-white text-2xl font-extrabold text-[#173f56]">
              {agentAvatar ? <img src={agentAvatar} alt={agentName} className="h-full w-full object-cover" /> : avatarInitial}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#236d56]">Agent Profile</p>
              <h1 className="display-font text-3xl leading-tight text-[#0f2d3f] md:text-4xl">{agentName}</h1>
              <p className="text-sm font-semibold text-slate-600">{agentPhone}</p>
              {agentEmail && <p className="text-sm text-slate-600">{agentEmail}</p>}
            </div>
          </div>

          {agentLocation && (
            <p className="rounded-full border border-[#d6e4dd] bg-[#edf8f4] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#236d56]">
              {agentLocation}
            </p>
          )}
        </div>

        {specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {specialties.map((item, index) => (
              <span key={`${item}-${index}`} className="rounded-full border border-[#d3e2e9] bg-[#f7fbfd] px-3 py-1 text-[11px] font-semibold text-[#173f56]">
                {item}
              </span>
            ))}
          </div>
        )}

        {availableDays.length > 0 && (
          <p className="mt-3 text-sm text-slate-600">Available days: {availableDays.join(', ')}</p>
        )}

        {agentBio && (
          <p className="mt-3 rounded-2xl border border-[#e5ecef] bg-white/85 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {agentBio}
          </p>
        )}
      </article>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <article className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Listed</p>
          <p className="mt-2 text-2xl font-extrabold text-[#173f56]">{stats.totalListings}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Public Rooms</p>
          <p className="mt-2 text-2xl font-extrabold text-[#173f56]">{stats.publicListings}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sold</p>
          <p className="mt-2 text-2xl font-extrabold text-[#173f56]">{stats.soldCount}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rented</p>
          <p className="mt-2 text-2xl font-extrabold text-[#173f56]">{stats.rentedCount}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Closed Deals</p>
          <p className="mt-2 text-2xl font-extrabold text-[#173f56]">{stats.closedDeals}</p>
        </article>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="display-font text-3xl text-[#0f2d3f]">Rooms Posted By Agent</h2>
            <p className="text-sm text-slate-600">{listings.length} room(s) are currently visible.</p>
          </div>
        </div>

        {listings.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-semibold text-slate-700">
            This agent has no public rooms yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((apartment, index) => (
              <ApartmentCard key={apartment?._id || `${apartment?.title || 'apartment'}-${index}`} apartment={apartment} index={index} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default AgentProfile;
