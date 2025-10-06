import { Link } from 'react-router-dom';
import logo from '../assets/trc-logo.svg';

export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-indigo-100/60 px-4 py-4 sm:px-6 lg:px-8">
      {/* Skip navigation links */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="absolute top-4 left-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Saltar al contenido principal
        </a>
        <a
          href="#search-section"
          className="absolute top-4 left-48 z-50 bg-indigo-600 text-white px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Saltar a búsqueda
        </a>
      </div>

      <div className="flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
          aria-label="Ir a la página principal - Trail Running Calendar"
        >
          <img className="w-10 h-10" src={logo} alt="Trail Running Calendar" />
          <span className="font-semibold text-lg">Trail Running Cal</span>
        </Link>
        <nav
          className="text-sm"
          role="navigation"
          aria-label="Navegación principal"
        >
          <Link
            to="/contacto"
            className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1"
          >
            Contacto
          </Link>
        </nav>
      </div>
    </header>
  );
}
