import { defineBackground } from 'wxt/sandbox';
import type { HammyMessage, BreakTypeId } from '@/types';
import { BREAK_TYPES } from '@/lib/breakTypes';
import {
  getSettings,
  updateSettings,
  getPendingBreak,
  setPendingBreak,
  recordBreakCompleted,
  getNextBreakAt
} from '@/lib/storage';
import {
  BREAK_ALARM_NAME,
  scheduleNextBreak,
  cancelScheduledBreak,
  getBreakAlarm
} from '@/lib/alarms';

const NOTIFICATION_ID = 'hammy-break-notification';

// Mirrors the content script's own ceiling (see MAX_BREAK_AGE_MS in
// BreakOverlayApp.tsx). Belt-and-suspenders: if a pendingBreak is this
// old, something already failed to clear it — most likely left over
// from an install/reload/extension update while a break was up — so
// every open tab would otherwise show a full-page overlay for a break
// that's long past over.
const MAX_BREAK_AGE_MS = 90_000;

async function clearStalePendingBreak(): Promise<void> {
  const pending = await getPendingBreak();
  if (pending && Date.now() - pending.triggeredAt > MAX_BREAK_AGE_MS) {
    await setPendingBreak(null);
    chrome.notifications.clear(NOTIFICATION_ID);
  }
}

// Chrome only auto-attaches a manifest-declared content script when a tab
// *navigates* (loads/reloads) after that script was registered. A tab that
// was already open before Hammy was installed, or before a dev/update
// reload replaced the extension's JS context, never gets it attached and
// is invisible to Hammy from then on — it has no listener on
// chrome.storage at all. Since a pending break is broadcast globally
// (every tab with the content script reacts to the same storage key),
// that made it look like breaks only ever "belonged" to whichever tab
// happened to load most recently (e.g. YouTube, if that was the last tab
// opened/refreshed) while every other already-open tab — including
// whichever one the person had since switched to — silently never showed
// anything. This walks every currently open tab and attaches the same
// content script + CSS the manifest would have attached on a fresh load,
// so already-open tabs catch up immediately instead of waiting for a
// manual refresh.
async function injectIntoExistingTabs(): Promise<void> {
  const manifest = chrome.runtime.getManifest();
  const declaredScripts = manifest.content_scripts ?? [];
  if (declaredScripts.length === 0) return;

  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || !tab.url) return;
      // Only real web pages are injectable — chrome://, the Chrome Web
      // Store, PDF viewers, other extensions' pages, etc. will reject
      // scripting calls, so these are skipped rather than logged as
      // errors.
      if (!/^https?:\/\//.test(tab.url)) return;

      for (const script of declaredScripts) {
        try {
          if (script.css?.length) {
            await chrome.scripting.insertCSS({
              target: { tabId: tab.id, allFrames: false },
              files: script.css
            });
          }
          if (script.js?.length) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: false },
              files: script.js
            });
          }
        } catch {
          // A handful of tabs are always expected to fail here (browser
          // internal pages, the Web Store, tabs mid-navigation) — that's
          // normal and not worth surfacing, so every other tab still
          // gets injected.
        }
      }
    })
  );
}

