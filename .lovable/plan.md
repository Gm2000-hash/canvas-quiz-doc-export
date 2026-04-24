

# Improve NGSS tagging for Canvas-imported quizzes

**Root cause:** The same model is used in both flows, but the Canvas path feeds it raw HTML with no answer choices and no subject/grade context, then asks a low-tier model to figure it out. Quality drops accordingly.

## Changes

### 1. Clean Canvas question text before sending to the tagger
In `src/components/QuizBrowser.tsx` (and the same shape in `src/pages/CanvasResults.tsx`), build a **sanitized, enriched** payload per question:

- Strip HTML tags, decode entities, collapse whitespace
- Drop `<img>`/`<iframe>`/`<style>` content
- **Append the answer choices** (for `multiple_choice`, `true_false`, `multiple_answers`, `matching`) into the `question_text` we send. Format:
  ```
  STEM: <clean stem>
  CHOICES: A) … B) … C) … D) …
  ```
- Cap at ~1500 chars per question to stay within token budget for batches.

Add a small helper `buildTaggerText(question)` co-located in `src/lib/canvas-api.ts` so both QuizBrowser and CanvasResults use the exact same logic.

### 2. Pass subject + grade context on the Canvas call
`tagQuestionsWithStandards(...)` already accepts `subject` and `grade`. The Canvas flow currently passes neither. Pull the teacher's defaults from `useProfileDefaults()` (already used in `CanvasResults.tsx`) and forward them in `QuizBrowser` too. For NGSS-only courses we'll pass `subject: "Science"` and the teacher's default grade — narrows the candidate set.

### 3. Bump tagging to the `"default"` model tier
In `supabase/functions/standards-tagger/index.ts`, change `resolveModel(body, "utility")` → `resolveModel(body, "default")`. This moves Canvas tagging from the cheapest model to Gemini 3 Flash Preview, which handles noisy multi-question inputs much better. Cost impact is modest because tagging runs once per quiz import.

### 4. Strengthen the prompt for noisy inputs
Inside `buildNGSSPrompt(...)`:
- Add an explicit rule: *"The input may include answer choices after a `CHOICES:` marker — use them as primary evidence for content topic."*
- Add: *"If the stem is generic (e.g. 'Which of the following…'), rely heavily on the choices and key terms to infer the standard."*
- Reinforce: *"Never return HS- standards. If the only plausible match is high-school level, return an empty array."*

### 5. Retire the old `ngss-tagger` path (low-risk cleanup)
Switch `src/components/QuestionTagPickers.tsx` from `tagQuestionsWithNGSS` → `tagQuestionsWithStandards(..., "ngss")` so the in-app flow benefits from the same improved prompt + key terms. We keep the `ngss-tagger` edge function deployed for back-compat but stop calling it from the client. (No edge function deletion in this pass.)

### 6. Add a one-line "Re-tag with AI" action on the Canvas results screen
`CanvasResults.tsx` already has retag logic — surface a per-question "Re-tag" button (icon-only) next to weak/missing matches so the teacher can quickly correct outliers without re-running the whole batch. Uses the same improved pipeline.

## Files touched

- `src/lib/canvas-api.ts` — add `buildTaggerText()` helper
- `src/components/QuizBrowser.tsx` — use helper + pass subject/grade
- `src/pages/CanvasResults.tsx` — use helper + per-question re-tag button
- `src/components/QuestionTagPickers.tsx` — switch to unified `standards-tagger`
- `supabase/functions/standards-tagger/index.ts` — bump model tier + prompt tweaks

No DB migrations. No new edge functions. No new dependencies.

## Expected outcome

- Canvas-imported NGSS tags should jump noticeably in accuracy (fewer empty arrays, fewer wrong-domain matches like LS for a PS question).
- The in-app and Canvas flows finally use the same prompt + key terms, so quality is consistent across the app.
- Teacher gets a fast manual override on the results screen for the rare miss.

