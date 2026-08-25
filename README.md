# Hammy 🐹

### Gentle break reminders with a tiny hamster.

Hammy helps you take short breaks from your screen with simple, animated reminders to breathe, stretch, rest your eyes, fix your posture, and drink some water.

**Tech:** WXT · React · TypeScript · Tailwind CSS · Web Extension APIs

**Browsers:** Chrome · Edge · Firefox

[![Hammy in action](https://img.youtube.com/vi/RCkKC7_nB_M/maxresdefault.jpg)](https://www.youtube.com/watch?v=RCkKC7_nB_M)

## What it does

- 🫁 **Breathe** — slow down with a few guided breaths
- 🪑 **Posture** — reset your shoulders, spine, and jaw
- 👀 **Eye Break** — rest your eyes with the 20-20-20 rule
- 💧 **Drink Water** — a small reminder to hydrate
- 🧘 **Stretch** — stand up and move around

Choose your break interval, break types, order, snooze duration, sound, and notifications.

## How it works

When it's time for a break, Hammy takes over your open tabs with the break animation.

There's no complicated interface. **Just take the break.**

The animation finishes automatically and you're back to work. Press `Esc` if you need to skip a break.

Hammy uses browser alarms for scheduling, stores everything locally, and syncs the active break across open tabs.

## Privacy

Hammy works entirely on your device.

- No accounts
- No analytics
- No tracking
- No network requests
- No data collection

Your settings and stats stay in your browser's local storage.

## Development

### Setup

```bash
git clone https://github.com/ayushmxxn/hammy-ext.git
cd hammy-ext
npm install
npm run dev
```

### Build for production

```bash
npm run build
```

Browser-specific build commands are available in `package.json`.

### Add the animations

Add the five WebM animations to `public/videos/`:

```text
public/videos/
├── hammy-breathe.webm
├── hammy-posture.webm
├── hammy-eye-break.webm
├── hammy-drink-water.webm
└── hammy-stretch.webm
```

### Load locally

**Chrome**

`chrome://extensions` → Developer mode → Load unpacked → select the generated `.output/` build.

**Firefox**

`about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select the generated `manifest.json`.

Already-open tabs may need a refresh after installing or reloading the extension.

## Project structure

```text
hammy-ext/
├── entrypoints/    # background, content script, popup, settings
├── components/     # reusable UI
├── lib/            # storage, scheduling, messaging, break logic
├── public/videos/  # Hammy break animations
├── types/
├── wxt.config.ts
└── package.json
```

## Transparent video

Hammy's animations use transparent WebM video. The source clips need an actual alpha channel.

```bash
ffmpeg -i input.mov \
  -c:v libvpx-vp9 \
  -pix_fmt yuva420p \
  -b:v 2M \
  -auto-alt-ref 0 \
  output.webm
```

## Contributing

Found a bug or have an idea? Open an issue or pull request.

Keep changes focused and avoid unnecessary complexity.

## License

See the repository for license information.

---

Made with 🤍 by [@ayushmxxn](https://github.com/ayushmxxn)
