# Hammy — Privacy Policy

_Last updated: August 19, 2026_

Hammy ("the extension") is a break-reminder Chrome extension. This
policy explains what data it handles.

## Summary

Hammy does not collect, transmit, sell, or share any user data. It
has no server, no analytics, no accounts, and makes no network
requests of any kind.

## What Hammy stores, and where

Hammy saves the following, only on your own device, using Chrome's
built-in `chrome.storage.local` API:

- Your settings (break interval, snooze length, sound on/off, freeze
  mode on/off, which break types are enabled, break order)
- Whether a break is currently pending, and when it was triggered
- Break-completion statistics (total breaks completed, today's count,
  streak) used only to show your own progress back to you

None of this ever leaves your device. It is not readable by Hammy's
developer, not sent to any server, and not shared with any third
party. Uninstalling the extension deletes it.

## Why Hammy runs on the pages you visit

Hammy's break overlay needs to appear directly on whatever page
you're looking at when a break is due — otherwise a break would only
show up in an unopened popup and never actually happen. To do this,
Hammy's content script runs on web pages, but it:

- does not read, log, or transmit any content from the pages you visit
- only reads Hammy's own local settings to decide whether to show a
  break overlay
- renders its UI in an isolated shadow DOM that doesn't interact with
  the page

## Permissions

- `storage` — save your settings and stats locally (see above)
- `alarms` — schedule your next break at your chosen interval
- `notifications` — show an optional system notification when a
  break starts (you can turn this off in settings)
- `scripting` — inject the break overlay into tabs that were already
  open when the extension was installed or updated, so breaks appear
  immediately without requiring a page refresh
- `tabs` — query which tabs are currently open to target break overlays
  to the active tab
- Host permission (`<all_urls>`) — needed to run the content script
  on web pages so the break overlay can appear directly on the page
  you're viewing. No page content is read, modified, or transmitted —
  the content script only renders an isolated shadow-DOM UI and reacts
  to the extension's own local storage.

## Changes to this policy

If this policy changes, the "Last updated" date above will change
too. Material changes will be reflected in the Chrome Web Store
listing.

## Contact

For questions, feedback, or privacy concerns about Hammy, please contact:

- Email: hammy-extension@example.com
- GitHub Issues: https://github.com/yourusername/hammy-extension/issues

(Replace these with your actual contact information before publishing to the Chrome Web Store.)
