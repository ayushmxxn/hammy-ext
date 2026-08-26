import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import type { Runtime, Notifications, Windows, PublicPath } from 'wxt/browser';
import type { HammyMessage, BreakTypeId } from '@/types';
import { BREAK_TYPES } from '@/lib/breakTypes';
import {
  getSettings,
  updateSettings,
  getPendingBreak,
  setPendingBreak,
  recordBreakCompleted,
  getNextBreakAt,
  getBreakDueSince,
  setBreakDueSince
} from '@/lib/storage';
import {
  BREAK_ALARM_NAME,
  TYPING_RECHECK_ALARM_NAME,
  scheduleNextBreak,
  cancelScheduledBreak,
  getBreakAlarm
} from '@/lib/alarms';
import { isUrlExcluded } from '@/lib/exclusions';
import { TYPING_IDLE_MS, MAX_TYPING_DELAY_MS } from '@/lib/typing';

const TYPING_RECHECK_INTERVAL_MS = 5_000;

const lastTypingByTab = new Map<number, number>();

const NOTIFICATION_ID = 'hammy-break-notification';

const MAX_BREAK_AGE_MS = 90_000;

async function clearStalePendingBreak(): Promise<void> {
  const pending = await getPendingBreak();
  if (pending && Date.now() - pending.triggeredAt > MAX_BREAK_AGE_MS) {
    await setPendingBreak(null);
    browser.notifications.clear(NOTIFICATION_ID);
  }
}

async function injectIntoExistingTabs(): Promise<void> {
  const manifest = browser.runtime.getManifest();
  const declaredScripts = manifest.content_scripts ?? [];
  if (declaredScripts.length === 0) return;

  const tabs = await browser.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || !tab.url) return;
      if (!/^https?:\/\//.test(tab.url)) return;

      for (const script of declaredScripts) {
        try {
          if (script.css?.length) {
            await browser.scripting.insertCSS({
              target: { tabId: tab.id, allFrames: false },
              files: script.css
            });
          }
          if (script.js?.length) {
            await browser.scripting.executeScript({
              target: { tabId: tab.id, allFrames: false },
              files: script.js
            });
          }
        } catch {
        }
      }
    })
  );
}

