import { browser } from 'wxt/browser';
import type { PublicPath } from 'wxt/browser';
import type { BreakType, BreakTypeId } from '@/types';

export const BREAK_TYPES: BreakType[] = [
  {
    id: 'breathe',
    label: 'Breathe',
    tagline: 'In for four, out for four.',
    description:
      'Take four slow, deep breaths with Hammy. It resets your nervous system faster than anything else on this list.',
    video: 'hammy-breathe.webm',
    suggestedSeconds: 10,
    accent: {
      solid: 'bg-sky-500',
      soft: 'bg-sky-50',
      text: 'text-sky-600',
      ring: 'ring-sky-300'
    }
  },
  {
    id: 'posture',
    label: 'Posture Check',
    tagline: 'Shoulders back, chin level.',
    description:
      'Roll your shoulders back, lengthen your spine, and unclench your jaw. Your future self will thank you.',
    video: 'hammy-posture.webm',
    suggestedSeconds: 10,
    accent: {
      solid: 'bg-violet-500',
      soft: 'bg-violet-50',
      text: 'text-violet-600',
      ring: 'ring-violet-300'
    }
  },
  {
    id: 'eye-break',
    label: 'Eye Break',
    tagline: 'Look 20 feet away for 20 seconds.',
    description:
      'The 20-20-20 rule: look at something 20 feet away for 20 seconds. Let your eyes stop focusing up close.',
    video: 'hammy-eye-break.webm',
    suggestedSeconds: 10,
    accent: {
      solid: 'bg-emerald-500',
      soft: 'bg-emerald-50',
      text: 'text-emerald-600',
      ring: 'ring-emerald-300'
    }
  },
  {
    id: 'drink-water',
    label: 'Drink Water',
    tagline: 'A little sip goes a long way.',
    description:
      "Grab your glass and take a few sips. Dehydration is a sneaky cause of afternoon brain fog.",
    video: 'hammy-drink-water.webm',
    suggestedSeconds: 10,
    accent: {
      solid: 'bg-cyan-500',
      soft: 'bg-cyan-50',
      text: 'text-cyan-600',
      ring: 'ring-cyan-300'
    }
  },
  {
    id: 'stretch',
    label: 'Stretch',
    tagline: 'Reach up, then side to side.',
    description:
      'Stand up if you can. Reach for the ceiling, then gently stretch side to side. Let your body move.',
    video: 'hammy-stretch.webm',
    suggestedSeconds: 10,
    accent: {
      solid: 'bg-amber-500',
      soft: 'bg-amber-50',
      text: 'text-amber-600',
      ring: 'ring-amber-300'
    }
  }
];
export const BREAK_TYPE_MAP: Record<BreakTypeId, BreakType> = BREAK_TYPES.reduce(
  (acc, bt) => {
    acc[bt.id] = bt;
    return acc;
  },
  {} as Record<BreakTypeId, BreakType>
);
export function getBreakType(id: BreakTypeId): BreakType {
  return BREAK_TYPE_MAP[id];
}

export function getVideoUrl(breakType: BreakType): string {

  return browser.runtime.getURL(`/videos/${breakType.video}` as PublicPath);
}