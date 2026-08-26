# Hammy - Break Reminder

A local-only browser extension built with **WXT**. Hammy reminds you to breathe, sit up straight, rest your eyes, drink water, and stretch

Supported browsers: **Chrome**, **Edge**, and **Firefox**.

[![Hammy in action](https://img.youtube.com/vi/RCkKC7_nB_M/maxresdefault.jpg)](https://www.youtube.com/watch?v=RCkKC7_nB_M)

## Privacy

Hammy is 100% local:

- No user accounts
- No analytics or tracking
- No network requests
- No data collection of any kind

Everything lives locally in `chrome.storage.local` on your machine.

## Features

- **Five break types**: Breathing, posture, eye break, hydration, and stretch — each with its own short animated video.
- **Custom `.webm` videos**: Use Hammy's built-in hamster animations or upload your own custom `.webm` break video stored locally.
- **Website exclusions**: Add websites where breaks should never interrupt you (e.g., video calls or media sites).
- **Typing-aware timing**: Waits for a natural pause in your typing before showing a break overlay instead of interrupting mid-sentence.
- **Popup settings**: Configure break intervals, sound, freeze-on-break, custom videos, and exclusions directly inside the toolbar popup. No separate settings page needed.
- **Cross-browser**: Runs seamlessly on Chrome, Edge, and Firefox from a single codebase.

## Tech stack

- [WXT](https://wxt.dev) — Web Extension Framework
- React 18 + TypeScript
- Tailwind CSS
- Web Extension APIs (`chrome.alarms`, `chrome.storage.local`, `chrome.action`)

## Project structure

```
hammy/
├── wxt.config.ts               WXT configuration
├── public/
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── videos/                  built-in break videos
├── entrypoints/
│   ├── background.ts             background service worker (alarms, scheduling)
│   ├── content/
│   │   ├── index.tsx              content script entrypoint
│   │   └── BreakOverlayApp.tsx    break overlay component
│   └── popup/
│       ├── index.html            popup entrypoint
│       ├── main.tsx
│       └── App.tsx                popup UI and settings
├── components/                  reusable UI components
├── lib/                         storage, alarms, exclusions, typing detection
├── assets/globals.css            styles and keyframes
├── types/                       TypeScript interfaces
└── package.json
```

## Setup & Development

### 1. Install dependencies

```bash
npm install
```

### 2. Local dev mode

```bash
npm run dev            # Chrome
npm run dev:firefox    # Firefox
```

### 3. Build for production

```bash
npm run build          # Chrome
npm run build:edge     # Edge
npm run build:firefox  # Firefox
```

Production builds are output to **`dist-builds/`**:

- Chrome: `dist-builds/chrome-mv3/`
- Edge: `dist-builds/edge-mv3/`
- Firefox: `dist-builds/firefox-mv3/`

### 4. Load into your browser

**Chrome / Edge:**

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select `dist-builds/chrome-mv3/` (or `dist-builds/edge-mv3/`).

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select any file inside `dist-builds/firefox-mv3/`.

## How it works

- **Alarms & Scheduling**: Uses `chrome.alarms` so timing persists across browser restarts and background service worker unloads.
- **Typing Awareness**: Detects active typing input and waits for a pause before triggering a break overlay.
- **Break Overlay**: When a break fires, a content script mounts a Shadow DOM overlay playing the break video across your active tabs.
- **Custom Videos & Exclusions**: Upload a custom `.webm` clip or manage excluded domain lists directly in the popup UI.
- **Sound & Freeze Settings**: Toggle audio playback and freeze page scrolling during breaks.
- **Local Persistence**: All configuration, streaks, stats, and states are stored safely in `chrome.storage.local`.
