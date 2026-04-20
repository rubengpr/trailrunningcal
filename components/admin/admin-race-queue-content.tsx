'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { BaseModal } from '@/components/ui/base-modal';
import { addRacesToQueue, deleteRaceFromQueue } from '@/lib/api/race-queue';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import type { RaceQueueEntry } from '@/types/race-queue.types';
import type { SkippedQueueEntry } from '@/lib/api/race-queue';

interface AdminRaceQueueContentProps {
    entries: RaceQueueEntry[];
}

export function AdminRaceQueueContent({ entries }: AdminRaceQueueContentProps) {
    const t = useTranslations('admin.races.queue');
    const locale = useLocale();

    const [urlsText, setUrlsText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [queueEntries, setQueueEntries] = useState<RaceQueueEntry[]>(entries);
    const [skippedEntries, setSkippedEntries] = useState<SkippedQueueEntry[]>([]);
    const [entryToDelete, setEntryToDelete] = useState<RaceQueueEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatDate = (dateString: string): string =>
        locale === 'ca'
            ? formatDateToCatalan(dateString)
            : formatDateToSpanish(dateString);

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
        const urls = urlsText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        if (urls.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        setSkippedEntries([]);
        try {
            const result = await addRacesToQueue(urls);
            if (result.added.length > 0) {
                setQueueEntries((prev) => [...result.added, ...prev]);
                setUrlsText('');
                const message = result.skipped.length > 0
                    ? t('addPartialSuccess', { added: result.added.length, skipped: result.skipped.length })
                    : t('addSuccess', { count: result.added.length });
                toast.success(message);
            } else {
                toast.error(t('addNoneAdded'));
            }
            if (result.skipped.length > 0) {
                setSkippedEntries(result.skipped);
            }
        } catch {
            toast.error(t('addError'));
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
                className="max-w-3xl"
            >
                <div className="grid gap-2 max-w-md">
                    <label htmlFor="queueUrl" className="text-sm font-medium leading-none">
                        {t('urlLabel')}
                    </label>
                    <div className="relative">
                        <textarea
                            id="queueUrl"
                            rows={4}
                            value={urlsText}
                            onChange={(e) => setUrlsText(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pb-8 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        />
                        <button
                            type="submit"
                            disabled={!urlsText.trim() || isSubmitting}
                            title={t('addButton')}
                            className="absolute bottom-2 right-2 flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
                                <path d="m9 10-5 5 5 5"/>
                            </svg>
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">
                        {urlsText.split('\n').map((l) => l.trim()).filter(Boolean).length} URLs
                    </p>
                </div>
            </form>

            {skippedEntries.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <details className="group">
                        <summary className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 marker:content-none list-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90 shrink-0 text-gray-400">
                                <path d="m9 18 6-6-6-6"/>
                            </svg>
                            {t('skipped.title', { count: skippedEntries.length })}
                        </summary>
                        <ul className="mt-4 flex flex-col gap-3 pl-5">
                            {Object.entries(
                                skippedEntries.reduce<Record<string, string[]>>((acc, entry) => {
                                    (acc[entry.reason] ??= []).push(entry.url);
                                    return acc;
                                }, {}),
                            ).map(([reason, urls]) => (
                                <li key={reason}>
                                    <p className="text-xs font-medium text-gray-500">{t(`skipped.reasons.${reason}`)}</p>
                                    <ul className="mt-1 flex flex-col gap-0.5 pl-3">
                                        {urls.map((url) => (
                                            <li key={url} className="text-xs font-mono text-gray-400 break-all">{url}</li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </details>
                </div>
            )}

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
