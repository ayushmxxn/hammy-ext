import { useEffect, useRef, useState } from 'react';
import type { BreakType } from '@/types';
import { getVideoUrl } from '@/lib/breakTypes';

interface HammyVideoProps {
  breakType: BreakType;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  rounded?: string;
  onEnded?: () => void;
}

/**
 * Plays one of Hammy's five looping break animations. Handles its own
 * loading state, respects prefers-reduced-motion, and degrades
 * gracefully (no layout shift) while the clip loads.
 */
export default function HammyVideo({
  breakType,
  autoPlay = true,
  loop = true,
  muted = true,
  className = '',
  rounded = 'rounded-3xl',
  onEnded
}: HammyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setIsLoaded(false);

    if (prefersReducedMotion) {
      video.pause();
    } else if (autoPlay) {
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => void 0);
    }
  }, [breakType.id, autoPlay, prefersReducedMotion]);

  return (
    <div
      className={`relative overflow-hidden ${rounded} bg-gradient-to-b from-hammy-100 to-hammy-50 ${className}`}
    >
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-hammy-100"
        >
          <div className="h-12 w-12 animate-breathe rounded-full bg-hammy-300/60" />
        </div>
      )}
      <video
        ref={videoRef}
        src={getVideoUrl(breakType)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        autoPlay={autoPlay && !prefersReducedMotion}
        loop={loop}
        muted={muted}
        playsInline
        disablePictureInPicture
        preload="auto"
        aria-label={`Hammy the hamster demonstrating a ${breakType.label.toLowerCase()} break`}
        onLoadedData={() => setIsLoaded(true)}
        onEnded={onEnded}
      />
    </div>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}
