'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroCtaButtonProps {
  label: string;
}

export function HeroCtaButton({ label }: HeroCtaButtonProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <Button
      href="#calendar"
      shape="pill"
      className="hero-animate gap-2.5 [animation-delay:240ms] group relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setVisible(true); }}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Contour lines revealed by flashlight mask */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: visible ? 1 : 0,
          maskImage: `radial-gradient(circle 32px at ${pos.x}px ${pos.y}px, black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle 32px at ${pos.x}px ${pos.y}px, black 0%, transparent 100%)`,
        }}
      >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 250 250"
        fill="none"
        aria-hidden="true"
        className="absolute w-[220%] h-[220%] -left-[60%] -top-[60%] pointer-events-none"
      >
        <path d="m126.8 38.31c-30.86-0.12-48.06 16.72-70.85 45.33-13.04 16.58-21.61 25.52-35.7 36.1-9.75 7.39-14.27 17.04-14.28 28.64 0.04 10.31 5.51 24.53 21.75 33.8 8.95 5.13 14.95 6.94 23.53 11.01 18.97 9.38 37 17.82 61.19 18.43 24.48-0.28 35.97-7.98 49.11-16.76 11.76-7.87 21.41-12.63 43.7-13.35 15.6-0.08 25.65-4.22 32.44-11.48 6.97-7.46 9.19-19.01 2.2-30.77-7.2-12.08-19.24-17.1-34.45-30.2-20.12-16.61-23.29-25.89-36.4-44.34-10.76-14.77-21.91-26.41-42.24-26.41z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
        <path d="m127.3 46.72c-19.3 0.09-42.55 11.1-59.4 34.43-9.05 12.83-13.82 20.77-28.08 34.46-10.11 10.31-11.53 19.57-8.74 27.8 3.52 8.67 11 13.2 17.69 18.36 8.98 6.79 13.51 14.44 23.33 18.57 11.82 4.98 23.85 5.75 32.03 5.72 16.95-0.45 25.27-5.22 35.52-12.61 9.47-7.34 15.85-11.36 31.25-11.79 10.67-0.35 15.78 1.47 23.69 0.68 11.33-0.93 20.16-7.43 23.09-15.86 2.59-9.36-2.05-18.75-9.54-25.78-11.27-9.89-17.96-16.39-25.24-29.41-12.79-21.1-26.8-44.71-55.6-44.57z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
        <path d="m126.2 56.09c-24.37 0-37.65 12.09-55.17 36.68-7.26 9.92-11.46 15.61-18.95 24.25-6.98 7.94-9.71 16.59-3.15 25.02 5.03 5.93 10.89 8.92 18.1 17.75 6.32 7.49 10.23 12.34 26.34 14.85 11.49 1.74 22.67-0.78 30.57-7.01 10.13-8.22 15.22-16.06 27.12-18.95 9.01-1.87 14.03 1.18 27.07 2.09 10.76 0.94 18-2.41 20.93-8.06 3.69-7.53-0.23-15.82-6.92-25.1-12.18-16.75-15.66-23.14-26.68-40.42-8.72-13.03-16.75-21.1-39.26-21.1z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
        <path d="m126.2 65.61c-16.64-0.05-29.86 11.54-38.03 23.27l-13.43 18.41c-4.1 6.38-4.08 15.48 2 23.79l7.17 10.07c5.25 6.76 11.77 8.91 19.23 8.34 10.56-1.23 16.87-7.38 24.22-14.75 6.9-6.33 13.56-8.76 24.75-11.42 7.49-2.15 13.78-5.61 11.59-14.16-1.04-4.6-3.93-8.94-6.09-13.4-7.23-15.36-11.02-29.69-31.41-30.15z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
        <path d="m124.2 75.88c-17.9-0.45-34.09 19.93-38.99 34.84-2.97 8.51 2.6 18.36 8.7 23.07 6.24 4.49 15.98 2.3 24.16-5.19 6.8-6.23 11.74-9.32 21.27-15.4 5.86-4.19 8.05-8.41 6.96-14.39-2.34-11.06-8.21-22.63-22.1-22.93z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
        <path d="m122 87.16c-11.18-0.07-22.76 12.23-24.89 22.63-1.57 6.35 1.64 11.73 8.31 11.93 6.73-0.45 12.76-5.07 20.62-11.81 4.61-4.03 7.9-9.22 6.45-14.3-1.45-5.69-5.28-8.45-10.49-8.45z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
        <path d="m26.78 118.8c-7.66 8.4-10.85 16.2-9.99 26.26 1.17 10.85 8.11 19.15 20.37 24.99 8.28 4.03 10.66 6.1 16.56 10.49 11.7 8.59 34 18.04 55.09 18.36 20.97 0 33.33-7.53 43.58-15.57 8.92-7.13 14.69-11.15 34.51-12.02 11.49-0.25 21.46 0.21 30.89-5.29 9.85-6 13.86-15.22 12.9-20.91-0.9-9.01-3.87-14.3-9.52-20.68" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
      </svg>
      </div>

      <Calendar size={17} strokeWidth={2.5} aria-hidden="true" className="relative" />

      <span className="relative">{label}</span>
    </Button>
  );
}
