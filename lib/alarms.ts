import { setNextBreakAt } from './storage';

export const BREAK_ALARM_NAME = 'hammy-break-alarm';

/** Schedules the next break alarm `minutes` from now and persists the ETA. */
export async function scheduleNextBreak(minutes: number): Promise<number> {
  await chrome.alarms.clear(BREAK_ALARM_NAME);
  const when = Date.now() + minutes * 60_000;
  chrome.alarms.create(BREAK_ALARM_NAME, { when });
  await setNextBreakAt(when);
  return when;
}

/** Cancels any scheduled break alarm and clears the stored ETA. */
export async function cancelScheduledBreak(): Promise<void> {
  await chrome.alarms.clear(BREAK_ALARM_NAME);
  await setNextBreakAt(null);
}

export async function getBreakAlarm(): Promise<chrome.alarms.Alarm | undefined> {
  return chrome.alarms.get(BREAK_ALARM_NAME);
}
