'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { SectionHeader } from '@/components/ui/section-header';
import { BaseModal } from '@/components/ui/base-modal';
import { addRaceToQueue, deleteRaceFromQueue } from '@/lib/api/race-queue';
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
    const [entryToDelete, setEntryToDelete] = useState<RaceQueueEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleDeleteConfirm = async () => {
        if (!entryToDelete || isDeleting) return;

        setIsDeleting(true);
        try {
            await deleteRaceFromQueue(entryToDelete.id);
            setQueueEntries((prev) => prev.filter((e) => e.id !== entryToDelete.id));
            setEntryToDelete(null);
            toast.success(t('delete.success'));
        } catch {
            toast.error(t('delete.error'));
        } finally {
            setIsDeleting(false);
        }
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
                                    <th className="px-6 py-4" />
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
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => setEntryToDelete(entry)}
                                                title={t('delete.button')}
                                                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <BaseModal
                isOpen={entryToDelete !== null}
                onClose={() => setEntryToDelete(null)}
                title={t('delete.confirmTitle')}
                maxWidth="md"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600">
                        {t('delete.confirmDescription')}
                    </p>
                    {entryToDelete && (
                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 break-all font-mono">
                            {entryToDelete.url}
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setEntryToDelete(null)}
                            disabled={isDeleting}
                        >
                            {t('delete.cancelButton')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleDeleteConfirm}
                            isLoading={isDeleting}
                            loadingText={t('delete.deleting')}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                            {t('delete.confirmButton')}
                        </Button>
                    </div>
                </div>
            </BaseModal>
        </div>
    );
}
