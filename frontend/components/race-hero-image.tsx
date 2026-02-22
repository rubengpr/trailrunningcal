'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getRaceImageUrlWithFilename } from '@/lib/race-image-url';
import { checkRaceImage } from '@/lib/api/race-image';

interface RaceHeroImageProps {
  organizerId: string;
  raceId: string;
  alt: string;
}

export function RaceHeroImage({ organizerId, raceId, alt }: RaceHeroImageProps) {
  const [workingUrl, setWorkingUrl] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function findWorkingImage() {
      try {
        const imageStatus = await checkRaceImage(raceId);

        if (imageStatus.hasImage && imageStatus.imageUrl && !cancelled) {
          setWorkingUrl(imageStatus.imageUrl);
          setIsChecking(false);
          return;
        }

        if (imageStatus.hasImage && imageStatus.filename && !cancelled) {
          const url = getRaceImageUrlWithFilename(organizerId, raceId, imageStatus.filename);
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok && !cancelled) {
              setWorkingUrl(url);
              setIsChecking(false);
              return;
            }
          } catch {
            // Fall through
          }
        }
      } catch (error) {
        console.error('Failed to check race image:', error);
      }

      if (!cancelled) {
        setIsChecking(false);
      }
    }

    findWorkingImage();

    return () => {
      cancelled = true;
    };
  }, [organizerId, raceId]);

  if (isChecking || !workingUrl) {
    return null;
  }

  return (
    <div className="mt-6 sm:mt-8 w-full relative aspect-video sm:aspect-21/9 lg:aspect-16/7 rounded-lg overflow-hidden">
      <Image
        src={workingUrl}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1200px"
      />
    </div>
  );
}
