

## Add a "Reset Canvas Connection" escape hatch

Give you a way to clear a stale Canvas token without opening DevTools, so you can recover when the preview won't load due to a 401.

### What you'll see

1. On the **Canvas Quiz Exporter** page, the welcome/connect screen will show a small **"Reset Canvas connection"** link under the connect form. Clicking it wipes the stored token from localStorage and reloads the page.
2. A new **global safety net**: if any page crashes hard because of a stale Canvas token, a tiny floating **"Clear Canvas token & reload"** button appears in the bottom-right corner. It's only rendered when a `canvas_config` exists in localStorage AND a Canvas 401 has been detected this session.
3. The existing auto-disconnect (listening for `canvas-token-invalid`) stays in place — this is just a manual fallback for when the preview is too broken to reach the in-app Settings sheet.

### Technical changes

- **`src/components/SettingsForm.tsx`** — In the "no config yet" branch, add a subtle text button below the Connect button: "Reset Canvas connection (clear stored token)". On click: `localStorage.removeItem('canvas_config')` then `location.reload()`.
- **New `src/components/CanvasTokenRescue.tsx`** — A tiny always-mounted component (added once in `src/App.tsx`) that:
  - Listens for the existing `canvas-token-invalid` event and also inspects `unhandledrejection` for the Canvas 401 signature.
  - When triggered, sets local state to show a fixed-position bubble-glass button bottom-right: "Canvas token invalid — Clear & reload".
  - Click handler removes `canvas_config` from localStorage and reloads.
  - Renders nothing when no stale token is present.
- **`src/App.tsx`** — Mount `<CanvasTokenRescue />` once near the root so the rescue button is reachable from any route, even if the current page errored.

### Recovery steps for right now

While I'm adding this, you can unblock the preview immediately:
1. Open the preview URL in a new tab.
2. Open DevTools (F12) → **Console** tab.
3. Paste and run: `localStorage.removeItem('canvas_config'); location.reload();`
4. Navigate to **Canvas Quiz Exporter** and paste your new token.

### Out of scope

- No backend/edge function changes — the 401 originates from Canvas itself, not our code.
- No change to how tokens are stored (still localStorage, per existing `auth/canvas-credentials` memory).

