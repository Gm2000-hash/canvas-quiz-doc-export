

## Unified AI engine selection — defaulting to Gemini 3 Flash

Building the unified AI engine system as described, with **Gemini 3 Flash Preview** set as the global default everywhere.

### What you'll get

A single **AI Settings** panel in your Profile page where you choose:

- **Default model**: pre-set to **Gemini 3 Flash Preview** (newest fast model)
- **Per-task overrides** (optional):
  - **Heavy tasks** (ISAT exams, escape rooms, full curriculum readings) — suggested: Gemini 2.5 Pro
  - **Utility tasks** (tagging, key terms, suggestions) — suggested: Gemini 2.5 Flash Lite

Inside each generator dialog (Generate Content, ISAT, Escape Room, Regenerate Lesson), a small **"Engine ▾"** selector lets you override per run.

### Available engines

- **Gemini 3 Flash Preview** ← new default
- Gemini 2.5 Flash, Gemini 2.5 Flash Lite, Gemini 2.5 Pro
- Gemini 3.1 Pro Preview
- GPT-5, GPT-5 Mini, GPT-5 Nano, GPT-5.2

### Architecture

```text
┌─ profiles.ai_preferences (jsonb) ────────┐
│  default_model: "google/gemini-3-flash-preview"
│  overrides: { heavy: "...", utility: "..." }
└──────────────────────────────────────────┘
            │
            ▼  (read on app load + cached)
   useAiPreferences() hook
            │
            ▼  (sent as `model_override` in request body)
   ┌────────────────────────────────────────┐
   │ Every generator edge function:         │
   │   model = body.model_override          │
   │        ?? PRESET[task]                 │
   │        ?? "google/gemini-3-flash-preview"
   └────────────────────────────────────────┘
```

### Implementation steps

**1. Database migration**
- Add `ai_preferences jsonb default '{}'::jsonb` to `profiles` table.

**2. Shared model resolver (edge functions)**
- New file `supabase/functions/_shared/model.ts`:
  - `AVAILABLE_MODELS` constant (id, label, tier)
  - `DEFAULT_MODEL = "google/gemini-3-flash-preview"`
  - `resolveModel(body, taskType)` helper
- Replace hard-coded `model:` string in every generator with `resolveModel(...)`.

Functions touched (model line only — no prompt changes):
`generate-content`, `generate-questions`, `generate-lesson-plans`, `generate-curriculum-reading`, `generate-isat-exam`, `generate-escape-room`, `generate-exam-review`, `generate-h5p-activity`, `generate-key-terms`, `lesson-brainstorm`, `suggest-dok-blooms`, `standards-tagger`, `ngss-tagger`, `parse-import-file`, `import-google-link`.

**3. Frontend wiring**
- `src/hooks/useAiPreferences.ts` — read/write profile preferences with sensible defaults.
- `src/components/AiEngineSelect.tsx` — shared dropdown component.
- `src/components/AiPreferencesCard.tsx` — settings card for Profile page.
- `src/lib/content-generator.ts` — accept and forward `modelOverride`.
- Mount engine selector in: `GenerateContentDialog`, `GenerateISATExamDialog`, `GenerateEscapeRoomDialog`, `RegenerateLessonDialog`.
- Mount `<AiPreferencesCard />` inside `src/pages/Profile.tsx`.

**4. Backwards compatibility**
- If `ai_preferences` is empty, resolver returns `google/gemini-3-flash-preview` for all tasks.
- Existing 402/429 toast handling preserved.
- Image generation models (cover art, question images) untouched.

### Files added / changed

- **New**: `supabase/functions/_shared/model.ts`
- **New**: `src/hooks/useAiPreferences.ts`
- **New**: `src/components/AiEngineSelect.tsx`
- **New**: `src/components/AiPreferencesCard.tsx`
- **Migration**: add `ai_preferences` column to `profiles`
- **Edited**: 15 generator edge functions (one-line model swap each)
- **Edited**: `src/lib/content-generator.ts`
- **Edited**: `GenerateContentDialog.tsx`, `GenerateISATExamDialog.tsx`, `GenerateEscapeRoomDialog.tsx`, `RegenerateLessonDialog.tsx`
- **Edited**: `src/pages/Profile.tsx`

### Out of scope

- No prompt rewrites — only the `model:` field.
- No streaming changes.
- Image-generation models stay on their dedicated image models.

