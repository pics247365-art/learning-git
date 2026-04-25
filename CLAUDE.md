# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Three separate projects live here:

1. **RTL Adaptive** — a Chrome extension that lets users pick any element on any website and apply adaptive RTL/LTR direction to it.
2. **puzzle-roxy.html** — a standalone 64-piece mobile puzzle game (no dependencies, open directly in a browser).
3. **training-app.html** — a standalone personal training app (planned; single self-contained HTML file).

No build step, no package manager, no dependencies for any project.

---

## RTL Adaptive — Chrome extension

### Loading the extension

```
chrome://extensions → Developer mode ON → Load unpacked → select this folder
```

After any code change, click the reload (↺) button on the extension card.

### Missing files (not yet committed)

The repo holds only the UI shell. These files are needed for the extension to function:

| File | Purpose |
|---|---|
| `manifest.json` | Permissions, content script registration, popup declaration |
| `popup.js` | Renders block list; handles pick / toggle / rename / delete / export / import |
| `content.js` | Element picker, RTL transformation engine, toast display |

### Architecture

**Popup** (`popup.html` + `popup.css` + `popup.js`):
- Fixed 340 px wide Chrome popup.
- Reads block list from `chrome.storage.sync` keyed by hostname.
- "Pick a block" sends a message to `content.js` via `chrome.tabs.sendMessage` to enter picker mode.
- Export/Import serializes storage to JSON, filtered by selected domains via the modal UI already in `popup.html`.

**Content script** (`content.js` + `content.css`):
- Injected into every page; all `content.css` rules use `!important` to survive host-page specificity.
- Picker mode: `.rtla-hover` outline on `mouseover` → click → CSS selector generated → sent to popup → saved to `chrome.storage.sync`.
- On page load/DOM change: applies stored selectors and RTL rules.
- Toast: `.rtla-toast` shown via `.rtla-toast--visible` toggle.

### CSS conventions

`popup.css` uses BEM-ish naming: `.block`, `.block__name`, `.block__controls`, `.icon-btn`, `.icon-btn--danger`, `.btn--primary`, `.btn--ghost`. Avoid adding inline styles; use the existing token variables.

### RTL transformation rules (must be preserved exactly)

- `<input>`, `<textarea>`, `contenteditable` — **never touched**.
- Hebrew-containing text nodes → `direction: rtl` + physically swap arrow characters (`←` ↔ `→`).
- English runs inside Hebrew text → wrap in `<span dir="ltr">` to preserve reading order.
- Nodes containing only numbers or symbols → leave unchanged.
- **Containment**: selecting an ancestor of an existing stored block automatically removes the child blocks from storage.

### Design tokens (`popup.css :root`)

```
--bg: #f7f2ea        --surface: #fffbf4     --surface2: #f0e9de
--border: #e3d9c9    --text: #2b2724        --muted: #7a6f61
--accent: #c95e35    --accent-soft: #f3d8cb --danger: #b33a2a
```

Fonts: **DM Sans** (UI text) and **DM Mono** (selectors, host labels) — loaded from Google Fonts in `popup.css`.

---

## Puzzle Roxy (`puzzle-roxy.html`)

Single self-contained HTML file (~310 KB, large due to the embedded base64 JPEG).

- 8×8 grid (64 pieces) built from an embedded base64 image of Roxy.
- Tap to select (gold outline), tap another piece to swap.
- "📷 תמונה שלי" replaces the image from the device gallery.
- To update the photo: `base64 -w 0 photo.jpg` and replace the `B64` constant (line 136) in the `<script>` block.

---

## Training App (`training-app.html`)

Planned standalone HTML file — same pattern as `puzzle-roxy.html`: no dependencies, self-contained, open directly in a browser. All data persisted via `localStorage`. Hebrew RTL UI.
