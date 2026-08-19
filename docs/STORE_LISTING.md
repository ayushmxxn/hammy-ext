# Chrome Web Store — Listing content for Hammy

Paste these into the Developer Dashboard when submitting. Nothing here
is enforced by code — it's the text/answers the review form asks for.

## Short description (≤132 chars, shown in search results)

    A tiny hamster gently reminds you to take breathing, stretching, posture, and hydration breaks. 100% local, no tracking.

(120 chars)

## Detailed description

    Hammy is a gentle, local-only break reminder. On the interval you
    choose, a small hamster shows up to guide you through a short
    breathing, posture, eye-rest, hydration, or stretch break — either
    as a full-screen takeover or a small floating card that doesn't
    interrupt what you're doing.

    Why Hammy:
    • Five short guided break types, random or sequential rotation
    • Choose full-screen "freeze" breaks or a non-blocking floating card
    • Snooze, skip, or start a break early, any time
    • Runs entirely on your device — no account, no server, no analytics
    • Open source

    Permissions, plainly:
    • storage — saves your settings and break history on your device only
    • alarms — schedules your next break using Chrome's alarm API
    • notifications — shows a system notification when a break starts
    • Runs on web pages — needed to display the break overlay on the
      page you're currently looking at, so a break can actually happen
      instead of waiting in an unopened popup

    Hammy never sends data anywhere. There are no accounts, no
    analytics SDKs, and no network requests of any kind.

## Category

Productivity

## Language

English (add others if you localize)

## Single purpose statement (CWS requires one sentence)

    Hammy periodically shows a short, dismissible on-page reminder
    to take a break (breathing, posture, eye rest, hydration, or
    stretch), based on a timer the user sets.

## Permission justifications (paste one per permission in the dashboard)

- **storage** — Stores the user's break settings (interval, sound,
  freeze mode, enabled break types) and break-completion stats
  locally via `chrome.storage.local`. Never transmitted anywhere.
- **alarms** — Uses `chrome.alarms` to schedule the next break at the
  user-configured interval, including correctly across browser
  restarts/sleep.
- **notifications** — Shows an optional system notification (user can
  disable) when a break starts, with "Start" / "Snooze" actions.
- **Host permission / content script on `<all_urls>`** — The break
  overlay (full-screen or floating card) is rendered directly on the
  page the user is currently viewing via a content script, so a break
  actually interrupts activity instead of sitting unseen in a popup.
  No page content is read, modified, or transmitted — the content
  script only mounts an isolated shadow-DOM UI and reacts to the
  extension's own local storage.

## Data Privacy form answers (CWS "Privacy practices" tab)

- Does this item collect or use user data? **No** personally
  identifiable data, health data, financial data, authentication
  info, location, web history, or user activity is collected,
  transmitted, or sold. All data (settings + break stats) stays in
  `chrome.storage.local` on the user's device.
- Certify the data usage disclosure: **Yes** (it's accurate — nothing
  leaves the device).
- Privacy policy URL: link to `PRIVACY_POLICY.md` (see the other file
  in this folder) once you've hosted it somewhere public — GitHub
  Pages, a repo's rendered README, or your own site all work. CWS
  requires this URL because the extension requests broad host access
  (`<all_urls>`), even though no data is actually collected.

## Assets you still need to produce (not code — take/design these)

- **Screenshots**: 1–5 images, 1280×800 or 640×400 PNG/JPEG. Show the
  popup, the break overlay (freeze mode), and the floating-card mode.
- **Small promo tile**: 440×280 (commonly required).
- Icon: already have 16/48/128px in `public/` — good.

## Screenshot checklist

When taking screenshots for the Chrome Web Store:

1. **Popup screenshot** (required):
   - Open the extension popup
   - Show the timer, stats, and settings
   - Highlight the clean, friendly interface

2. **Freeze mode screenshot** (recommended):
   - Trigger a break with freeze mode enabled
   - Show the full-screen hamster overlay
   - Demonstrate the break guidance

3. **Floating card screenshot** (recommended):
   - Trigger a break with freeze mode disabled
   - Show the small floating card in the corner
   - Demonstrate non-intrusive breaks

4. **Settings screenshot** (optional):
   - Show the options page with break type toggles
   - Display interval and snooze settings

5. **Break types screenshot** (optional):
   - Show multiple different break types
   - Demonstrate variety (breathing, posture, etc.)

## Final store submission checklist

Before submitting to the Chrome Web Store:

- [ ] Replace placeholder contact email in PRIVACY_POLICY.md with real contact
- [ ] Replace placeholder GitHub URL in PRIVACY_POLICY.md with actual repository
- [ ] Host PRIVACY_POLICY.md publicly (GitHub Pages, repo README, or personal site)
- [ ] Add privacy policy URL to Chrome Web Store listing
- [ ] Take and upload screenshots (at least 1, ideally 3-5)
- [ ] Create and upload small promo tile (440×280)
- [ ] Verify all icon sizes are present (16/48/128px - already done)
- [ ] Set real support email in Chrome Web Store Developer Dashboard
- [ ] Set real website URL in Chrome Web Store Developer Dashboard
- [ ] Review and approve all permission justifications in the dashboard
- [ ] Complete the "Privacy practices" tab with accurate answers
- [ ] Set category to "Productivity"
- [ ] Set language to "English" (or add others if localized)
