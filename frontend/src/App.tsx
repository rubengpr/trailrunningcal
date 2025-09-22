import { useState, useMemo } from 'react';
import TrailRaceCard from './components/trail-race-card';
import MonthFilter from './components/month-filter';
import { races } from './data/races';

function App() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const getMonthNumber = (monthKey: string): number => {
    const monthMap: { [key: string]: number } = {
      ene: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dic: 11,
    };
    return monthMap[monthKey] ?? -1;
  };

  const filteredRaces = useMemo(() => {
    if (!selectedMonth) {
      return races;
    }

    const monthNumber = getMonthNumber(selectedMonth);
    return races.filter((race) => {
      const raceDate = new Date(race.date);
      return raceDate.getMonth() === monthNumber;
    });
  }, [selectedMonth]);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
  };
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

        <section id="carreras" className="py-10">
          <h2 className="text-xl font-bold mb-6">Próximas carreras</h2>

          <div className="mb-8">
            <MonthFilter
              selectedMonth={selectedMonth}
              onMonthSelect={handleMonthSelect}
            />
          </div>

          <div className="grid gap-4 max-w-4xl">
            {filteredRaces.map((race) => (
              <TrailRaceCard
                key={race.id}
                date={race.date}
                name={race.name}
                distanceKm={race.distanceKm}
                elevationGainM={race.elevationGainM}
                priceEur={race.priceEur}
                city={race.city}
                province={race.province}
                websiteUrl={race.websiteUrl}
                difficulty={race.difficulty}
              />
            ))}
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
