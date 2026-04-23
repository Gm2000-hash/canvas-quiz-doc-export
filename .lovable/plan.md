

## Canva-style Customize Editor

You meant **Canva**, not Canvas LMS. Got it — that actually fits better with what you described (free positioning, layers, image filters/crop/flip, drag-to-reorder). Here's the revised plan.

### What you'll see

A new **Canvas** tab in the Customize panel modeled on Canva's editor:

- **Top toolbar**: Insert Image (upload or URL) · Text · Heading · Shape (divider) · Spacer · Embed
- **Free-positioning overlay** on the current page — every widget becomes a draggable, resizable, rotatable box (Canva-style selection handles: 8 resize dots + rotation handle on top)
- **Contextual editor** appears in the panel when a widget is selected:
  - *Image*: Crop · Flip H/V · Rotate · Opacity · Filters (blur, brightness, contrast, saturation, grayscale, sepia) · **Remove Background** (AI) · Replace
  - *Text/Heading*: font size · alignment · color · bold/italic · background
- **Layers pane** at bottom of the tab: every widget on the page listed top-to-bottom in z-order, with drag handle (reorder), eye icon (hide), trash (delete), and click-to-select
- Existing **Wallpaper**, **Element**, **Sections** tabs stay unchanged

### Free positioning (Canva parity)

- Each widget stores `x`, `y`, `width`, `height`, `rotation`, `zIndex`
- Drag to move, corner handles to resize, top handle to rotate
- Snap-to-edge guides when dragging near other widgets or page edges
- Coordinates are page-relative (% of main content area) so they stay correct across viewports
- Outside edit mode, widgets render in their saved positions but are non-interactive

### Image features

- **Upload**: file picker → uploads to existing `wallpapers` bucket under `widget-images/{user_id}/`
- **URL**: paste any public URL
- **Crop**: modal using `react-easy-crop`; output stored as crop rect, applied via `clip-path` + `object-position`
- **Flip / Rotate**: stored as `flipH`, `flipV`, `rotation`; applied as one CSS `transform`
- **Filters**: stored as `{blur, brightness, contrast, saturate, grayscale, sepia}`; joined into one CSS `filter` string
- **Remove Background**: new edge function `remove-image-background` calls Lovable AI image-edit model with prompt "Remove the background, output a transparent PNG", uploads result, swaps the widget's `src`

### Layers / drag-reorder

- `@dnd-kit/sortable` for the layers list
- Top of list = front-most (`zIndex` derived from sort order)
- Drag handle · 32×32 thumbnail · type label · hide · delete

### Persistence (new table)

```text
canvas_layouts
├─ id uuid pk
├─ user_id uuid (RLS: auth.uid())
├─ scope_key text          -- route path: "/", "/notes", etc.
├─ elements jsonb          -- array of CanvasElement
├─ created_at, updated_at
unique(user_id, scope_key)
```

`CanvasElement` shape:
```ts
{
  id, type: "image"|"text"|"heading"|"divider"|"spacer"|"embed",
  // layout
  x, y, width, height, rotation, zIndex, hidden?,
  // text/heading
  content?, level?, align?, color?, bg?, fontSize?, bold?, italic?,
  // image
  src?, opacity?,
  filters?: { blur, brightness, contrast, saturate, grayscale, sepia },
  flipH?, flipV?, crop?: { x, y, width, height },
  // misc
  height_px?  // spacer
}
```

RLS: `user_id = auth.uid()` for all four CRUD policies.

### File changes

```text
NEW  src/lib/canvas-types.ts                       — types + defaults
NEW  src/hooks/useCanvasLayout.ts                  — load/save/mutate per route
NEW  src/components/customize/CanvasTab.tsx        — toolbar + contextual editor + layers pane
NEW  src/components/customize/CanvasOverlay.tsx    — free-positioning render layer (replaces PageWidgets)
NEW  src/components/customize/DraggableWidget.tsx  — resize/rotate/move handles
NEW  src/components/customize/CropDialog.tsx       — react-easy-crop modal
NEW  supabase/functions/remove-image-background/index.ts
EDIT src/components/customize/CustomizePanel.tsx   — replace Widgets tab → Canvas tab
EDIT src/components/customize/ThemeProvider.tsx    — track selectedWidgetId
EDIT src/components/AppShell.tsx                   — render <CanvasOverlay/> instead of <PageWidgets/>
NEW  migration                                     — canvas_layouts table + RLS
```

### Migration of existing widgets

One-time auto-migration on first open of the new editor: for the current page, any `widgets` from `theme_customizations` get copied into a fresh `canvas_layouts` row (placed in a vertical stack at default sizes). Nothing is deleted — old data stays as a backup.

### Out of scope for v1 (can add later)

- Multi-select / group / align-distribute
- Undo/redo stack (current schema supports it; UI deferred)
- Templates / saved layouts library

