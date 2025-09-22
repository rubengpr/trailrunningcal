import Navbar from './navbar';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contacto</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            ¿Tienes alguna pregunta sobre las carreras o necesitas más
            información? No dudes en contactarnos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Email</h3>
              </div>
              <p className="text-gray-600 mb-2">Para consultas generales:</p>
              <a
                href="mailto:info@trailrunningcal.com"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                info@trailrunningcal.com
              </a>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Ubicación
                </h3>
              </div>
              <p className="text-gray-600 mb-2">Basado en:</p>
              <p className="text-gray-900 font-medium">Cataluña, España</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información
            </h3>
            <div className="space-y-4 text-gray-600">
              <p>
                Trail Running Cal es tu plataforma de referencia para descubrir
                las mejores carreras de trail running en Cataluña.
              </p>
              <p>
                Mantenemos un calendario actualizado con carreras de todas las
                provincias catalanas, desde carreras populares hasta ultra
                trails.
              </p>
              <p>
                Si eres organizador de carreras y quieres que tu evento aparezca
                en nuestro calendario, contáctanos.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-indigo-100/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Trail Running Cal</p>
        </div>
      </footer>
    </div>
  );
}
