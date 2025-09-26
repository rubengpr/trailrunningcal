import { Link } from 'react-router-dom';
import logo from '../assets/trc-logo.svg';

export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-indigo-100/60 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <img className="w-10 h-10" src={logo} alt="Trail Running Calendar" />
          <span className="font-semibold text-lg">Trail Running Cal</span>
        </Link>
        <nav className="text-sm">
          <Link to="/contacto">Contacto</Link>
        </nav>
      </div>
    </header>
  );
}
