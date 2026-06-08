# Port AI Generators to Teacher's Companion

## What we're moving

Four AI generators from this app:

1. **Question generator** — `generate-questions` edge fn + `CreateQuestionDialog`
2. **Lesson plan generator** — `generate-lesson-plans` edge fn + `RegenerateLessonDialog`/`PrepopulateStandardsDialog`
3. **Escape room generator** — `generate-escape-room` edge fn + `GenerateEscapeRoomDialog`
4. **Reading generator** — `generate-curriculum-reading` edge fn + reading UI

All are UDL-wrapped (`withUdl()`), Lovable AI Gateway–backed, and tied to NGSS / Idaho standards.

## Same two-step rhythm as the exporter port

Work happens here first (prep clean, portable artifacts), then the user runs a follow-up prompt in **Teacher's Companion** which uses `cross_project--read_project_file` to pull everything across.

## Phase 1 — In THIS project (prep)

### A. Portable `_shared` for edge functions
Stage clean copies under `supabase/functions/_shared/portable/`:
- `udl.ts` — already self-contained, copy as-is
- `model.ts` — resolver, copy as-is
- `logger.ts` — strip project-specific log table refs, leave console fallback
- `ai-gateway.ts` — single helper (`callGateway(model, messages, tools?)`) so target app doesn't have to learn our patterns

### B. Portable standards data
- `src/lib/exports-ai/standards-mini.ts` — minimal `{ code, description, key_terms? }` shape only. Strips NGSS/Idaho's full dimension trees so target app can supply its own standard list.

### C. Edge function clones (target-ready)
Under `supabase/functions/_portable/`:
- `generate-questions/index.ts`
- `generate-lesson-plans/index.ts`
- `generate-escape-room/index.ts`
- `generate-curriculum-reading/index.ts`

Changes vs the originals:
- Drop direct DB writes — return generated payload only. Target app decides where to persist.
- Replace `ALL_SUBSTANDARDS` lookups with caller-supplied standards array.
- Keep `withUdl()` wrapping and `resolveModel(body, tier)` resolution.
- Standard CORS + JWT verify + LOVABLE_API_KEY check.

### D. Portable types + client
`src/lib/exports-ai/`:
- `types.ts` — `PortableStandard`, `GenerateQuestionsInput/Output`, `GenerateLessonInput/Output`, `GenerateEscapeRoomInput/Output`, `GenerateReadingInput/Output`
- `client.ts` — thin `supabase.functions.invoke()` wrappers, returns typed results
- `index.ts` — barrel
- `README.md` — porting guide + how to drop the edge fns in, plus required secrets (`LOVABLE_API_KEY` only)

### E. Starter UI components (framework-agnostic shadcn)
`src/lib/exports-ai/ui/`:
- `GenerateQuestionsDialog.tsx`
- `GenerateLessonDialog.tsx`
- `GenerateEscapeRoomDialog.tsx`
- `GenerateReadingDialog.tsx`

These are simplified versions: standards picker is a prop (target app supplies its own picker since their standards data may differ), model select is optional. No app-specific imports — only `@/components/ui/*` from shadcn, which both apps share.

## Phase 2 — Follow-up prompt for Teacher's Companion

You paste a single prompt over in Teacher's Companion. That agent will:
1. `cross_project--read_project_file` every file under `src/lib/exports-ai/`, `supabase/functions/_portable/`, and `supabase/functions/_shared/portable/` from this project
2. Copy edge functions to `supabase/functions/{generate-questions,generate-lesson-plans,generate-escape-room,generate-curriculum-reading}/`
3. Copy `_shared/portable/*` into its own `_shared/`
4. Copy the lib + UI components into the target codebase
5. Add a route (likely `/_authenticated/ai-generate` next to `/canvas-export`) with tabs for each generator
6. Wire its existing standards source to the `standards` prop

## What's NOT in scope

- We are not porting standards data itself. Each app keeps its own. (NGSS data is ~2 MB and project-specific.)
- We are not porting persistence (DB inserts). The dialogs return generated content via callback; target app decides what to do with it.
- We are not porting NGSS-specific tagger functions (`ngss-tagger`, `standards-tagger`) — those depend on full NGSS data. Can be a follow-up.
- We are not touching the originals in this project. They keep working.

## Technical notes

- Edge fns stay JWT-verified (default). Only secret needed in target: `LOVABLE_API_KEY` (already set there).
- All generators use `resolveModel(body, tier)` with `"heavy"` for lessons/escape rooms, `"default"` for questions, `"utility"` for short helpers — preserved exactly.
- UI components accept `onGenerated(result)` callback rather than writing to Supabase directly.
- Total new files in this project: ~20. No edits to existing files.

## Effort

One session here for the prep. One session in Teacher's Companion to wire it up.

Approve and I'll start Phase 1.
