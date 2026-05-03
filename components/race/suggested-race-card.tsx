'use client';

import { useState } from 'react';
import { X, CheckCircle2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TrailRace } from '@/types/trail-race-agent.types';

function RejectIcon({ className = 'h-6 w-6' }: { className?: string }) {
    return <X className={className} strokeWidth={1.5} />;
}

function AcceptIcon({ className = 'h-6 w-6' }: { className?: string }) {
    return <CheckCircle2 className={className} strokeWidth={1.5} />;
}

function EditIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return <Pencil className={className} strokeWidth={1.5} />;
}

interface SuggestedRaceCardProps {
    race: TrailRace;
    onAccept: () => Promise<void>;
    isAccepted: boolean;
    isAccepting: boolean;
    isDisabled: boolean;
    onReject: () => void;
    onSave: (race: TrailRace) => void;
}

export function SuggestedRaceCard({ race, onAccept, isAccepted, isAccepting, isDisabled, onReject, onSave }: SuggestedRaceCardProps) {
    const t = useTranslations('admin.races.import.results');

    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<TrailRace>(race);

    const formatDate = (dateStr: string): string => {
        try {
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const handleStartEdit = () => {
        setDraft(race);
        setIsEditing(true);
    };

    const handleSave = () => {
        onSave(draft);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setDraft(race);
        setIsEditing(false);
    };

    const inputClass = 'border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 w-full bg-white';

    const borderClass = isAccepted
        ? 'border-green-300 bg-green-50/30'
        : isEditing
            ? 'border-blue-300 bg-blue-50/20'
            : 'border-gray-200 bg-white';

    if (isEditing) {
        return (
            <div className={`${borderClass} border rounded-lg p-4 shadow-sm flex flex-col gap-4`}>
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">{t('editFieldName')}</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={draft.name}
                            onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">{t('editFieldDate')}</label>
                            <input
                                type="date"
                                className={inputClass}
                                value={draft.date}
                                onChange={(e) => setDraft(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">{t('editFieldDistance')}</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                className={inputClass}
                                value={draft.distanceKm}
                                onChange={(e) => setDraft(prev => ({ ...prev, distanceKm: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">{t('editFieldElevation')}</label>
                            <input
                                type="number"
                                min="0"
                                className={inputClass}
                                value={draft.elevationGainM ?? ''}
                                onChange={(e) => setDraft(prev => ({ ...prev, elevationGainM: e.target.value === '' ? null : parseInt(e.target.value, 10) || 0 }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">{t('editFieldCity')}</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={draft.city}
                                onChange={(e) => setDraft(prev => ({ ...prev, city: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">{t('editFieldProvince')}</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={draft.province}
                                onChange={(e) => setDraft(prev => ({ ...prev, province: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">{t('editFieldDescription')}</label>
                        <textarea
                            rows={5}
                            className={`${inputClass} resize-y`}
                            value={draft.description}
                            onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 transition-colors focus:outline-none cursor-pointer"
                    >
                        {t('editCancelButton')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors focus:outline-none cursor-pointer"
                    >
                        {t('editSaveButton')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`${borderClass} border rounded-lg p-4 shadow-sm flex flex-col gap-3`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight">{race.name}</h3>
                    <p className="text-xs text-gray-500">{formatDate(race.date)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                    {isAccepted ? (
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                            {t('accepted')}
                        </span>
                    ) : (
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                onClick={onReject}
                                disabled={isDisabled || isAccepting}
                                title={t('rejectButton')}
                                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-1.5 text-red-600 transition-colors hover:text-red-800 focus:outline-none disabled:pointer-events-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                                <RejectIcon />
                            </button>
                            <button
                                type="button"
                                onClick={handleStartEdit}
                                disabled={isDisabled || isAccepting}
                                title={t('editButton')}
                                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-1.5 text-gray-500 transition-colors hover:text-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                                <EditIcon />
                            </button>
                            <button
                                type="button"
                                onClick={onAccept}
                                disabled={isDisabled || isAccepting}
                                title={t('acceptButton')}
                                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-1.5 text-green-700 transition-colors hover:text-green-900 focus:outline-none disabled:pointer-events-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {isAccepting ? (
                                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-green-700/25 border-t-green-700" />
                                ) : (
                                    <AcceptIcon />
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {race.distanceKm} km
                </span>
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    {race.elevationGainM != null ? `${race.elevationGainM} m+` : t('elevationNotAvailable')}
                </span>
            </div>
            <p className="text-xs text-gray-500">
                {race.city}, {race.province}
            </p>
            <div className="text-sm text-gray-600 leading-relaxed flex flex-col gap-2">
                {race.description.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                ))}
            </div>
        </div>
    );
}
