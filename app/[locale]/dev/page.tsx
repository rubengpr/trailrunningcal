'use client';

import { NextIntlClientProvider } from 'next-intl';
import { BulkProcessTable } from '@/components/admin/bulk-process-table';
import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';
import { BulkResultsOverview } from '@/components/admin/bulk-results-overview';
import type { BulkResultItem } from '@/components/admin/bulk-results-overview';

const messages = {
    admin: {
        races: {
            import: {
                bulk: {
                    columns: {
                        url: 'URL',
                        status: 'Estado',
                        suggestedRaces: 'Carreras',
                        updatedAt: 'Actualizada',
                        actions: 'Acciones',
                    },
                    state: {
                        completed: 'Completada',
                        running: 'En proceso',
                        pending: 'Pendiente',
                        failed: 'Fallida',
                    },
                    actions: {
                        viewResult: 'Ver resultado',
                        loading: 'Cargando...',
                        downloadMarkdown: 'Markdown',
                        downloadJson: 'JSON',
                    },
                },
                results: {
                    name: 'Nombre',
                    date: 'Fecha',
                    distance: 'Distancia',
                    elevation: 'Desnivel positivo',
                    location: 'Ubicación',
                    acceptButton: 'Aceptar',
                    accepted: 'Aceptada',
                    rejectButton: 'Rechazar',
                    editButton: 'Editar',
                    editSaveButton: 'Guardar',
                    editCancelButton: 'Cancelar',
                    editFieldName: 'Nombre',
                    editFieldDate: 'Fecha',
                    editFieldDistance: 'Distancia (km)',
                    editFieldElevation: 'Desnivel (m)',
                    editFieldCity: 'Ciudad',
                    editFieldProvince: 'Provincia',
                    editFieldDescription: 'Descripción',
                },
            },
        },
    },
};

const rows: BulkProcessTableRow[] = [
    {
        id: '1',
        url: 'https://salomonrunbarcelona.com/',
        status: 'completed',
        raceCount: 2,
        error: null,
        updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        markdown: '# Salomon Run Barcelona\n\nContingut de prova en markdown.',
        rawModelOutput: JSON.stringify({ races: [] }, null, 2),
    },
    {
        id: '2',
        url: 'https://ultrapirineu.com/es/',
        status: 'running',
        raceCount: null,
        error: null,
        updatedAt: new Date(Date.now() - 1000 * 30).toISOString(),
        markdown: null,
        rawModelOutput: null,
    },
    {
        id: '3',
        url: 'https://taga2040.com/index.php/ca/',
        status: 'pending',
        raceCount: null,
        error: null,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        markdown: null,
        rawModelOutput: null,
    },
    {
        id: '4',
        url: 'https://olladenuria.cat/',
        status: 'failed',
        raceCount: null,
        error: 'OpenRouter timeout',
        updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        markdown: null,
        rawModelOutput: null,
    },
];

