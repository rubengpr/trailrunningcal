'use client';

import { useTranslations } from 'next-intl';
import type { TrailRace } from '@/types/trail-race-agent.types';

interface RaceEditFormProps {
    draft: TrailRace;
    onChange: (draft: TrailRace) => void;
    onSave: () => void;
    onCancel: () => void;
    size?: 'sm' | 'md';
}

export function RaceEditForm({ draft, onChange, onSave, onCancel, size = 'md' }: RaceEditFormProps) {
    const t = useTranslations('admin.races.import.results');

    const sm = size === 'sm';
    const inputClass = sm
        ? 'border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 w-full bg-white'
        : 'border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 w-full bg-white';
    const labelClass = sm ? 'text-[11px] font-medium text-gray-500' : 'text-xs font-medium text-gray-600';
    const btnSize = sm ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

    return (
        <>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>{t('editFieldName')}</label>
                    <input
                        type="text"
                        className={inputClass}
                        value={draft.name}
                        onChange={(e) => onChange({ ...draft, name: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>{t('editFieldDate')}</label>
                        <input
                            type="date"
                            className={inputClass}
                            value={draft.date}
                            onChange={(e) => onChange({ ...draft, date: e.target.value })}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>{t('editFieldDistance')}</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            className={inputClass}
                            value={draft.distanceKm}
                            onChange={(e) => onChange({ ...draft, distanceKm: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>{t('editFieldElevation')}</label>
                        <input
                            type="number"
                            min="0"
                            className={inputClass}
                            value={draft.elevationGainM ?? ''}
                            onChange={(e) => onChange({ ...draft, elevationGainM: e.target.value === '' ? null : parseInt(e.target.value, 10) || 0 })}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>{t('editFieldCity')}</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={draft.city}
                            onChange={(e) => onChange({ ...draft, city: e.target.value })}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>{t('editFieldProvince')}</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={draft.province}
                            onChange={(e) => onChange({ ...draft, province: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>{t('editFieldDescription')}</label>
                    <textarea
                        rows={sm ? 4 : 5}
                        className={`${inputClass} resize-y`}
                        value={draft.description}
                        onChange={(e) => onChange({ ...draft, description: e.target.value })}
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className={`inline-flex items-center rounded-md border border-gray-300 bg-white ${btnSize} font-medium text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer`}
                >
                    {t('editCancelButton')}
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    className={`inline-flex items-center rounded-md bg-black ${btnSize} font-medium text-white transition-colors hover:bg-gray-800 cursor-pointer`}
                >
                    {t('editSaveButton')}
                </button>
            </div>
        </>
    );
}
