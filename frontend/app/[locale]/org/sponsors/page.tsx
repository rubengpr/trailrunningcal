import { createClient } from '@/lib/supabase/server';
import { OrganizerLayout } from '@/components/organizer-layout';
import { InfoBanner } from '@/components/info-banner';
import { sponsors } from '@/data/sponsors';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function OrganizerSponsorsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    const t = await getTranslations('organizer.sponsors');

    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect(`/${locale}/login`);
    }

    const descriptionLocale = locale === 'ca' ? 'ca' : 'es';

    return (
        <OrganizerLayout>
            <div className="flex flex-row mb-6 md:mb-10">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold text-gray-900">
                        Sponsors
                    </h1>
                    <p className="text-sm text-gray-600 max-w-2xl">
                        {t('description')}
                    </p>
                </div>
            </div>

            <InfoBanner className="mb-6 md:mb-8">
                {t('bannerNoteText')}
            </InfoBanner>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {sponsors.map((sponsor) => (
                    <article
                        key={sponsor.name}
                        className="flex h-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 hover:shadow-md transition-colors"
                    >
                        <div className="flex items-center justify-center w-full h-16 sm:h-20 px-4">
                            <div className="relative w-full h-full max-w-[180px]">
                                <Image
                                    src={sponsor.logo}
                                    alt={sponsor.name}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-base font-semibold text-gray-900">
                                {sponsor.name}
                            </h2>
                            <p className="text-sm leading-relaxed text-gray-600">
                                {sponsor.description[descriptionLocale]}
                            </p>
                        </div>
                        <div className="mt-auto pt-2">
                            <Link
                                href={sponsor.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs font-medium text-gray-900 underline underline-offset-4 hover:text-black"
                            >
                                Visitar sitio web
                                <span className="ml-1 text-gray-500">
                                    →
                                </span>
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </OrganizerLayout>
    );
}

