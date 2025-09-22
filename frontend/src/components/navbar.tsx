import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="w-full border-b border-indigo-100/60 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            className="w-10 h-10"
            src="/trc-logo.svg"
            alt="Trail Running Calendar"
          />
          <span className="font-semibold text-lg">Trail Running Cal</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link to="/contacto" className="hover:text-indigo-700">
            Contacto
          </Link>
        </nav>
      </div>
    </header>
  );
}
