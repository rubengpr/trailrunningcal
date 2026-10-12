'use client';
import { useEffect, useRef, useState } from 'react';

export function usePolledResource<T>(initial: T, load: (signal: AbortSignal) => Promise<T>, isPending: (value: T) => boolean) {
  const [data, setData] = useState(initial);
  const [readFailed, setReadFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pending = isPending(data);
  const sequence = useRef(0);
  useEffect(() => { sequence.current += 1; setData(initial); setReadFailed(false); }, [initial]);
  useEffect(() => {
    let mounted = true;
    let active: AbortController | null = null;
    async function refresh() {
      if (active) return;
      const request = new AbortController();
      const version = sequence.current;
      active = request;
      try {
        const value = await load(request.signal);
        if (mounted && !request.signal.aborted && version === sequence.current) {
          setData(value); setReadFailed(false);
        }
      } catch {
        if (mounted && !request.signal.aborted) setReadFailed(true);
      } finally { active = null; }
    }
    const timer = pending ? setInterval(() => { setNow(Date.now()); void refresh(); }, 3000) : null;
    const focus = () => { setNow(Date.now()); void refresh(); };
    window.addEventListener('focus', focus);
    return () => {
      mounted = false; active?.abort();
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [load, pending, initial]);
  function update(value: T) { sequence.current += 1; setData(value); }
  return { data, update, readFailed, now };
}
