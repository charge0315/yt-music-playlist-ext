# Copilot Instructions for AI Agents

## 🏗️ Big Picture & Architecture
- This is a Chrome extension (Manifest V3) for YouTube Music playlist automation.
- Main components:
  - `background.js`: Handles background tasks and API calls.
  - `content.js`: Runs in YouTube Music, fetches channel/song info.
  - `injected.js`: Injected for SAPISID authentication and direct API calls.
  - `popup.js`/`popup.html`: User interface for settings and playlist creation.
  - `utils.js`: Shared utility functions (retry, rate limit, error handling).
- Data flow: User triggers playlist creation → fetches channels/songs → creates/edits playlist via YouTube Music internal API (InnerTube).
- API endpoints: Prefer `browse/edit_playlist`, fallback to others if needed.

## 🛠️ Developer Workflows
- **Install:** `npm install`
- **Build:** `npm run build` (output: `dist/`)
- **Test:** `npm test`, `npm run test:watch`, `npm run test:coverage` (Jest)
- **Lint/Format:** `npm run lint`, `npm run lint:fix`, `npm run format`
- **Debug:** Use Chrome DevTools:
  - Popup: Right-click icon → Inspect
  - Background: `chrome://extensions/` → Service Worker
  - Content: Inspect on YouTube Music page
- **Extension Load:** Load unpacked from `dist/` in Chrome extensions page.

## 📦 Project Conventions
- All API calls use SAPISID authentication; see `injected.js` for details.
- Playlist creation uses smart duplicate detection and fallback naming (timestamped if needed).
- Rate limiting: 500ms delay per channel to avoid account lock.
- Error handling: Automatic fallback and recovery for API/DOM failures.
- Test files are in `tests/` and use Jest.
- Use `localStorage.setItem('ytm-playlist-debug', 'true')` for verbose logging.

## 🔗 Integration Points
- Relies on YouTube Music internal API (`youtubei/v1/*`).
- No official API; DOM and API structures may change—code defensively.
- External references: [ytmusicapi](https://github.com/sigma67/ytmusicapi) for API understanding.

## 📝 Examples & Patterns
- See `content.js` for channel/song fetch logic and playlist creation flow.
- See `injected.js` for authentication and direct API calls.
- See `popup.js` for UI event handling and state management.
- Utility patterns: Retry, fallback, and error recovery in `utils.js`.

## ⚠️ Limitations & Known Issues
- Only works on Chrome/Chromium browsers.
- Uses unofficial API—subject to breakage.
- Rate limits and region restrictions apply.
- DOM selectors and API endpoints may require updates if YouTube Music changes.

---

**Edit this file to keep agent instructions up to date with project changes.**
