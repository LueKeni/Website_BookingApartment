import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }) =>
    [
      'rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200',
      isActive
        ? 'bg-gradient-to-r from-[#0f2d3f] to-[#173f56] text-white shadow-[0_14px_22px_-16px_rgba(15,45,63,1)]'
        : 'text-slate-700 hover:bg-white hover:text-[#0f2d3f]'
    ].join(' ');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#e7dbc8]/80 bg-[#fefaf2]/78 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f2d3f] via-[#173f56] to-[#245f79] text-sm font-extrabold text-white shadow-[0_12px_28px_-18px_rgba(15,45,63,1)] transition group-hover:scale-105">
            UN
          </span>
          <span>
            <span className="display-font block text-2xl leading-none text-[#0f2d3f]">UrbanNest</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Prime Apartment Marketplace</span>
          </span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-2 rounded-full border border-white/90 bg-white/70 px-2 py-1.5 shadow-[0_20px_35px_-30px_rgba(15,45,63,1)]">
          <NavLink to="/" className={navLinkClass}>
            Browse
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/inbox" className={navLinkClass}>
                Inbox
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
            </>
          )}

          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="rounded-full border border-[#d4c4ae] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-gradient-to-r from-[#0f2d3f] to-[#173f56] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Join as Buyer
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2 pl-1">
              <span className="rounded-full border border-[#d6e4dd] bg-[#edf8f4] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#236d56]">
                {user?.role}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-[#d4c4ae] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#c59351] hover:text-[#0f2d3f]"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
