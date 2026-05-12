export function formatDurationMs(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = safe / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}m ${String(seconds).padStart(2, '0')} s`;
}
