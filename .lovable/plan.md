

## Cleanup: remove leftover/unused code

I audited the whole codebase against the routes wired up in `src/App.tsx` and the imports across pages, components, hooks, and lib files. Here's everything I found that isn't doing anything anymore.

### Confirmed orphans — safe to delete

These have **zero importers** anywhere in the app:

1. **`src/App.css`** — default Vite scaffold styles (`.logo`, `.read-the-docs`, etc.). Not imported by `main.tsx` or anything else. The real styling lives in `src/index.css`.
2. **`src/components/HomeBookShelf.tsx`** — old Home page bookshelf widget. Replaced by the current `HomeBookShelf`-free Home layout. Not imported.
3. **`src/components/NavLink.tsx`** — older nav link component. Superseded by `WorkspaceSidebar` + `AppNavSheet`. Not imported.
4. **`src/components/GenerateLessonDialog.tsx`** — older single-lesson generator dialog. Lesson generation now happens through `RegenerateLessonDialog` and the unified `GenerateContentDialog`. Not imported.
5. **`src/components/GenerateQuestionsDialog.tsx`** — older standalone question generator. Replaced by the unified `GenerateContentDialog` (which uses `content-generator.ts`). Not imported.
6. **`src/components/PushISATEmbedToCanvasDialog.tsx`** — older ISAT-embed push dialog. The active path is `PushISATToCanvasDialog`. Not imported.
7. **`src/lib/question-generator.ts`** — only consumed by the orphan `GenerateQuestionsDialog`. The active generation pipeline is `src/lib/content-generator.ts`.

### Everything else checked and KEPT

- All edge functions in `supabase/functions/` are still invoked from somewhere in the app.
- All other lib files (`export-*`, `standards-api`, `ngss-api`, `pdf-*`, `canvas-api`, `question-bank`, `unit-colors`, etc.) are in use.
- All hooks in `src/hooks/` are in use (including `useDashboardLayout`, `useLtiSession`, `usePageTitle`).
- All other components — including the recent `CanvasTokenRescue` and reset-token UX — are wired up.

### What I'll do

- Delete the 7 files listed above.
- Verify no broken imports remain (TypeScript check via the editor).
- Leave behavior, routes, and UI completely unchanged — these files were already dead, so removing them only shrinks the bundle and reduces noise when navigating the codebase.

### Out of scope

- No refactors, no renames, no behavior changes.
- No edge function deletions — all of them are still called.
- No dependency removals from `package.json` (the recent `react-resizable` / `pdfjs-dist` additions stay; they're actively used).

