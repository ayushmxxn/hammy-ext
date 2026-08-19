/** Formats milliseconds-until as a friendly "12:34" or "1h 05m" string. */
export function formatCountdown(msUntil: number): string {
  const totalSeconds = Math.max(0, Math.round(msUntil / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatShortCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.round(secondsLeft));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
