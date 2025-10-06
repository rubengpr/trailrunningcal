import { useState, useMemo } from 'react';
import TrailRaceCard from '../components/trail-race-card';
import MonthFilter from '../components/month-filter';
import SearchBar from '../components/search-bar';
import Navbar from '../components/navbar';
import { races } from '../data/races';

export default function HomePage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
    let filtered = races;

    // Filter by date - only show races with dates higher than today or races without dates
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    filtered = filtered.filter((race) => {
      if (!race.date) return true; // Include races with null dates (TBD races)
      const raceDate = new Date(race.date);
      raceDate.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      return raceDate > today;
    });

    // Filter by month if selected
    if (selectedMonth) {
      const monthNumber = getMonthNumber(selectedMonth);
      filtered = filtered.filter((race) => {
        if (!race.date) return false; // Exclude races with null dates from month filtering
        const raceDate = new Date(race.date);
        return raceDate.getMonth() === monthNumber;
      });
    }

    // Filter by search term if provided
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (race) =>
          race.name.toLowerCase().includes(searchLower) ||
          race.city.toLowerCase().includes(searchLower) ||
          race.province.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [selectedMonth, searchTerm]);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col">
      <Navbar />

      <section className="px-6 py-10">
        <div className="flex  justify-center items-center text-center sm:gap-0">
          <div className="flex flex-col items-center justify-center w-2/3">
            <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
              Calendario carreras Trail Running Cataluña
            </h1>
            <p className="mt-2 text-sm sm:text-lg text-gray-700 max-w-xl">
              Encuentra las mejores carreras de montaña de Cataluña
            </p>
          </div>
        </div>
      </section>

      {/* Full-width search section */}
      <section className="w-full py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              placeholder="Buscar por nombre, ciudad o provincia..."
            />
          </div>
          <div className="flex justify-center">
            <MonthFilter
              selectedMonth={selectedMonth}
              onMonthSelect={handleMonthSelect}
            />
          </div>
        </div>
      </section>

      <main>
        <section id="carreras" className="py-4">
          <div className="flex justify-center px-8">
            <div className="grid w-full max-w-4xl gap-4">
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
          </div>
        </section>
      </main>

      <footer className="border-t border-indigo-100/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Trail Running Cal</p>
        </div>
      </footer>
    </div>
  );
}
