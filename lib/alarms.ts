import type { Alarms } from 'wxt/browser';
import { browser } from 'wxt/browser';
import { setNextBreakAt, setBreakDueSince } from './storage';

export const BREAK_ALARM_NAME = 'hammy-break-alarm';

export const TYPING_RECHECK_ALARM_NAME = 'hammy-typing-recheck-alarm';
export async function scheduleNextBreak(minutes: number): Promise<number> {
  await browser.alarms.clear(BREAK_ALARM_NAME);
  await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);
  await setBreakDueSince(null);
  const when = Date.now() + minutes * 60_000;
  await browser.alarms.create(BREAK_ALARM_NAME, { when });
  await setNextBreakAt(when);
  return when;
}
export async function cancelScheduledBreak(): Promise<void> {
  await browser.alarms.clear(BREAK_ALARM_NAME);
  await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);
  await setNextBreakAt(null);
  await setBreakDueSince(null);
}
export async function getBreakAlarm(): Promise<Alarms.Alarm | undefined> {
  return browser.alarms.get(BREAK_ALARM_NAME);
}