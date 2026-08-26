import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import { browser } from 'wxt/browser';
import ReactDOM from 'react-dom/client';
import BreakOverlayApp from './BreakOverlayApp';
import { watchForTyping } from '@/lib/typing';
import '@/assets/globals.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {

    if (document.documentElement.hasAttribute('data-hammy-mounted')) {
      return;
    }
    document.documentElement.setAttribute('data-hammy-mounted', 'true');
    ctx.onInvalidated(() => {
      document.documentElement.removeAttribute('data-hammy-mounted');
    });
    const stopWatchingTyping = watchForTyping();
    ctx.onInvalidated(stopWatchingTyping);

    const waitForExtensionStorage = (): Promise<void> => {
      return new Promise((resolve) => {
        const check = () => {
          if (ctx.isInvalid) return;
          if (typeof browser !== 'undefined' && browser.storage) {
            resolve();
          } else {
            ctx.setTimeout(check, 10);
          }
        };
        check();
      });
    };
    await waitForExtensionStorage();
    if (ctx.isInvalid) return;

    const ui = await createShadowRootUi(ctx, {
      name: 'hammy-break-overlay',
      position: 'modal',
      zIndex: 2147483647,
      onMount: (container) => {
        if (
          container === document.body ||
          container === document.documentElement
        ) {
          throw new Error(
            'Hammy: refused to mount overlay root onto the page\'s document.body/html.'
          );
        }
        const root = ReactDOM.createRoot(container);
        root.render(<BreakOverlayApp ctx={ctx} />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      }
    });
    ui.mount();
  }
});