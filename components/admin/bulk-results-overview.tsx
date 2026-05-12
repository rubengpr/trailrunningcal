'use client';

import { useState } from 'react';
import { X, CheckCircle2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TrailRace } from '@/types/trail-race-agent.types';
import { formatDateShort } from '@/lib/date-utils';
import { cleanUrl } from '@/lib/url-utils';

export interface BulkResultItem {
    url: string;
    races: TrailRace[];
}

interface BulkResultsOverviewProps {
    items: BulkResultItem[];
    onAccept: (url: string, raceIndex: number, race: TrailRace) => Promise<void>;
}

function ResultCard({ item, onAccept }: { item: BulkResultItem; onAccept: (raceIndex: number, race: TrailRace) => Promise<void> }) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [acceptedIndexes, setAcceptedIndexes] = useState<Set<number>>(new Set());
    const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);
    const [rejectedIndexes, setRejectedIndexes] = useState<Set<number>>(new Set());
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedRaces, setEditedRaces] = useState<Map<number, TrailRace>>(new Map());

    const visibleRaces = item.races
        .map((race, index) => ({ race: editedRaces.get(index) ?? race, index }))
        .filter(({ index }) => !rejectedIndexes.has(index));

    const handleAccept = async (index: number, race: TrailRace) => {
        setAcceptingIndex(index);
        try {
            await onAccept(index, race);
            setAcceptedIndexes((prev) => new Set(prev).add(index));
        } finally {
            setAcceptingIndex(null);
        }
    };

    const handleReject = (index: number) => {
        setRejectedIndexes((prev) => new Set(prev).add(index));
        setExpandedIndex(null);
    };

    const handleStartEdit = (index: number) => {
        setEditingIndex(index);
        setExpandedIndex(index);
    };

    const handleSave = (index: number, updatedRace: TrailRace) => {
        setEditedRaces((prev) => new Map(prev).set(index, updatedRace));
        setEditingIndex(null);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
    };

    return (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 pb-2">
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-gray-700 hover:underline"
                >
                    {cleanUrl(item.url)}
                </a>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                    {visibleRaces.length}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full table-fixed text-left text-xs">
                    <tbody>
                        {visibleRaces.map(({ race, index }, visibleIdx) => (
                            <RaceRow
                                key={index}
                                race={race}
                                isExpanded={expandedIndex === index}
                                onToggle={() => {
                                    if (editingIndex === index) return;
                                    setExpandedIndex(expandedIndex === index ? null : index);
                                }}
                                isLast={visibleIdx === visibleRaces.length - 1}
                                isAccepted={acceptedIndexes.has(index)}
                                isAccepting={acceptingIndex === index}
                                isDisabled={acceptingIndex !== null && acceptingIndex !== index}
                                isEditing={editingIndex === index}
                                onAccept={() => handleAccept(index, race)}
                                onReject={() => handleReject(index)}
                                onStartEdit={() => handleStartEdit(index)}
                                onSave={(updated) => handleSave(index, updated)}
                                onCancelEdit={handleCancelEdit}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

interface RaceRowProps {
    race: TrailRace;
    isExpanded: boolean;
    onToggle: () => void;
    isLast: boolean;
    isAccepted: boolean;
    isAccepting: boolean;
    isDisabled: boolean;
    isEditing: boolean;
    onAccept: () => void;
    onReject: () => void;
    onStartEdit: () => void;
    onSave: (race: TrailRace) => void;
    onCancelEdit: () => void;
}

function RaceRow({ race, isExpanded, onToggle, isLast, isAccepted, isAccepting, isDisabled, isEditing, onAccept, onReject, onStartEdit, onSave, onCancelEdit }: RaceRowProps) {
    const t = useTranslations('admin.races.import.results');
    const [draft, setDraft] = useState<TrailRace>(race);
    const borderClass = isLast ? '' : 'border-b border-gray-50';
    const rowBg = isAccepted ? 'bg-green-50/40' : '';

    const handleStartEdit = () => {
        setDraft(race);
        onStartEdit();
    };

    const handleSave = () => {
        onSave(draft);
    };

    const handleCancel = () => {
        setDraft(race);
        onCancelEdit();
    };

    const inputClass = 'border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 w-full bg-white';

    return (
        <>
            <tr className={`group/row align-middle cursor-pointer hover:bg-gray-50 ${rowBg}`} onClick={onToggle}>
                <td className={`${borderClass} w-[35%] py-2.5 pr-8 font-medium text-gray-900 ${isExpanded ? 'border-b-0' : ''}`}>
                    {race.name}
                </td>
                <td className={`${borderClass} w-[10%] py-2.5 pr-8 tabular-nums text-gray-500 ${isExpanded ? 'border-b-0' : ''}`}>
                    {formatDateShort(race.date)}
                </td>
                <td className={`${borderClass} w-[25%] py-2.5 pr-8 text-gray-500 ${isExpanded ? 'border-b-0' : ''}`}>
                    {race.city}, {race.province}
                </td>
                <td className={`${borderClass} w-[10%] py-2.5 pr-8 text-right tabular-nums text-gray-700 ${isExpanded ? 'border-b-0' : ''}`}>
                    {race.distanceKm} km
                </td>
                <td className={`${borderClass} w-[10%] py-2.5 pr-4 text-right tabular-nums text-gray-500 ${isExpanded ? 'border-b-0' : ''}`}>
                    {race.elevationGainM != null ? `${race.elevationGainM} m+` : '—'}
                </td>
                <td className={`${borderClass} w-[10%] py-2.5 text-right ${isExpanded ? 'border-b-0' : ''}`} onClick={(e) => e.stopPropagation()}>
                    {isAccepted ? (
                        <span className="inline-flex items-center text-green-600">
                            <CheckCircle2 className="size-4" strokeWidth={2} />
                        </span>
                    ) : (
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={onReject}
                                disabled={isDisabled || isAccepting}
                                title={t('rejectButton')}
                                className="inline-flex size-7 items-center justify-center rounded-full text-red-500 transition-colors hover:text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                            >
                                <X className="size-3.5" strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={handleStartEdit}
                                disabled={isDisabled || isAccepting}
                                title={t('editButton')}
                                className="inline-flex size-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                            >
                                <Pencil className="size-3.5" strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={onAccept}
                                disabled={isDisabled || isAccepting}
                                title={t('acceptButton')}
                                className="inline-flex size-7 items-center justify-center rounded-full text-green-600 transition-colors hover:text-green-800 hover:bg-green-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                            >
                                {isAccepting ? (
                                    <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-green-600/25 border-t-green-600" />
                                ) : (
                                    <CheckCircle2 className="size-3.5" strokeWidth={2} />
                                )}
                            </button>
                        </div>
                    )}
                </td>
            </tr>
            {isExpanded && (
                <tr>
                    <td colSpan={6} className={`${isLast ? '' : 'border-b border-gray-50'} pb-2 pt-0.5`}>
                        {isEditing ? (
                            <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/20 p-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-500">{t('editFieldName')}</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={draft.name}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-medium text-gray-500">{t('editFieldDate')}</label>
                                        <input
                                            type="date"
                                            className={inputClass}
                                            value={draft.date}
                                            onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-medium text-gray-500">{t('editFieldDistance')}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            className={inputClass}
                                            value={draft.distanceKm}
                                            onChange={(e) => setDraft((prev) => ({ ...prev, distanceKm: parseFloat(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-medium text-gray-500">{t('editFieldElevation')}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className={inputClass}
                                            value={draft.elevationGainM ?? ''}
                                            onChange={(e) => setDraft((prev) => ({ ...prev, elevationGainM: e.target.value === '' ? null : parseInt(e.target.value, 10) || 0 }))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-medium text-gray-500">{t('editFieldCity')}</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={draft.city}
                                            onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-medium text-gray-500">{t('editFieldProvince')}</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={draft.province}
                                            onChange={(e) => setDraft((prev) => ({ ...prev, province: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-500">{t('editFieldDescription')}</label>
                                    <textarea
                                        rows={4}
                                        className={`${inputClass} resize-y`}
                                        value={draft.description}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer"
                                    >
                                        {t('editCancelButton')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        className="inline-flex items-center rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-800 cursor-pointer"
                                    >
                                        {t('editSaveButton')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs leading-relaxed text-gray-500">
                                {race.description.split('\n\n').map((paragraph, i) => (
                                    <p key={i} className={i > 0 ? 'mt-1.5' : ''}>{paragraph}</p>
                                ))}
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

export function BulkResultsOverview({ items, onAccept }: BulkResultsOverviewProps) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            {items.map((item) => (
                <ResultCard
                    key={item.url}
                    item={item}
                    onAccept={(raceIndex, race) => onAccept(item.url, raceIndex, race)}
                />
            ))}
        </div>
    );
}