const bulkResults: BulkResultItem[] = [
    {
        url: 'https://salomonrunbarcelona.com/',
        races: [
            {
                name: 'Salomon Run Barcelona - 10K',
                date: '2026-03-15',
                city: 'Barcelona',
                province: 'Barcelona',
                description: 'La Salomon Run Barcelona 10K recorre las calles más emblemáticas de la ciudad condal, con salida y llegada en la Plaça de les Glòries. El recorrido es mayoritariamente llano con un desnivel positivo de 120 metros, ideal para corredores que buscan una experiencia urbana rápida.\n\nLa prueba forma parte del circuito Salomon de carreras urbanas y atrae a más de 3.000 participantes cada edición. El ambiente festivo y la cercanía al transporte público la convierten en una opción accesible para todos los niveles.',
                distanceKm: 10,
                elevationGainM: 120,
            },
            {
                name: 'Salomon Run Barcelona - 21K',
                date: '2026-03-15',
                city: 'Barcelona',
                province: 'Barcelona',
                description: 'La media maratón de la Salomon Run Barcelona ofrece un recorrido de 21 kilómetros que combina tramos urbanos con secciones por el Parc de Collserola. Con 280 metros de desnivel positivo, la prueba presenta un perfil ondulado que pone a prueba la resistencia de los participantes.\n\nEl trazado pasa por puntos icónicos como la Carretera de les Aigües y ofrece vistas panorámicas de la ciudad. Es una distancia exigente pero asequible para corredores con experiencia en media distancia.',
                distanceKm: 21,
                elevationGainM: 280,
            },
            {
                name: 'Salomon Run Barcelona - 42K',
                date: '2026-03-15',
                city: 'Barcelona',
                province: 'Barcelona',
                description: 'La distancia reina de la Salomon Run Barcelona cubre 42 kilómetros entre la ciudad y la sierra de Collserola, acumulando 540 metros de desnivel positivo. El recorrido alterna asfalto, pista forestal y sendero técnico en las zonas altas, ofreciendo una maratón con carácter de trail.\n\nLos corredores afrontan la subida al Tibidabo antes de descender hacia la meta en Glòries. Se recomienda experiencia previa en maratón o ultra trail. Cuenta con cinco avituallamientos completos a lo largo del trazado.',
                distanceKm: 42,
                elevationGainM: 540,
            },
        ],
    },
    {
        url: 'https://ultrapirineu.com/es/',
        races: [
            {
                name: 'Ultra Pirineu - 100K',
                date: '2026-09-26',
                city: 'Bagà',
                province: 'Barcelona',
                description: 'La Ultra Pirineu es la prueba estrella del Cadí-Moixeró, con 100 kilómetros y 6.200 metros de desnivel positivo que recorren el corazón de los Pirineos catalanes. La carrera parte de Bagà, asciende al Pedraforca y atraviesa los collados más emblemáticos del parque natural.\n\nPuntuable para la UTMB y referencia del calendario de ultra trail en España, la prueba exige una preparación sólida en alta montaña. Los participantes disponen de un tiempo límite de 27 horas y deben superar varios controles horarios.',
                distanceKm: 100,
                elevationGainM: 6200,
            },
            {
                name: 'Maratón Pirineu - 42K',
                date: '2026-09-26',
                city: 'Bagà',
                province: 'Barcelona',
                description: 'La Maratón Pirineu cubre 42 kilómetros con 2.700 metros de desnivel positivo por senderos de montaña del Parque Natural del Cadí-Moixeró. El recorrido incluye la ascensión al Coll de Pal y transcurre íntegramente por encima de los 1.000 metros de altitud.\n\nEs una distancia exigente que combina tramos técnicos de cresta con bajadas rápidas por bosques de pino negro. Recomendada para corredores con experiencia en carreras de montaña y buen dominio del descenso técnico.',
                distanceKm: 42,
                elevationGainM: 2700,
            },
            {
                name: 'Mitja Pirineu - 20K',
                date: '2026-09-26',
                city: 'Bagà',
                province: 'Barcelona',
                description: 'La Mitja Pirineu ofrece 20 kilómetros con 1.200 metros de desnivel positivo, una distancia compacta pero intensa que permite disfrutar del paisaje pirenaico sin la exigencia de las distancias largas. El recorrido sale de Bagà y sube hasta el Coll de Bauma.\n\nIdeal para corredores que se inician en el trail de montaña o que buscan una prueba corta pero con carácter alpino. El terreno alterna pista forestal y sendero de montaña con tramos técnicos puntuales.',
                distanceKm: 20,
                elevationGainM: 1200,
            },
            {
                name: 'Pirineu Fun - 5K',
                date: '2026-09-26',
                city: 'Bagà',
                province: 'Barcelona',
                description: 'La Pirineu Fun es una carrera popular de 5 kilómetros por los alrededores de Bagà, pensada para acercar el trail running a todos los públicos. El recorrido discurre por caminos anchos y pistas forestales sin dificultad técnica.\n\nNo tiene carácter competitivo y es apta para personas sin experiencia previa en carreras de montaña. Se celebra el mismo sábado que las distancias largas del Ultra Pirineu, compartiendo el ambiente festivo del evento.',
                distanceKm: 5,
                elevationGainM: null,
            },
        ],
    },
    {
        url: 'https://olladenuria.cat/',
        races: [
            {
                name: 'Olla de Núria - 21K',
                date: '2026-06-14',
                city: 'Queralbs',
                province: 'Girona',
                description: 'La Olla de Núria 21K es un trail de montaña que recorre la Vall de Núria con 1.500 metros de desnivel positivo. El recorrido parte de Queralbs, asciende por el GR-11 hasta el Santuario de Núria y corona el Coll de Finestrelles antes de regresar al punto de partida.\n\nLa prueba transcurre íntegramente por encima de los 1.200 metros y ofrece vistas espectaculares del Puigmal y la sierra de Núria. Es una carrera técnica con tramos de piedra suelta y pendientes sostenidas que requiere experiencia en montaña.',
                distanceKm: 21,
                elevationGainM: 1500,
            },
            {
                name: 'Olla de Núria - 10K',
                date: '2026-06-14',
                city: 'Queralbs',
                province: 'Girona',
                description: 'La distancia corta de la Olla de Núria ofrece 10 kilómetros con 650 metros de desnivel positivo por la parte baja de la Vall de Núria. El recorrido conecta Queralbs con el Santuario de Núria siguiendo el camino histórico del valle.\n\nEs una opción perfecta para corredores que quieren descubrir el entorno del Puigmal sin enfrentarse a la exigencia de la distancia larga. El terreno combina pista y sendero bien marcado, con un descenso técnico pero accesible.',
                distanceKm: 10,
                elevationGainM: 650,
            },
        ],
    },
];

export default function DevPage() {
    return (
        <NextIntlClientProvider locale="es" messages={messages}>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-5xl space-y-10">
                    <div>
                        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Dev preview — BulkProcessTable
                        </p>
                        <div>
                            <p className="mb-2 text-xs text-gray-500">1 completadas · 1 fallidas</p>
                            <BulkProcessTable rows={rows} />
                        </div>
                    </div>
                    <div>
                        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Dev preview — BulkResultsOverview
                        </p>
                        <BulkResultsOverview
                            items={bulkResults}
                            onAccept={async (url, raceIndex, race) => {
                                await new Promise((r) => setTimeout(r, 1000));
                                alert(`Accepted: ${race.name} from ${url} (index ${raceIndex})`);
                            }}
                        />
                    </div>
                </div>
            </div>
        </NextIntlClientProvider>
    );
}
