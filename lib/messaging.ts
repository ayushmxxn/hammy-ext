import type { HammyMessage } from '@/types';

/** Sends a typed message to the background service worker and waits for it to process it. */
export function sendToBackground(message: HammyMessage): Promise<void> {
  return new Promise((resolve) => {
    // Once this script's extension context is invalidated (reloaded/
    // updated while this page was still open), chrome.runtime.sendMessage
    // throws synchronously with "Extension context invalidated" instead of
    // reaching the callback below — there's no background worker left to
    // send this to either way, so treat it the same as the "receiving end
    // does not exist" case this already swallows.
    try {
      chrome.runtime.sendMessage(message, () => {
        // Swallow "Receiving end does not exist" errors — harmless if the
        // service worker was momentarily asleep; storage still updates
        // once it wakes to handle the message.
        void chrome.runtime.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}
