'use client';

import type { OrganizerPublic } from '@/types/organizer.types';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { FacebookIcon, InstagramIcon, YouTubeIcon, TikTokIcon } from '@/components/icons/brand-icons';

type SocialKey = 'facebook' | 'instagram' | 'youtube' | 'tiktok';

const SOCIAL_ICONS: Record<SocialKey, (className: string) => React.ReactNode> = {
  facebook: (className) => <FacebookIcon className={className} />,
  instagram: (className) => <InstagramIcon className={className} />,
  youtube: (className) => <YouTubeIcon className={className} />,
  tiktok: (className) => <TikTokIcon className={className} />,
};

interface RaceOrganizerLinksProps {
  organizer: OrganizerPublic;
  raceId?: string;
  raceSlug?: string;
}

function hasAnySocialUrl(organizer: OrganizerPublic): boolean {
  return !!(
    organizer.facebookUrl?.trim() ||
    organizer.instagramUrl?.trim() ||
    organizer.youtubeUrl?.trim() ||
    organizer.tiktokUrl?.trim()
  );
}

export default function RaceOrganizerLinks({
  organizer,
  raceId,
  raceSlug,
}: RaceOrganizerLinksProps) {
  if (!hasAnySocialUrl(organizer)) {
    return null;
  }

  const links: { url: string; key: SocialKey }[] = [];
  if (organizer.facebookUrl?.trim()) {
    links.push({ url: organizer.facebookUrl.trim(), key: 'facebook' });
  }
  if (organizer.instagramUrl?.trim()) {
    links.push({ url: organizer.instagramUrl.trim(), key: 'instagram' });
  }
  if (organizer.youtubeUrl?.trim()) {
    links.push({ url: organizer.youtubeUrl.trim(), key: 'youtube' });
  }
  if (organizer.tiktokUrl?.trim()) {
    links.push({ url: organizer.tiktokUrl.trim(), key: 'tiktok' });
  }

  const handleSocialClick = (platform: SocialKey) => {
    track(ANALYTICS_EVENTS.RACE_ORGANIZER_SOCIAL_CLICKED, {
      platform,
      ...(organizer.name && { organizer_name: organizer.name }),
      ...(raceId && { race_id: raceId }),
      ...(raceSlug && { race_slug: raceSlug }),
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map(({ url, key }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={key.charAt(0).toUpperCase() + key.slice(1)}
          className="min-h-[36px] min-w-[36px] p-1.5 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none transition-colors cursor-pointer"
          onClick={() => handleSocialClick(key)}
        >
          {SOCIAL_ICONS[key]('w-4 h-4')}
        </a>
      ))}
    </div>
  );
}
