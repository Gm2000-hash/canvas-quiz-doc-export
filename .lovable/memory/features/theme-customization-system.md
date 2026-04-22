---
name: theme-customization-system
description: Per-page wallpapers, per-element coloring, custom widgets, and hideable sections — fully user-configurable
type: feature
---
# Theme Customization System

The app ships with a **neutral baseline** (white/gray) so users build their own look via the floating Customize button (palette icon, bottom-right of every protected page).

## Capabilities
- **Wallpapers per page**: upload, AI-generate (`generate-wallpaper` edge function), or clear. Filters: blur, brightness, contrast, saturation, opacity + presets (none/soft/mono/sepia/noir/vivid/dream).
- **Per-element coloring**: any element with `data-themeable="some.key"` is clickable in edit mode. Edit bg / text / border independently.
- **Custom widgets per page**: text, heading (H1–H4), image (URL), divider, spacer, embed (iframe). Rendered via `<PageWidgets />` injected at top of `<main>` in `AppShell`.
- **Hideable sections**: wrap any built-in section with `<HideableSection sectionKey="..." label="...">`. Customize panel → Sections tab toggles them.
- **Local-preview + save-to-account**: all edits land in `localStorage` first; click Save to persist to `theme_customizations`.

## Adding themeable scopes to new pages
```tsx
// Color a single element
<div data-themeable="home.banner">...</div>

// Hide a built-in block
<HideableSection sectionKey="home.tips" label="Tips of the day">
  <TipsBlock />
</HideableSection>
```
The Customize panel auto-discovers all `[data-section]` keys on the current page.

## Architecture
- `src/lib/customization-types.ts` — types + `FILTER_PRESETS`
- `src/hooks/useThemeCustomizations.ts` — server load + draft (localStorage) + saveAll/discardDraft
- `src/components/customize/ThemeProvider.tsx` — applies wallpaper CSS vars, injects per-element color stylesheet, manages edit-mode body class, auto-discovers click targets
- `src/components/customize/CustomizePanel.tsx` — Sheet UI with 4 tabs (Wallpaper, Element, Widgets, Sections)
- `src/components/customize/CustomizeButton.tsx` — floating palette FAB
- `src/components/customize/HideableSection.tsx` — wrapper component
- `src/components/customize/WidgetRenderer.tsx` — `<PageWidgets />`
- DB: `theme_customizations` table — `widgets jsonb`, `hidden_sections jsonb`, plus existing color/wallpaper columns. Unique on (user_id, scope_type, scope_key).
- Storage: `wallpapers` bucket (private, user-scoped folders).

## Important
- Citrus theme is gone. Tailwind `page-green`, `neon-*`, `bubble-tint-*` classes still exist but resolve to neutrals.
- ThemeProvider lives inside `AppShell` so all protected routes get it; public routes (LTI, share, ISAT player) intentionally don't.
