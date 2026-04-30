## Goal

Make the published app installable on desktop and mobile via the browser's "Install" / "Add to Home Screen" action. No service worker, no offline mode — just a web app manifest plus icons so the app launches in its own standalone window with a proper icon and name.

This avoids all the pitfalls of full PWAs (stale caches, broken Lovable preview, manifest fields pinned at install time) while giving you the "feels like a real app" result.

## What gets built

1. **`public/manifest.json`** — Web app manifest with:
   - `name`: "Teaching Toolkit"
   - `short_name`: "Toolkit"
   - `start_url`: "/"
   - `display`: "standalone" (opens in its own window, no browser chrome)
   - `background_color` / `theme_color`: matched to the neutral baseline theme (white/near-white)
   - `icons`: references to 192px and 512px PNG icons (plus a maskable variant for Android)

2. **App icons in `public/`** — Generate three PNGs from the existing GraduationCap brand mark:
   - `icon-192.png` (192×192)
   - `icon-512.png` (512×512)
   - `icon-maskable-512.png` (512×512, with safe-zone padding for Android adaptive icons)
   - `apple-touch-icon.png` (180×180, for iOS home screen)

3. **`index.html` updates** — Add inside `<head>`:
   - `<link rel="manifest" href="/manifest.json">`
   - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
   - `<meta name="theme-color" content="...">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="apple-mobile-web-app-title" content="Toolkit">`

That's the entire change. No `vite-plugin-pwa`, no service worker, no caching logic.

## How your colleague installs it

After you click **Publish → Update** in the Lovable editor, send them this link:
`https://canvas-quiz-doc-export.lovable.app`

- **Desktop (Chrome/Edge)**: Install icon appears in the address bar, or three-dot menu → "Install Teaching Toolkit".
- **Mac Safari**: File → "Add to Dock".
- **iPhone (Safari)**: Share button → "Add to Home Screen".
- **Android (Chrome)**: Three-dot menu → "Install app" or "Add to Home screen".

Once installed, it gets its own icon and opens in a standalone window — no browser tabs, no address bar.

## Important caveats (unchanged from the current setup)

- **Login still required.** Single-user mode is still on, so the installed app behaves the same as the website — your colleague would still need an account to use it. Installing doesn't bypass auth.
- **Internet required.** This is not offline mode. It's a wrapper that makes the web app launch like a native app.
- **Data lives in Lovable Cloud.** Same backend, same RLS rules.

## Future: multi-user workflow (separate, not part of this plan)

You mentioned possibly opening this up to multiple users later. When you're ready, that's a separate change that would involve:
- Re-enabling signups (with optional email allow-list or invite codes)
- Deciding the data-sharing model: do new users see *your* curriculum/notes, get a fresh empty workspace, or share a "team" workspace?
- Possibly adding role tiers (e.g., owner vs. collaborator) on top of the existing `user_roles` table
- Updating RLS policies to match whichever sharing model you pick

I'll leave that for a future request — just flagging the decision points so you can think about them.

## Files touched

- `index.html` (edit — add manifest/icon/meta tags in `<head>`)
- `public/manifest.json` (new)
- `public/icon-192.png` (new)
- `public/icon-512.png` (new)
- `public/icon-maskable-512.png` (new)
- `public/apple-touch-icon.png` (new)

No code in `src/` changes. No dependencies added. No backend changes.
