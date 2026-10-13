'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';

export function usePolledResource<T>(initial: T, load: (signal: AbortSignal) => Promise<T>, isPending: (value: T) => boolean) {
  const [data, setData] = useState(initial);
  const [readFailed, setReadFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const current = useRef(initial);
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const pending = isPending(data);

  const update = useCallback((action: SetStateAction<T>): T => {
    sequence.current += 1;
    active.current?.abort();
    active.current = null;
    const value = typeof action === 'function' ? (action as (previous: T) => T)(current.current) : action;
    current.current = value;
    setData(value);
    return value;
  }, []);

  useEffect(() => { update(initial); setReadFailed(false); }, [initial, update]);

  const refresh = useCallback(async () => {
    if (active.current) return;
    const request = new AbortController();
    const version = sequence.current;
    active.current = request;
    try {
      const value = await load(request.signal);
      if (!request.signal.aborted && version === sequence.current) {
        current.current = value;
        setData(value); setReadFailed(false);
      }
    } catch {
      if (!request.signal.aborted && version === sequence.current) setReadFailed(true);
    } finally { if (active.current === request) active.current = null; }
  }, [load]);

  useEffect(() => {
    const timer = pending ? setInterval(() => { setNow(Date.now()); void refresh(); }, 3000) : null;
    const focus = () => { setNow(Date.now()); void refresh(); };
    window.addEventListener('focus', focus);
    return () => {
      active.current?.abort(); active.current = null;
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [refresh, pending, initial]);
  return { data, update, refresh, readFailed, now };
}
