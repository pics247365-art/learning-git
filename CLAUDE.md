# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**RTL Adaptive** — a Chrome browser extension that lets users pick any element on any website and apply adaptive RTL/LTR direction to it.

## RTL Adaptive — Chrome extension

### Running / loading the extension

No build step. Load directly in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

After any code change, click the reload (↺) button on the extension card.

### Architecture

**Popup** (`popup.html` + `popup.css` + `popup.js`):
- Fixed 340 px wide Chrome popup.
- Reads block list from `chrome.storage.sync` (keyed by hostname).
- "Pick a block" activates the content script's picker mode via `chrome.tabs.sendMessage`.
- Export/Import: serializes storage to JSON, filtered by selected domains (modal UI already in `popup.html`).

**Content script** (`content.js` + `content.css`):
- Injected into every page. Listens for messages from the popup.
- Picker mode: adds `.rtla-hover` outline on `mouseover`, captures click → generates a unique CSS selector → content script itself saves it to `chrome.storage.sync` (the popup closes on page click, so it can't receive the result) and handles containment.
- Applies RTL rules to stored selectors on page load/update.
- Toast notifications use `.rtla-toast` / `.rtla-toast--visible` CSS classes.

### RTL transformation rules (must be preserved exactly)

- `<input>`, `<textarea>`, `contenteditable` elements — **never touched**.
- Hebrew-containing text nodes → `direction: rtl` + physically reverse arrow characters (`←`↔`→`).
- English runs inside Hebrew text → wrap in a `<span dir="ltr">` to preserve reading order.
- Nodes containing only numbers or symbols → leave unchanged.
- **Containment**: when a block selector matches an ancestor of an existing stored block, the child block is automatically deleted from storage.

### Design tokens (popup.css `:root`)

```
--bg: #f7f2ea        --surface: #fffbf4     --surface2: #f0e9de
--border: #e3d9c9    --text: #2b2724        --muted: #7a6f61
--accent: #c95e35    --accent-soft: #f3d8cb --danger: #b33a2a
```

Fonts: **DM Sans** (UI text) and **DM Mono** (selectors, host labels) — loaded from Google Fonts in `popup.css`.
