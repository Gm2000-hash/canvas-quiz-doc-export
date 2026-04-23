---
name: Canva-style canvas editor
description: Free-positioning per-page editor with layers, image filters, crop, flip/rotate, AI background removal — stored in canvas_layouts table
type: feature
---
The Customize panel includes a **Canvas** tab (modeled on Canva) that lets the user:

- Insert image / text / heading / divider / spacer / embed via toolbar
- Free-position each element (drag), resize via 8 handles, rotate via top handle
- Per-image: opacity, CSS filters (blur, brightness, contrast, saturate, grayscale, sepia), flip H/V, rotate, crop (`react-easy-crop`), Remove Background (AI)
- Layers pane with drag-reorder (`@dnd-kit/sortable`); top of list = front-most
- Hide / delete / select per layer

**Storage**: `public.canvas_layouts (user_id, scope_key, elements jsonb)` with unique(user_id, scope_key). One row per route. RLS: owner-only CRUD.

**Architecture**:
- `src/lib/canvas-types.ts` — `CanvasElement` shape + `buildFilterString` / `buildTransform` / `defaultElement`
- `src/hooks/useCanvasLayout.ts` — load/save/mutate, draft in localStorage (`tk-canvas-layouts-draft`), `saveAll` upserts
- `src/components/customize/ThemeProvider.tsx` exposes `canvasElements`, `add/update/remove/reorderCanvasElement`, `selectedWidgetId`, `saveCanvas`
- `src/components/customize/CanvasOverlay.tsx` — renders absolutely-positioned elements over `<main>`; in edit mode delegates to `DraggableWidget`, otherwise `StaticElement`. Rendered inside `AppShell`'s `<main>` (relative). `pointer-events: none` outside edit mode.
- `src/components/customize/DraggableWidget.tsx` — pointer-based drag/resize/rotate, % coordinates of the container
- `src/components/customize/CanvasTab.tsx` — toolbar + contextual editor + sortable layers pane
- `src/components/customize/CropDialog.tsx` — `react-easy-crop` modal; stores `crop` as % rectangle, applied with `object-position` + scaled width/height
- Edge function `supabase/functions/remove-image-background` — calls Lovable AI `google/gemini-2.5-flash-image` (Nano Banana) with prompt to remove BG → transparent PNG, uploads to `wallpapers` bucket under `widget-images/{user_id}/`, returns 1-year signed URL

**Co-existence**: legacy `theme_customizations.widgets` (flow-positioned `PageWidgets`) still renders alongside the new canvas — nothing was deleted. The old "Widgets" tab was removed from the panel and replaced by "Canvas".

**Save**: shared Save button in the panel calls both `saveAll()` (theme_customizations) and `saveCanvas()` (canvas_layouts).
