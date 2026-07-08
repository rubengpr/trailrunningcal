'use client';

import { NextIntlClientProvider } from 'next-intl';
import { BulkProcessTable } from '@/components/admin/bulk-process-table';
import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';

const messages = {
    admin: {
        events: {
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
                </div>
            </div>
        </NextIntlClientProvider>
    );
}
