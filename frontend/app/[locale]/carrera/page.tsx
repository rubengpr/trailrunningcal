import Navbar from '@/components/navbar';

export default function RacePage() {
  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <Navbar />
      <div className="flex flex-col mx-20 my-10">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold mb-1">
              Salomon Ultra Pirineu 100K® 2025
            </h1>
            <div className="flex flex-row text-gray-600 gap-3">
              <h3 className="text-xl font-bold text-black">
                Domingo 23 Octubre 2025
              </h3>
              <div className="flex flex-row gap-2">
                <div className="flex flex-row gap-1">
                  <h3 className="text-xl">Bagà</h3>
                  <h3 className="text-xl">·</h3>
                  <h3 className="text-xl">Barcelona</h3>
                </div>
                <div>
                  <h3 className="text-xl">|</h3>
                </div>
                <div className="flex flex-row gap-1">
                  <h3 className="text-xl">102km</h3>
                  <h3 className="text-xl">+6.700m</h3>
                </div>
              </div>
            </div>
          </div>
          <div>
            <button className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer">
              Web oficial
            </button>
          </div>
        </div>

        <div className="w-full my-6">
          <p>
            La Salomon Ultra Pirineu 100K® 2025 es una de las ultras de montaña
            más emblemáticas del sur de Europa. Con salida y llegada en Bagà, en
            el Parc Natural del Cadí-Moixeró, ofrece un recorrido de 100
            kilómetros y más de 6.000 metros de desnivel positivo, atravesando
            crestas, bosques y senderos técnicos del Pirineo catalán. Es una
            prueba exigente, diseñada para corredores con experiencia en larga
            distancia y terrenos de alta montaña. La carrera destaca también por
            su ambiente y su carácter épico, con tramos nocturnos,
            avituallamientos en lugares remotos y un fuerte apoyo del público
            local. Cada año reúne a atletas de élite y a corredores populares de
            todo el mundo, convirtiéndose en una experiencia intensa donde
            resistencia, estrategia y conexión con la montaña son clave para
            alcanzar la meta.
          </p>
        </div>
        <div className="flex flex-row justify-between items-center px-6 py-4 border-2 border-gray-300 rounded-xl bg-gray-100">
          <div className="flex flex-row justify-start items-center gap-4">
            <div className="flex flex-row w-20 h-20 justify-center items-center border-3 border-gray-300 rounded-full bg-gray-50">
              <p className="text-3xl">🏁</p>
            </div>
            <div className="flex flex-col justify-start">
              <h3 className="text-lg font-semibold mb-1">
                ¿Eres el organizador de esta carrera?
              </h3>
              <p className="text-sm/5">
                Reclama la propiedad del evento y conviértete en un organizador
                verificado.
                <br />
                Los organizadores verificados pueden añadir datos adicionales
                como fotos, mapa y precios completos del evento.
              </p>
            </div>
          </div>
          <div className="flex flex-row justify-end items-center">
            <button className=" bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer">
              Reclamar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
