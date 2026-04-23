

# Add Optional Images & Manipulatives to ISAT Practice Exams

Make exams text-only by default. Each question gets an "Enhance" action that lets the AI suggest an image prompt (you tweak it), generates a diagram or interactive manipulative, rewrites the stem to reference it, and bumps DoK.

---

## How it will feel to use

1. **Generate exam** — same as today. Output is text-only (no images).
2. **In the exam editor**, each question has a new **"Enhance with image / manipulative"** button.
3. Clicking it opens a dialog with:
   - **Format picker**: Static diagram · Drag-and-drop labeling · Hotspot click-the-part
   - **AI-suggested prompt** (auto-drafted from the question + standard) shown in an editable textarea
   - **"Also rewrite the question to use it & raise DoK"** toggle (on by default)
   - **Generate** button → preview → **Attach** or **Try again**
4. Drag-and-drop and hotspot manipulatives get saved as H5P activities and embedded into the question (rendered inline by the player).
5. **On the ISAT exam list page** (`ISATExamList.tsx`), each exam tile gets a **"Enrich with images"** action to walk through unenhanced questions one-by-one in a wizard.

---

## What changes in the app

### A. Generation stays text-only
- `generate-isat-exam` edge function: strip any image instructions from the system prompt; ensure questions are produced **without** `image_url` or `media`.

### B. Per-question "Enhance" dialog (editor)
- New `EnhanceQuestionDialog.tsx` opened from the existing Media/Image slot in `ISATExamEditor.tsx`.
- Three tabs: **Diagram**, **Drag-and-Drop**, **Hotspots**.
- "Suggest prompt" calls a new edge function (or a mode flag) that returns a one-paragraph image prompt + (optionally) a rewritten question stem with raised DoK and updated answer choices that explicitly reference the visual.

### C. Two AI paths

**Diagram (already partially built)**
- Reuse `generate-question-image` edge function. Add a `suggest_only: true` mode that returns a draft prompt without generating, so the dialog can prefill the textarea.

**Drag-and-Drop labeling & Hotspots (new)**
- New edge function `enhance-question-manipulative` that:
  1. Generates the base diagram image (Gemini image model)
  2. Asks the text model for label positions / hotspot regions and correct answers
  3. Creates an `h5p_activities` row (`activity_type: 'drag_and_drop'` or `'image_hotspots'`) tied to the user
  4. Returns `{ activity_id, image_url, suggested_question_text, suggested_answers, dok_level }`
- Editor stores this on the question as `media: { type: 'h5p', activity_id, url }` (extends the existing `MediaEmbed` shape).
- `ISATExamPlayer.tsx` gets a small renderer: when `media.type === 'h5p'`, mount the existing `ActivityPlayer` component inline; the H5P activity's score becomes the auto-graded answer.

### D. DoK & question rewrite
- When "Also rewrite" is on, the dialog applies AI-returned `question_text`, `answers`, and `dok_level` to the question (capped at 4). User sees a diff-ish preview ("Original / Enhanced") before clicking **Apply**.

### E. Bulk enrichment from the list page
- `ISATExamList.tsx` gets a new "Enrich with images" overflow action per exam.
- Opens a wizard modal that walks through every question lacking `image_url`/`media`, one at a time, with the same Enhance dialog. Skip / Apply / Quit-and-save.

### F. Public exam exposure
- `get_public_exam` SQL function already passes `image_url` and `media` through. Extend it so `media.activity_id` is included so embedded H5P plays for students taking shared/Canvas-launched exams. (Migration: update the function to whitelist `activity_id` inside the media object.)

---

## Technical reference (for implementer)

| Item | Change |
|---|---|
| `supabase/functions/generate-isat-exam/index.ts` | Forbid image fields in output schema. |
| `supabase/functions/generate-question-image/index.ts` | Add `mode: 'suggest_prompt'` returning `{ suggested_prompt }` only. |
| `supabase/functions/enhance-question-manipulative/index.ts` (new) | Generates image + H5P activity (drag-drop or hotspots), inserts into `h5p_activities`, returns IDs + rewritten stem/answers/DoK. |
| `src/components/EnhanceQuestionDialog.tsx` (new) | 3-tab dialog, prompt edit, preview, Apply. |
| `src/pages/ISATExamEditor.tsx` | Replace inline `AIImageGenerator` with "Enhance" button → dialog. |
| `src/pages/ISATExamPlayer.tsx` | Render `media.type === 'h5p'` via `ActivityPlayer`; pipe its score back into `studentAnswers` for auto-grading. |
| `src/components/ISATExamList.tsx` | Add "Enrich with images" wizard entry point. |
| `MediaEmbed` type in `src/lib/h5p-types.ts` | Add `'h5p'` variant with optional `activity_id`. |
| Migration | Update `public.get_public_exam` to include `media.activity_id` in its whitelist. |

No new tables; H5P activities reuse the existing `h5p_activities` table.

