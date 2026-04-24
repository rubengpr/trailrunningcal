'use client';

import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RaceManagementList } from '@/components/race/race-management-list';
import type { TrailRace } from '@/types/race.types';

interface AdminRacesContentProps {
    races: TrailRace[];
}

export function AdminRacesContent({ races }: AdminRacesContentProps) {
    const t = useTranslations('admin.races.table');
    const locale = useLocale();
    const router = useRouter();

    const handleRaceClick = (raceId: string) => {
        router.push(`/${locale}/admin/carreras/${raceId}`);
    };

    return (
        <RaceManagementList
            races={races}
            onRaceClick={handleRaceClick}
            labels={{
                name: t('name'),
                date: t('date'),
                distance: t('distance'),
                price: t('price'),
            }}
            headerTitle={t('title')}
            headerSubtitle={
                races.length === 1
                    ? t('raceCountOne')
                    : t('raceCount', { count: races.length })
            }
            headerAction={
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => router.push(`/${locale}/admin/carreras/scrape`)}>
                        {t('scrapeButton')}
                    </Button>
                    <Button onClick={() => router.push(`/${locale}/admin/carreras/new`)}>
                        {t('newRaceButton')}
                    </Button>
                </div>
            }
        />
    );
}
