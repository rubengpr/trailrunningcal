'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { BaseModal } from '@/components/ui/base-modal';
import { addPendingRaces, deletePendingRace } from '@/lib/api/pending-races';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import { CornerDownLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { PendingRaceEntry } from '@/types/pending-race.types';
import type { SkippedPendingRace } from '@/lib/api/pending-races';

interface AdminPendingRacesContentProps {
    entries: PendingRaceEntry[];
}

export function AdminPendingRacesContent({ entries }: AdminPendingRacesContentProps) {
    const t = useTranslations('admin.races.queue');
    const locale = useLocale();

    const [urlsText, setUrlsText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingEntries, setPendingEntries] = useState<PendingRaceEntry[]>(entries);
    const [skippedEntries, setSkippedEntries] = useState<SkippedPendingRace[]>([]);
    const [entryToDelete, setEntryToDelete] = useState<PendingRaceEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatDate = (dateString: string): string =>
        locale === 'ca'
            ? formatDateToCatalan(dateString)
            : formatDateToSpanish(dateString);

    const handleDeleteConfirm = async () => {
        if (!entryToDelete || isDeleting) return;

        setIsDeleting(true);
        try {
            await deletePendingRace(entryToDelete.id);
            setPendingEntries((prev) => prev.filter((e) => e.id !== entryToDelete.id));
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
            const result = await addPendingRaces(urls);
            if (result.added.length > 0) {
                setPendingEntries((prev) => [...result.added, ...prev]);
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
                    pendingEntries.length === 1
                        ? t('entryCountOne')
                        : t('entryCount', { count: pendingEntries.length })
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
                            <CornerDownLeft size={16} />
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
                            <ChevronRight size={14} className="transition-transform group-open:rotate-90 shrink-0 text-gray-400" />
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

            {pendingEntries.length === 0 ? (
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
                                {pendingEntries.map((entry) => (
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
                                                <Trash2 className="size-4" strokeWidth={1.5} />
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
