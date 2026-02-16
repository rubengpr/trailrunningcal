'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getRaceImageUrls, getRaceImageUrlWithFilename } from '@/lib/race-image-url';
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
        // First, try to get the filename from the API
        const imageStatus = await checkRaceImage(raceId);
        
        if (imageStatus.hasImage && imageStatus.filename && !cancelled) {
          // Use the actual filename from the API
          const url = getRaceImageUrlWithFilename(organizerId, raceId, imageStatus.filename);
          
          // Verify the image exists
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok && !cancelled) {
              setWorkingUrl(url);
              setIsChecking(false);
              return;
            }
          } catch {
            // If the specific filename doesn't work, fall through to fallback
          }
        }
      } catch (error) {
        // If API call fails, fall through to fallback behavior
        console.error('Failed to check race image:', error);
      }
      
      // Fallback: try all possible extensions (backward compatibility)
      if (!cancelled) {
        const imageUrls = getRaceImageUrls(organizerId, raceId);
        for (const url of imageUrls) {
          if (cancelled) return;
          
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok && !cancelled) {
              setWorkingUrl(url);
              setIsChecking(false);
              return;
            }
          } catch {
            // Continue to next URL
          }
        }
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
