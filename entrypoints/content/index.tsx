import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import ReactDOM from 'react-dom/client';
import BreakOverlayApp from './BreakOverlayApp';
// Required for cssInjectionMode: 'ui' below — WXT only bundles/emits
// content-scripts/content.css (and only injects it into the shadow root
// created by createShadowRootUi) when this entrypoint actually imports a
// stylesheet. Without this import there is no CSS in the build output at
// all, so WXT's runtime `loadCss()` fetch for it 404s with "Failed to load
// styles @ .../content-scripts/content.css" the moment the shadow UI mounts
// — that's the "content.css failing to fetch" error.
import '@/assets/globals.css';

/**
 * Runs on every page. Mounts an isolated (shadow DOM) React root that
 * renders nothing until Hammy has a pending break — at which point it
 * covers the entire viewport, above all page content, the way a
 * screen-lock / gatekeeper extension would. This is what makes a break
 * genuinely happen instead of quietly waiting in a popup no one opens.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  // 'ui' mode is the correct mode for createShadowRootUi: WXT fetches the
  // bundled CSS above and injects it directly into the shadow root's own
  // <style> tag (see createShadowRootUi below), so styles are isolated from
  // the host page and there's nothing to manually fetch/insertCSS for. It
  // also means this content script's css array is intentionally absent from
  // the manifest (see manifest.content_scripts[0].css being undefined) —
  // background.ts's injectIntoExistingTabs() already handles that correctly
  // by skipping insertCSS when a script has no css files.
  cssInjectionMode: 'ui',

  async main(ctx) {
    // Guard against double-mounting. This file can legitimately run
    // more than once on the same page: once from the static
    // `content_scripts` registration and, separately, from
    // background.ts's injectIntoExistingTabs() backup path for tabs
    // that were already open — and during local dev, every save
    // reloads the extension and re-triggers that backup injection
    // into every open tab again. Without this guard each re-run would
    // mount an *additional* independent shadow root, storage
    // listener, and requestAnimationFrame loop stacked on top of the
    // last one — which is exactly what "the extension makes pages
    // behave weirdly over time" looks like from the outside.
    if (document.documentElement.hasAttribute('data-hammy-mounted')) {
      return;
    }
    document.documentElement.setAttribute('data-hammy-mounted', 'true');
    ctx.onInvalidated(() => {
      document.documentElement.removeAttribute('data-hammy-mounted');
    });

    // Wait for chrome.storage to be available before mounting the React app.
    // This prevents errors when the content script runs before extension
    // context is ready. Uses ctx.setTimeout (not plain window.setTimeout) so
    // the retry loop is automatically cancelled the moment the context is
    // invalidated (e.g. the extension was reloaded/updated while this page
    // was still loading) instead of polling forever on a page that can
    // never mount the overlay.
    const waitForChromeStorage = (): Promise<void> => {
      return new Promise((resolve) => {
        const check = () => {
          if (ctx.isInvalid) return;
          if (typeof chrome !== 'undefined' && chrome.storage) {
            resolve();
          } else {
            ctx.setTimeout(check, 10);
          }
        };
        check();
      });
    };

    await waitForChromeStorage();

    // The wait above can outlive the context (extension reloaded/updated
    // while waiting) — don't mount a UI for a context that's already gone.
    if (ctx.isInvalid) return;

    const ui = await createShadowRootUi(ctx, {
      name: 'hammy-break-overlay',
      position: 'modal',
      // Sits above virtually anything a page could throw at it.
      zIndex: 2147483647,
      onMount: (container) => {
        // Defensive guard: refuse to mount into the page's *real*
        // document.body/documentElement. This is an identity check, not
        // a tagName check — @webext-core/isolated-element's container
        // can legitimately have tagName 'BODY' (older versions wrap the
        // shadow root's content in a sandboxed <html><body> for internal
        // reasons) without being the actual page body. Pinned to v3+ in
        // package.json ("overrides"), which drops that wrapper and uses
        // a plain <div> instead — but this check stays as a real safety
        // net for the one case that actually matters.
        if (
          container === document.body ||
          container === document.documentElement
        ) {
          throw new Error(
            'Hammy: refused to mount overlay root onto the page\'s document.body/html.'
          );
        }

        const root = ReactDOM.createRoot(container);
        // No React.StrictMode here: in dev it double-invokes effects,
        // which double-fires the overlay's video.play()/rAF loop and
        // made real breaks look like the page had frozen. StrictMode is
        // still on for the popup/options UIs.
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
