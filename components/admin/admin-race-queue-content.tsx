'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { SectionHeader } from '@/components/ui/section-header';
import { addRaceToQueue } from '@/lib/api/race-queue';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import type { RaceQueueEntry, RaceQueueStatus } from '@/types/race-queue.types';

interface AdminRaceQueueContentProps {
    entries: RaceQueueEntry[];
}

const STATUS_STYLES: Record<RaceQueueStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    done: 'bg-green-100 text-green-800 border-green-200',
    skipped: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function AdminRaceQueueContent({ entries }: AdminRaceQueueContentProps) {
    const t = useTranslations('admin.races.queue');
    const locale = useLocale();

    const [url, setUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [queueEntries, setQueueEntries] = useState<RaceQueueEntry[]>(entries);

    const formatDate = (dateString: string): string =>
        locale === 'ca'
            ? formatDateToCatalan(dateString)
            : formatDateToSpanish(dateString);

    const translateApiError = (err: unknown): string => {
        const code = err instanceof Error ? err.message : '';
        const knownCodes = [
            'urlRequired',
            'invalidUrlFormat',
            'urlAlreadyInRaces',
            'urlAlreadyInQueue',
        ];
        if (knownCodes.includes(code)) {
            return t(`errors.${code}`);
        }
        return t('addError');
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = url.trim();
        if (!trimmed || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const newEntry = await addRaceToQueue(trimmed);
            setQueueEntries((prev) => [newEntry, ...prev]);
            setUrl('');
            toast.success(t('addSuccess'));
        } catch (err) {
            toast.error(translateApiError(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                subtitle={
                    queueEntries.length === 1
                        ? t('entryCountOne')
                        : t('entryCount', { count: queueEntries.length })
                }
            />

            <form
                onSubmit={handleSubmit}
                className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <FormInput
                        id="queueUrl"
                        type="url"
                        label={t('urlLabel')}
                        value={url}
                        placeholder={t('urlPlaceholder')}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <Button
                        type="submit"
                        disabled={!url.trim() || isSubmitting}
                        isLoading={isSubmitting}
                        loadingText={t('adding')}
                    >
                        {t('addButton')}
                    </Button>
                </div>
            </form>

            {queueEntries.length === 0 ? (
                <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm sm:p-8">
                    {t('empty')}
                </div>
            ) : (
                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.url')}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.status')}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.addedAt')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {queueEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                                        <td className="px-6 py-5">
                                            <a
                                                href={entry.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-gray-900 hover:underline break-all"
                                            >
                                                {entry.url}
                                            </a>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}
                                            >
                                                {t(`status.${entry.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-sm text-gray-700">
                                                {formatDate(entry.createdAt)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
