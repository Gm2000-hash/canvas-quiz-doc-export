
Fix the blank preview by resolving two frontend build/import errors that are crashing the whole app. The Canvas token is not the root cause here.

## What is actually broken

The preview is failing at build time because Vite cannot resolve these imports:

1. `react-resizable/css/styles.css` from `src/components/ReadingDashboardGrid.tsx`
2. `pdfjs-dist/build/pdf.worker.min.mjs?worker` from `src/lib/pdf-worker.ts`

Because `src/App.tsx` imports pages that eventually import those files, the entire preview can fail even if you are only trying to use the Canvas screen.

## Why it seemed tied to entering the token

Entering the token likely triggered a navigation/re-render that exposed the existing unresolved imports. The blank screen is coming from the app failing to compile, not from Canvas rejecting the token.

## Implementation plan

### 1) Fix the missing `react-resizable` dependency path
Update the Reading Library dashboard dependency issue so the import resolves cleanly.

- Inspect whether `react-grid-layout` is being used with its required peer dependency.
- Add the missing `react-resizable` package to the project dependencies if it is not installed.
- Keep the existing CSS import only if the package is present and needed for resize handles.
- If the package is intentionally not wanted, remove the unsupported CSS import and adjust the dashboard grid so it does not depend on missing resize styles.

Preferred fix: install the proper peer dependency so the dashboard layout keeps working as designed.

### 2) Fix PDF worker setup for `react-pdf`
Replace the current worker import pattern in `src/lib/pdf-worker.ts` with a Vite-compatible `react-pdf` setup.

- Remove the failing direct worker module import:
  `import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';`
- Configure the worker using the recommended URL-based approach for Vite:
  `pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`
- If needed, add `pdfjs-dist` as a direct dependency so Vite can resolve that module path reliably.

This avoids the current import-resolution failure and keeps the PDF viewer + thumbnail generation working.

### 3) Verify the import chain that currently breaks startup
After the dependency/import fixes, verify the app path that currently pulls these files in:

```text
App.tsx
  -> ReadingLibrary.tsx
     -> ReadingDashboardGrid.tsx
     -> pdf-thumbnail.ts
        -> pdf-worker.ts
```

This ensures the preview can boot even before opening the Reading Library.

### 4) Keep the recent Canvas recovery UX
Do not remove the new rescue behavior:
- `CanvasTokenRescue`
- reset button in `SettingsForm`

Those changes are still useful, but they are separate from the current blank-preview problem.

## Files to update

- `package.json`
- `src/lib/pdf-worker.ts`
- possibly lockfile(s)
- optionally `src/components/ReadingDashboardGrid.tsx` if the resize styling/import needs adjustment

## Expected result

After these fixes:
- the preview should load normally again
- your Canvas connection screen should remain visible after entering a valid token
- Reading Library PDF features should still work
- the reset-token safety net remains available if Canvas credentials ever expire again

## Technical notes

- `react-grid-layout` commonly expects `react-resizable` to be present.
- `react-pdf` worker configuration is sensitive to bundler setup; the current `?worker` import is the likely incompatibility.
- The edge function logs show successful `canvas-proxy` calls, which further suggests the current blocker is frontend build failure, not the backend integration.