export default defineBackground(() => {

  browser.runtime.onInstalled.addListener(async () => {
    const settings = await getSettings();
    await clearStalePendingBreak();
    await injectIntoExistingTabs();
    if (settings.enabled) {
      await scheduleNextBreak(settings.intervalMinutes);
    }
  });

  browser.runtime.onStartup.addListener(async () => {
    await clearStalePendingBreak();
    const settings = await getSettings();
    if (!settings.enabled) return;

    const alarm = await getBreakAlarm();
    const nextBreakAt = await getNextBreakAt();

    if (!alarm && nextBreakAt) {
      const msRemaining = nextBreakAt - Date.now();
      if (msRemaining <= 0) {
        await browser.alarms.create(BREAK_ALARM_NAME, { when: Date.now() + 1500 });
      } else {
        await browser.alarms.create(BREAK_ALARM_NAME, { when: nextBreakAt });
      }
    } else if (!alarm && !nextBreakAt) {
      await scheduleNextBreak(settings.intervalMinutes);
    }
  });


  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== BREAK_ALARM_NAME && alarm.name !== TYPING_RECHECK_ALARM_NAME) {
      return;
    }
    await triggerBreak();
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    lastTypingByTab.delete(tabId);
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

  async function getFocusedActiveTab() {
    const [tab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true
    });
    return tab;
  }

  async function triggerBreak(options: { bypassTypingCheck?: boolean } = {}): Promise<void> {
    const settings = await getSettings();
    if (!settings.enabled) {
      await setBreakDueSince(null);
      await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);
      return;
    }

    const existingPending = await getPendingBreak();
    if (existingPending) {
      return;
    }

    const activeTab = await getFocusedActiveTab();
    const targetTabId = activeTab?.id;

    const dueSince = (await getBreakDueSince()) ?? Date.now();

    if (activeTab?.url && isUrlExcluded(activeTab.url, settings.excludedSites)) {
      await setBreakDueSince(dueSince);
      await browser.alarms.create(TYPING_RECHECK_ALARM_NAME, {
        when: Date.now() + TYPING_RECHECK_INTERVAL_MS
      });
      return;
    }

    if (!options.bypassTypingCheck && targetTabId !== undefined) {
      const lastTyping = lastTypingByTab.get(targetTabId);
      const isTyping = !!lastTyping && Date.now() - lastTyping < TYPING_IDLE_MS;

      if (isTyping) {
        const stillWithinCeiling = Date.now() - dueSince < MAX_TYPING_DELAY_MS;

        if (stillWithinCeiling) {
          await setBreakDueSince(dueSince);
          await browser.alarms.create(TYPING_RECHECK_ALARM_NAME, {
            when: Date.now() + TYPING_RECHECK_INTERVAL_MS
          });
          return;
        }
      }
    }

    await setBreakDueSince(null);
    await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);

    const breakTypeId = await pickNextBreakTypeId();
    await setPendingBreak({ breakTypeId, triggeredAt: Date.now(), targetTabId });

    const breakType = BREAK_TYPES.find((b) => b.id === breakTypeId)!;

    if (settings.notificationStyle === 'system') {
      const notificationOptions: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icon-128.png' as PublicPath),
        title: `Hammy: time for a ${breakType.label.toLowerCase()} break 🐹`,
        message: breakType.tagline,
        priority: 1
      };

      if (import.meta.env.FIREFOX) {
        browser.notifications.create(NOTIFICATION_ID, notificationOptions);
      } else {
        browser.notifications.create(NOTIFICATION_ID, {
          ...notificationOptions,
          buttons: [{ title: 'Start break' }],
          silent: !settings.soundEnabled
        } as Notifications.CreateNotificationOptions);
      }
    }
  }


  browser.notifications.onButtonClicked.addListener(
    async (notifId, buttonIndex) => {
      if (notifId !== NOTIFICATION_ID) return;
      browser.notifications.clear(NOTIFICATION_ID);
      if (buttonIndex === 0) {
        await focusActiveWindow();
      }
    }
  );

  browser.notifications.onClicked.addListener(async (notifId) => {
    if (notifId !== NOTIFICATION_ID) return;
    browser.notifications.clear(NOTIFICATION_ID);
    await focusActiveWindow();
  });

  async function focusActiveWindow(): Promise<void> {
    const current = await browser.windows.getLastFocused({
      windowTypes: ['normal']
    } as Windows.GetAllGetInfoType);
    if (current?.id !== undefined) {
      browser.windows.update(current.id, { focused: true });
    }
  }


  browser.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse) => {
      handleMessage(message as HammyMessage, sender).then((response) => {
        sendResponse(response);
      });
      return true;
    }
  );

  async function handleMessage(message: HammyMessage, sender: Runtime.MessageSender): Promise<any> {
    switch (message.type) {
      case 'COMPLETE_BREAK':
        await completeBreak();
        return;
      case 'DISMISS_BREAK':
        await setPendingBreak(null);
        browser.notifications.clear(NOTIFICATION_ID);
        return;
      case 'START_BREAK_NOW':
        await cancelScheduledBreak();
        await triggerBreak({ bypassTypingCheck: true });
        return;
      case 'GET_CURRENT_TAB_ID':
        return { tabId: sender.tab?.id };
      case 'USER_TYPING':
        if (sender.tab?.id !== undefined) {
          lastTypingByTab.set(sender.tab.id, Date.now());
        }
        return;
      case 'SETTINGS_UPDATED': {
        const settings = await getSettings();
        const pending = await getPendingBreak();
        const dueSince = await getBreakDueSince();
        if (!settings.enabled) {
          await cancelScheduledBreak();
        } else if (!pending && dueSince === null) {
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
          browser.notifications.clear(NOTIFICATION_ID);
        }
        return;
      }
    }
  }

  async function completeBreak(): Promise<void> {
    const pending = await getPendingBreak();
    if (!pending) {
      browser.notifications.clear(NOTIFICATION_ID);
      return;
    }

    await recordBreakCompleted(pending.triggeredAt);
    await setPendingBreak(null);
    browser.notifications.clear(NOTIFICATION_ID);

    const settings = await getSettings();
    if (settings.enabled) {
      await scheduleNextBreak(settings.intervalMinutes);
    }
  }
});
