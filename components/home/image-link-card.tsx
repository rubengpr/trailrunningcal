'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import posthog from 'posthog-js';

interface ImageLinkCardProps {
  href: string;
  label: string;
  imageSrc?: string;
  captureEvent?: string;
  captureProperties?: Record<string, unknown>;
}

export default function ImageLinkCard({
  href,
  label,
  imageSrc,
  captureEvent,
  captureProperties,
}: ImageLinkCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleClick = () => {
    if (captureEvent) {
      posthog.capture(captureEvent, captureProperties ?? {});
    }
  };

  return (
    <Link
      href={href}
      className="w-full lg:flex-1 border border-gray-200 rounded-lg overflow-hidden block"
      onClick={captureEvent ? handleClick : undefined}
    >
      <div className="relative h-32 w-full bg-gray-100">
        {imageSrc && !isLoaded && (
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-100 animate-pulse" />
        )}
        {imageSrc && (
          <Image
            src={imageSrc}
            alt={label}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 400px"
            onLoad={() => setIsLoaded(true)}
          />
        )}
      </div>
      <div className="p-3">
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
    </Link>
  );
}
