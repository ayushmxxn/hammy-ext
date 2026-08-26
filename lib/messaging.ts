import { browser } from 'wxt/browser';
import type { HammyMessage } from '@/types';

export async function sendToBackground(message: HammyMessage): Promise<void> {
  try {
    await browser.runtime.sendMessage(message);
  } catch {
  }
}
