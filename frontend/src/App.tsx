import TrailRaceCard from './components/trail-race-card';
function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900 flex flex-col">
      <header className="w-full border-b border-indigo-100/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              className="w-10 h-10"
              src="/trc-logo.svg"
              alt="Trail Running Calendar"
            />
            <span className="font-semibold text-lg">Trail Running Cal</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#contacto" className="hover:text-indigo-700">
              Contacto
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl px-4">
        <section className="py-14 sm:py-20">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
              Calendario carreras Trail Running Cataluña
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-700 max-w-xl">
              Encuentra las mejores carreras de trail running en Cataluña.
            </p>
          </div>
        </section>

        <section id="ejemplo" className="py-10">
          <h2 className="text-xl font-bold mb-4">Próximas carreras</h2>
          <div className="max-w-3xl">
            {/* Example card; replace with real data later */}
            <TrailRaceCard
              date="15 Mar 2024"
              name="Trail de la Montaña Sagrada"
              distanceKm={32}
              elevationGainM={1800}
              priceEur={35}
              city="Collbató"
              province="Barcelona"
              websiteUrl="https://example.org/trail"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-indigo-100/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
          <p>
            © {new Date().getFullYear()} Trail Running Calendar. Todos los
            derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
