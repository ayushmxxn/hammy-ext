import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  manifest: {
    name: "Hammy - Break Reminder",
    short_name: "Hammy",
    // Chrome Web Store hard-rejects a manifest `description` over 132
    // characters at upload time (separate from, and shorter than, the
    // store listing's own "detailed description" field — keep this
    // one terse).
    description:
      "A tiny hamster reminds you to take breathing, stretching, posture, and hydration breaks. 100% local, no tracking.",
    version: "1.1.0",
    // author / homepage_url intentionally omitted — the manifest
    // shouldn't ship placeholder contact info. Set your real support
    // email and site in the Chrome Web Store Developer Dashboard
    // listing instead (Store Listing > Support / Contact fields);
    // that's what's actually shown to users, not this manifest key.
    permissions: ["storage", "alarms", "notifications", "scripting", "tabs"],
    // Needed so chrome.scripting.executeScript can back-fill the break
    // overlay into tabs that were already open before Hammy was
    // installed/updated (see injectIntoExistingTabs() in
    // background.ts). The static content_scripts `matches` field only
    // covers *future* navigations — it does not by itself authorize
    // programmatically injecting into a tab's current, already-loaded
    // document, so this is listed explicitly rather than relied on
    // implicitly.
    host_permissions: ["<all_urls>"],
    minimum_chrome_version: "116",
    action: {
      default_icon: {
        "16": "icon-16.png",
        "48": "icon-48.png",
        "128": "icon-128.png",
      },
      default_title: "Hammy - Break Reminder",
    },
    icons: {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
    // Remove dev-only command for production
    commands: {},
    // The break overlay is injected into real web pages via a content
    // script, so the video files it plays must be explicitly exposed —
    // unlike popup.html/options.html, a page's own origin can't load
    // chrome-extension:// resources unless they're listed here.
    //
    // NOTE: this previously also set `use_dynamic_url: true` (serves
    // each resource from a random per-install URL instead of a fixed
    // ID-based path, so pages can't fingerprint "is Hammy installed?").
    // Reverted — it landed right before break videos stopped
    // rendering, and this WXT version doesn't natively support the
    // field (it had to be patched onto the manifest post-build via a
    // hook), which is exactly the kind of untested, non-standard path
    // that's worth being suspicious of. A working break overlay
    // matters far more than that hardening. If you want to try it
    // again later, re-add `use_dynamic_url: true` here, rebuild, and
    // — critically — actually trigger a real break (Settings > "Start
    // a break now" or wait out the timer) before shipping, not just
    // open the popup.
    web_accessible_resources: [
      {
        resources: ["videos/*.webm"],
        matches: ["<all_urls>"],
      },
    ],
  },
  vite: () => ({
    build: {
      // Vite's modulePreload injects <link rel="modulepreload"> for
      // every chunk in a page's module graph, including ones a given
      // entry (e.g. popup.html) doesn't end up executing before the
      // popup closes. That's what Chrome's extension error console
      // was flagging ("preloaded but not used within a few seconds").
      // It's a real optimization for regular web pages fetching
      // scripts over the network; for a chrome-extension:// page
      // reading files off local disk it saves nothing and only adds
      // console noise, so it's switched off entirely rather than
      // chasing per-chunk usage.
      modulePreload: false,
    },
  }),
});