export default defineBackground(() => {
  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onInstalled.addListener(async () => {
    const settings = await getSettings();
    // Loading/reloading/updating the extension shouldn't resurrect a
    // break that was left pending from before — clear it if it's stale
    // rather than have it immediately cover every open tab again.
    await clearStalePendingBreak();
    // Back-fill the content script into tabs that were already open —
    // otherwise only tabs that happen to load/refresh *after* install
    // ever see a break, and any tab you'd already had open (including
    // whichever one you switch to) is silently skipped. Safe to run
    // every time: the content script itself no-ops if it's already
    // mounted on that page (see the data-hammy-mounted guard), so this
    // never double-mounts or visibly disturbs a tab that already has it.
    await injectIntoExistingTabs();
    if (settings.enabled) {
      await scheduleNextBreak(settings.intervalMinutes);
    }
  });

  // Fires on every browser startup. chrome.alarms persist across restarts,
  // but if Chrome was closed past the scheduled time, we want the alarm to
  // fire promptly rather than wait — this reconciles that.
  chrome.runtime.onStartup.addListener(async () => {
    await clearStalePendingBreak();
    const settings = await getSettings();
    if (!settings.enabled) return;

    const alarm = await getBreakAlarm();
    const nextBreakAt = await getNextBreakAt();

    if (!alarm && nextBreakAt) {
      const msRemaining = nextBreakAt - Date.now();
      if (msRemaining <= 0) {
        // We were overdue while the browser was closed — fire almost immediately.
        chrome.alarms.create(BREAK_ALARM_NAME, { when: Date.now() + 1500 });
      } else {
        chrome.alarms.create(BREAK_ALARM_NAME, { when: nextBreakAt });
      }
    } else if (!alarm && !nextBreakAt) {
      await scheduleNextBreak(settings.intervalMinutes);
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Alarm -> trigger a break                                           */
  /* ------------------------------------------------------------------ */

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== BREAK_ALARM_NAME) return;
    await triggerBreak();
  });

  async function pickNextBreakTypeId(): Promise<BreakTypeId> {
    const settings = await getSettings();
    const pool = BREAK_TYPES.filter((b) =>
      settings.enabledBreakTypes.includes(b.id)
    );
    const safePool = pool.length > 0 ? pool : BREAK_TYPES;

    if (settings.breakOrder === 'sequential') {
      const index = settings.sequenceCursor % safePool.length;
      await updateSettings({ sequenceCursor: (index + 1) % safePool.length });
      return safePool[index].id;
    }

    const random = safePool[Math.floor(Math.random() * safePool.length)];
    return random.id;
  }

  async function triggerBreak(): Promise<void> {
    const settings = await getSettings();
    if (!settings.enabled) return;

    // Idempotent: don't trigger if a break is already pending
    const existingPending = await getPendingBreak();
    if (existingPending) {
      // A break is already in progress - don't duplicate
      return;
    }

    // Get the currently active tab to target the break to that specific tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const targetTabId = activeTab?.id;

    const breakTypeId = await pickNextBreakTypeId();
    await setPendingBreak({ breakTypeId, triggeredAt: Date.now(), targetTabId });

    const breakType = BREAK_TYPES.find((b) => b.id === breakTypeId)!;

    if (settings.notificationStyle === 'system') {
      chrome.notifications.create(NOTIFICATION_ID, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon-128.png'),
        title: `Hammy: time for a ${breakType.label.toLowerCase()} break 🐹`,
        message: breakType.tagline,
        buttons: [
          { title: 'Start break' },
          { title: `Snooze ${settings.snoozeMinutes}m` }
        ],
        priority: 1,
        silent: !settings.soundEnabled
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Notification interactions                                          */
  /* ------------------------------------------------------------------ */

  // The full-screen break overlay (rendered by the content script on
  // every open tab) already appears the instant `pendingBreak` is set —
  // before this notification is even created. So these handlers just
  // bring the browser to the front and dismiss the notification; they
  // don't need to open anything themselves.
  chrome.notifications.onButtonClicked.addListener(
    async (notifId, buttonIndex) => {
      if (notifId !== NOTIFICATION_ID) return;
      chrome.notifications.clear(NOTIFICATION_ID);
      if (buttonIndex === 0) {
        await focusActiveWindow();
      } else {
        await snoozeBreak();
      }
    }
  );

  chrome.notifications.onClicked.addListener(async (notifId) => {
    if (notifId !== NOTIFICATION_ID) return;
    chrome.notifications.clear(NOTIFICATION_ID);
    await focusActiveWindow();
  });

  async function focusActiveWindow(): Promise<void> {
    const current = await chrome.windows.getLastFocused({
      windowTypes: ['normal']
    });
    if (current?.id !== undefined) {
      chrome.windows.update(current.id, { focused: true });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Messages from popup / options                                      */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onMessage.addListener(
    (message: HammyMessage, sender, sendResponse) => {
      handleMessage(message, sender).then((response) => {
        sendResponse(response);
      });
      return true; // keep the message channel open for the async response
    }
  );

  async function handleMessage(message: HammyMessage, sender: chrome.runtime.MessageSender): Promise<any> {
    switch (message.type) {
      case 'COMPLETE_BREAK':
        await completeBreak();
        return;
      case 'SNOOZE_BREAK':
        await snoozeBreak();
        return;
      case 'DISMISS_BREAK':
        // Idempotent: clearing a null pendingBreak is safe
        await setPendingBreak(null);
        chrome.notifications.clear(NOTIFICATION_ID);
        return;
      case 'START_BREAK_NOW':
        await cancelScheduledBreak();
        await triggerBreak();
        return;
      case 'GET_CURRENT_TAB_ID':
        // Return the tab ID of the sender
        return { tabId: sender.tab?.id };
      case 'SETTINGS_UPDATED': {
        const settings = await getSettings();
        const pending = await getPendingBreak();
        if (!settings.enabled) {
          await cancelScheduledBreak();
        } else if (!pending) {
          // Reschedule from now using the (possibly new) interval.
          await scheduleNextBreak(settings.intervalMinutes);
        }
        return;
      }
      case 'TOGGLE_ENABLED': {
        await updateSettings({ enabled: message.enabled });
        if (message.enabled) {
          await scheduleNextBreak((await getSettings()).intervalMinutes);
        } else {
          await cancelScheduledBreak();
          await setPendingBreak(null);
          chrome.notifications.clear(NOTIFICATION_ID);
        }
        return;
      }
    }
  }

  async function completeBreak(): Promise<void> {
    // Idempotent: only record and proceed if there's actually a pending break
    const pending = await getPendingBreak();
    if (!pending) {
      // Already completed or never existed - just ensure clean state
      chrome.notifications.clear(NOTIFICATION_ID);
      return;
    }

    // Pass the break's triggered timestamp for idempotency
    await recordBreakCompleted(pending.triggeredAt);
    await setPendingBreak(null);
    chrome.notifications.clear(NOTIFICATION_ID);

    const settings = await getSettings();
    if (settings.enabled) {
      await scheduleNextBreak(settings.intervalMinutes);
    }
  }

  async function snoozeBreak(): Promise<void> {
    // Idempotent: only snooze if there's actually a pending break
    const pending = await getPendingBreak();
    if (!pending) {
      // Already completed/dismissed - just ensure clean state
      chrome.notifications.clear(NOTIFICATION_ID);
      return;
    }

    await setPendingBreak(null);
    chrome.notifications.clear(NOTIFICATION_ID);

    const settings = await getSettings();
    if (settings.enabled) {
      await scheduleNextBreak(settings.snoozeMinutes);
    }
  }
});
