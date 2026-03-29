import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-white/80 bg-[#fff9ef]/80">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <p className="display-font text-3xl text-[#0f2d3f]">UrbanNest</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            A modern apartment marketplace to discover homes, compare prices, and connect with verified agents.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Navigation</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              <Link to="/" className="transition hover:text-[#0f2d3f]">Home</Link>
            </li>
            <li>
              <Link to="/login" className="transition hover:text-[#0f2d3f]">Sign In</Link>
            </li>
            <li>
              <Link to="/register" className="transition hover:text-[#0f2d3f]">Register</Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>support@urbannest.com</li>
            <li>+84 123 456 789</li>
            <li>Mon - Sat, 08:00 - 20:00</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/80">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 md:px-6">
          <p>UrbanNest Apartment Marketplace</p>
          <p>{currentYear} All rights reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
