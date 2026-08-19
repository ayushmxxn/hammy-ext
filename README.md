# Hammy 🐹 — Gentle Break Reminders

A polished, local-only Chrome extension (Manifest V3), built with **WXT**.
Hammy reminds you to breathe, sit up straight, rest your eyes, drink water,
and stretch — with a tiny animated hamster for each break. No accounts, no
analytics, no network requests of any kind. Everything lives in
`chrome.storage.local` on your machine.

## Tech stack

- [WXT](https://wxt.dev) — the extension framework (manifest generation, dev server, build/zip)
- React 18 + TypeScript
- Tailwind CSS 3
- `chrome.alarms`, `chrome.storage.local`, `chrome.notifications`, `chrome.action`

## Project structure

```
hammy/
├── wxt.config.ts               WXT config — replaces a hand-written manifest.json
├── public/
│   ├── icon-16.png              auto-detected by WXT (icon-{size}.png convention)
│   ├── icon-48.png
│   ├── icon-128.png
│   └── videos/                  ← put your 5 .webm files here
├── entrypoints/
│   ├── background.ts             service worker: alarms, notifications, scheduling
│   ├── content/
│   │   ├── index.tsx              content script → mounts the full-screen overlay
│   │   └── BreakOverlayApp.tsx    the full-screen "break is happening" takeover
│   ├── popup/
│   │   ├── index.html            → becomes the toolbar popup
│   │   ├── main.tsx
│   │   └── App.tsx                popup UI (idle view + active break view, fallback)
│   └── options/
│       ├── index.html            → becomes the settings page
│       ├── main.tsx
│       └── App.tsx                full settings page
├── components/
│   ├── HammyVideo.tsx            reusable video player (used everywhere)
│   ├── BreakCard.tsx             the "break is happening" card
│   ├── HammyHeader.tsx           shared header
│   ├── ProgressRing.tsx          daily-breaks progress ring
│   └── Timer.tsx                 live countdown
├── lib/
│   ├── breakTypes.ts             the 5 break definitions ↔ video filenames
│   ├── storage.ts                typed chrome.storage.local wrapper
│   ├── alarms.ts                 chrome.alarms scheduling helpers
│   ├── messaging.ts              popup/options → background messaging
│   └── format.ts                 countdown formatting
├── assets/globals.css            Tailwind + custom keyframes
├── types/index.ts                shared TypeScript types
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

WXT auto-detects `entrypoints/popup/index.html` as the toolbar popup,
`entrypoints/options/index.html` as the settings page, and
`entrypoints/content/index.tsx` as a content script (registered for
`<all_urls>` in `manifest.json` automatically) — it generates the entire
`manifest.json` from `wxt.config.ts` plus these entrypoints, including
`web_accessible_resources` for the video files so pages are allowed to
load them. You never hand-write or hand-copy a manifest.

Tabs that were already open before you installed/reloaded the extension
won't have the content script yet — reload them once after loading Hammy
for the overlay to work there.

## 1. Place the 5 video files

Drop your five WebM clips **directly** into `public/videos/`, with these
**exact filenames** (they're referenced by name in `lib/breakTypes.ts`):

```
public/videos/hammy-breathe.webm
public/videos/hammy-posture.webm
public/videos/hammy-eye-break.webm
public/videos/hammy-drink-water.webm
public/videos/hammy-stretch.webm
```

Each maps to a specific break type:

| File                        | Break         | Shown for                              |
|------------------------------|--------------|-----------------------------------------|
| `hammy-breathe.webm`         | Breathe      | 4 slow breaths, nervous-system reset    |
| `hammy-posture.webm`         | Posture Check| Shoulders/spine/jaw reset               |
| `hammy-eye-break.webm`       | Eye Break    | 20-20-20 rule                           |
| `hammy-drink-water.webm`     | Drink Water  | Hydration nudge                         |
| `hammy-stretch.webm`         | Stretch      | Stand and stretch                       |

## 2. Install dependencies

```bash
npm install
```

(`postinstall` automatically runs `wxt prepare`, which generates
`.wxt/` — WXT's local type definitions and tsconfig base. That folder is
gitignored and regenerates any time you install or build.)

## 3. Build

```bash
npm run build
```

This produces a complete unpacked extension in **`.output/chrome-mv3/`**.

(There's also `npm run zip`, which builds and additionally produces a
`.zip` in `.output/` sized for the Chrome Web Store, if you ever want that.)

## 4. Load into Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder

Hammy's icon appears in your toolbar immediately, with break reminders
scheduled and running.

## How it behaves

- **Timer**: `chrome.alarms` is used (not `setInterval`) so timing survives
  the service worker being unloaded, and persists correctly across browser
  restarts. On `chrome.runtime.onStartup`, Hammy reconciles the stored
  "next break at" timestamp — if you were overdue while Chrome was closed,
  it fires promptly instead of waiting out the full interval again.
- **Trigger — full-screen, sound-on video takeover**: when the alarm
  fires, Hammy picks a break type (random or sequential, your choice) and
  writes it to `chrome.storage.local` as the "pending break." A content
  script running on every open tab (`entrypoints/content`) is subscribed
  to that storage key — the instant it changes, it mounts a full-viewport
  overlay (via WXT's `createShadowRootUi`, `position: 'modal'`, isolated
  in a shadow DOM so it can't be affected by the page's own CSS) that is
  **nothing but the video itself**, edge to edge, with sound — no card,
  no title, no buttons. It appears on every open tab at once, so
  switching tabs during a break doesn't dodge it. The break ends
  automatically the moment the clip finishes playing.
- **Sound**: the overlay tries to autoplay with sound immediately.
  Browsers block unmuted autoplay on sites you haven't interacted with
  yet — when that happens, Hammy falls back to a muted autoplay and shows
  a small "🔊 Tap for sound" pill at the bottom; one click/tap turns the
  audio on (that click is what satisfies the browser's gesture
  requirement — there's no way around this from an extension, it's a
  browser-level policy).
- **Transparency**: the video is drawn frame-by-frame onto a `{ alpha:
  true }` `<canvas>` rather than shown via a plain `<video>` tag, because
  a native `<video>` element always paints an opaque rectangle even if
  its source has an alpha channel — canvas compositing is the only way
  Chrome preserves per-pixel transparency, so the page underneath shows
  through wherever the clip is transparent. **This only works if your
  `.webm` files are actually encoded with an alpha channel** (VP9,
  `yuva420p` pixel format). If your source is a transparent-background
  video/animation (e.g. exported from After Effects or similar), encode
  it with ffmpeg like this:
  ```bash
  ffmpeg -i hammy-breathe.mov -c:v libvpx-vp9 -pix_fmt yuva420p \
    -b:v 2M -auto-alt-ref 0 hammy-breathe.webm
  ```
  A `.webm` that wasn't encoded this way (e.g. a screen recording with a
  solid background) will still show that background as an opaque
  rectangle — there's no way to strip a background that was never
  transparent in the source file. `-auto-alt-ref 0` matters: without it,
  libvpx's alt-ref frames can silently drop the alpha plane.
- **Getting unstuck**: since there's no button on the overlay, `Esc`
  dismisses the break early (documented, not shown on-screen, since the
  ask was "no UI at all"). There's also a safety timeout — if a clip
  fails to load, the overlay clears itself automatically ~20 seconds past
  its expected length instead of locking the page forever.
- **Where it can't appear**: Chrome blocks content scripts on a handful of
  special pages — `chrome://` pages, the Chrome Web Store, and PDF
  viewers. On those, the break simply won't overlay (Chrome's own
  restriction) — opening the toolbar popup manually still shows a full
  break card with Done/Snooze as a fallback there.
