import { useEffect, useState } from 'react';
import type { BreakType } from '@/types';
import HammyVideo from './HammyVideo';
import { formatShortCountdown } from '@/lib/format';

interface BreakCardProps {
  breakType: BreakType;
  onComplete: () => void;
  onSnooze: () => void;
  snoozeMinutes: number;
}

export default function BreakCard({
  breakType,
  onComplete,
  onSnooze,
  snoozeMinutes
}: BreakCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(breakType.suggestedSeconds);

  useEffect(() => {
    setSecondsLeft(breakType.suggestedSeconds);
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [breakType.id]);

  const isReady = secondsLeft === 0;

  return (
    <div className="animate-pop-in flex flex-col gap-4">
      <div
        className={`flex items-center justify-between rounded-2xl ${breakType.accent.soft} px-4 py-3`}
      >
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${breakType.accent.text}`}>
            Break time
          </p>
          <h2 className="text-lg font-extrabold text-hammy-ink">
            {breakType.label}
          </h2>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${breakType.accent.solid} text-sm font-bold text-white shadow-sm`}
          aria-hidden="true"
        >
          {isReady ? '✓' : formatShortCountdown(secondsLeft)}
        </div>
      </div>

      <HammyVideo
        breakType={breakType}
        className="aspect-square w-full shadow-inner"
      />

      <p className="text-center text-sm leading-relaxed text-hammy-ink/80">
        {breakType.description}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onSnooze}
          className="flex-1 rounded-xl border border-hammy-200 bg-white px-4 py-2.5 text-sm font-semibold text-hammy-700 transition-all duration-150 hover:bg-hammy-50 active:scale-95"
        >
          Snooze {snoozeMinutes}m
        </button>
        <button
          onClick={onComplete}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 active:scale-95 ${breakType.accent.solid} hover:brightness-110`}
        >
          Done ✓
        </button>
      </div>
    </div>
  );
}
