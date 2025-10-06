import { useState, useMemo } from 'react';
import TrailRaceCard from '../components/trail-race-card';
import MonthFilter from '../components/month-filter';
import SearchBar from '../components/search-bar';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { races } from '../data/races';
import { getMonthNumber } from '../utils/date-utils';

export default function HomePage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
              {filteredRaces.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="max-w-md mx-auto">
                    <div className="mb-6">
                      <svg
                        className="mx-auto h-16 w-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No se encontraron carreras
                    </h3>
                    <p className="text-gray-600 mb-6">
                      No hay carreras que coincidan con los filtros
                      seleccionados. Prueba a ajustar tu búsqueda o selección de
                      mes.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedMonth('');
                        setSearchTerm('');
                      }}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              ) : (
                filteredRaces.map((race, index) => (
                  <TrailRaceCard
                    key={index}
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
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