- **Completing a break**: marks it done, updates your daily count and
  streak, clears the badge, and reschedules the next break from now — the
  overlay disappears everywhere it was showing, immediately.
- **Snoozing**: reschedules using your configured snooze duration instead.
- **Settings**: changing the interval, break types, order, sound, or
  notification style reschedules live — no reload needed. System
  notifications are **off by default** — the video overlay is the whole
  experience; flip "System notifications" on in Settings if you also
  want a native Chrome notification alongside it.
- **Persistence**: all settings, stats, and the pending-break state live in
  `chrome.storage.local`, so a popup close/reopen, extension reload, or
  full browser restart never loses your place.

## Rebuilding after changes

```bash
npm run build
```

then click the refresh icon on Hammy's card at `chrome://extensions`.

## Optional: local dev mode

```bash
npm run dev
```

WXT will build in watch mode and can auto-open/reload a Chrome instance
with the extension loaded for you as you edit (standard WXT dev-server
behavior). `chrome.*` APIs only work in this actual extension context —
there's no meaningful "browser tab" preview for `background.ts`.

### If `npm run dev` fails with `Missing field 'moduleType'` / 500s from localhost:3000

This is a dependency-drift issue, not a code bug: `@wxt-dev/module-react`
was pinned as `^1.1.3` in `package.json`, and npm had started resolving
that to `1.2.2`, which pulls in `@vitejs/plugin-react@6.x` — built for
Vite 7/8's plugin API. WXT 0.19.x runs its own internal Vite 6.4.3, and
that version mismatch is what makes the dev server's React-refresh
plugin crash, taking every file it tries to serve (`main.tsx`,
`@vite/client`, etc.) down with a 500. It doesn't affect `npm run
build`, since that production path doesn't use the dev-only
react-refresh plugin — only `npm run dev` hits it.

`package.json` now pins `@wxt-dev/module-react` to an exact `1.1.4`
(instead of a caret range) plus an `overrides` entry forcing its
`@vitejs/plugin-react` down to the `4.x` line, so this can't silently
drift again on a future `npm install`. If you ever see this error
again after adding new dependencies, run `npm ls vite` — you should
see exactly one `vite@6.x` under `wxt`, with no second `vite@7`/`vite@8`
pulled in elsewhere.

