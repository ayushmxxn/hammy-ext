import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/format';

interface TimerProps {
  targetTimestamp: number;
  className?: string;
  onReachZero?: () => void;
}

/** Renders a self-updating "MM:SS" (or "1h 05m") countdown to a target time. */
export default function Timer({
  targetTimestamp,
  className = '',
  onReachZero
}: TimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const msLeft = targetTimestamp - now;

  useEffect(() => {
    if (msLeft <= 0) onReachZero?.();
  }, [msLeft <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={className} aria-live="polite">
      {formatCountdown(msLeft)}
    </span>
  );
}
