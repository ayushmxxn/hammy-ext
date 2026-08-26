import { sendToBackground } from './messaging';

export const TYPING_IDLE_MS = 10_000;
export const MAX_TYPING_DELAY_MS = 5 * 60_000;

const PING_THROTTLE_MS = 2_000;
const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'range',
  'button',
  'submit',
  'reset',
  'file',
  'color',
  'image'
]);
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'TEXTAREA') return true;
  if (target.tagName === 'INPUT') {
    return !NON_TEXT_INPUT_TYPES.has((target as HTMLInputElement).type);
  }
  return target.isContentEditable;
}
export function watchForTyping(): () => void {
  let lastPingAt = 0;
  const onPossibleTyping = (event: Event) => {
    if (!isEditableTarget(event.target)) return;
    const now = Date.now();
    if (now - lastPingAt < PING_THROTTLE_MS) return;
    lastPingAt = now;
    sendToBackground({ type: 'USER_TYPING' });
  };
  document.addEventListener('input', onPossibleTyping, {
    capture: true,
    passive: true
  });
  document.addEventListener('keydown', onPossibleTyping, {
    capture: true,
    passive: true
  });
  return () => {
    document.removeEventListener('input', onPossibleTyping, {
      capture: true
    } as EventListenerOptions);
    document.removeEventListener('keydown', onPossibleTyping, {
      capture: true
    } as EventListenerOptions);
  };
}