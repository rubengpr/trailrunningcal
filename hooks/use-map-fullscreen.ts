'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const NORMAL_HOST_CLASS = 'event-track-map-portal h-full w-full';

interface SavedStyles {
  body: {
    left: string;
    overflow: string;
    position: string;
    right: string;
    top: string;
    width: string;
  };
  html: {
    overflow: string;
    overscrollBehavior: string;
    scrollBehavior: string;
  };
}

function scheduleResize(onResize: () => void): () => void {
  let secondFrameId: number | null = null;
  const firstFrameId = window.requestAnimationFrame(() => {
    secondFrameId = window.requestAnimationFrame(onResize);
  });

  return () => {
    window.cancelAnimationFrame(firstFrameId);
    if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
  };
}

function saveStyles(): SavedStyles {
  return {
    body: {
      left: document.body.style.left,
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      right: document.body.style.right,
      top: document.body.style.top,
      width: document.body.style.width,
    },
    html: {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
      scrollBehavior: document.documentElement.style.scrollBehavior,
    },
  };
}

function restoreStyles(styles: SavedStyles, scrollY: number): void {
  Object.assign(document.body.style, styles.body);
  Object.assign(document.documentElement.style, styles.html, {
    scrollBehavior: 'auto',
  });
  window.scrollTo(0, scrollY);
  document.documentElement.style.scrollBehavior = styles.html.scrollBehavior;
}

function moveHost(host: HTMLDivElement, target: HTMLElement): void {
  const activeElement =
    document.activeElement instanceof HTMLElement &&
    host.contains(document.activeElement)
      ? document.activeElement
      : null;
  target.append(host);
  activeElement?.focus({ preventScroll: true });
}

export function useMapFullscreen(onResize: () => void) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portalHost] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const host = document.createElement('div');
    host.className = NORMAL_HOST_CLASS;
    host.dataset.eventTrackMapPortal = '';
    return host;
  });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !portalHost) return;
    anchor.append(portalHost);
    const cancelResize = scheduleResize(onResize);

    return () => {
      cancelResize();
      portalHost.remove();
    };
  }, [onResize, portalHost]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !portalHost || !isFullscreen) return;

    const scrollY = window.scrollY;
    const styles = saveStyles();
    let cancelViewportResize: () => void = () => undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    const handleViewportChange = () => {
      cancelViewportResize();
      cancelViewportResize = scheduleResize(onResize);
    };

    moveHost(portalHost, document.body);
    Object.assign(document.body.style, {
      left: '0',
      overflow: 'hidden',
      position: 'fixed',
      right: '0',
      top: `-${scrollY}px`,
      width: '100%',
    });
    Object.assign(document.documentElement.style, {
      overflow: 'hidden',
      overscrollBehavior: 'none',
    });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    const cancelResize = scheduleResize(onResize);

    return () => {
      cancelResize();
      cancelViewportResize();
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (anchor.isConnected) moveHost(portalHost, anchor);
      restoreStyles(styles, scrollY);
      scheduleResize(onResize);
    };
  }, [isFullscreen, onResize, portalHost]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((current) => !current);
  }, []);

  return {
    anchorRef,
    isFullscreen,
    portalHost,
    toggleFullscreen,
  };
}
