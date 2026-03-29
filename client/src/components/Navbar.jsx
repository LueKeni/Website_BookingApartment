import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-amber-200 bg-amber-50/70 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-2xl font-black tracking-tight text-slate-900 [font-family:'Space_Grotesk',sans-serif]">
          ApartmentBooking
        </Link>
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-700">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'text-slate-900' : 'text-slate-600')}>
            Home
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'text-slate-900' : 'text-slate-600')}
              >
                Dashboard
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => (isActive ? 'text-slate-900' : 'text-slate-600')}>
                Profile
              </NavLink>
            </>
          )}
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700">
                Login
              </Link>
              <Link to="/register" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white">
                Register
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">{user?.role}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
