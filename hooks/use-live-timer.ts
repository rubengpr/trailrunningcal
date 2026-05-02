import { useEffect, useRef, useState } from 'react';
import type React from 'react';

export function useLiveTimer(isRunning: boolean): {
    elapsedMs: number;
    startedAtRef: React.MutableRefObject<number | null>;
} {
    const startedAtRef = useRef<number | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!isRunning || startedAtRef.current === null) return;
        const tick = (): void => {
            setElapsedMs(Math.round(performance.now() - startedAtRef.current!));
        };
        tick();
        const id = window.setInterval(tick, 100);
        return () => window.clearInterval(id);
    }, [isRunning]);

    return { elapsedMs: isRunning ? elapsedMs : 0, startedAtRef };
}
