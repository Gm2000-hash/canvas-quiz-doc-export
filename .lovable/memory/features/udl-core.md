---
name: UDL core framework
description: Always-on UDL (CAST v2.2) layered onto state standards across every AI generator
type: feature
---

UDL Guidelines v2.2 (CAST: Engagement, Representation, Action & Expression) are the always-on **how** of every AI-generated artifact in this app, paired with state standards (NGSS / Idaho) which are the **what**.

**Shared module:** `supabase/functions/_shared/udl.ts`
- Exports `UDL_CORE_PROMPT` (the framework, baked-in non-negotiable).
- Exports `withUdl(systemPrompt, taskHint?)` — every generator wraps its system prompt with this.
- Exports `UDL_PRINCIPLE_HINTS` for future per-run emphasis pickers.

**Generators that wrap with `withUdl`:**
- `generate-lesson-plans` — schema extended with `udl_engagement`, `udl_representation`, `udl_action_expression`, `reflection_prompt`.
- `generate-curriculum-reading` — reading paragraphs must include inline vocab callouts, a "Try it your way" choice block, and end with a "Reflect:" prompt.
- `generate-content` — questions/lessons/readings, varied response formats and inline vocab supports.
- `generate-questions` — varied response formats; plain language; misconception-targeting distractors.
- `generate-isat-exam` — varied response formats; hints are concept-focused (Representation), not answer-leaking.
- `generate-exam-review` — multi-modal review paths in the study guide; verbal + visual cue pairs in flashcards.
- `generate-escape-room` — ≥2 solution paths per puzzle; escalating hints; relevance-driven narrative.
- `generate-h5p-activity` — plain language, inline term defs, alt-text-style visual descriptions where supported.
- `generate-key-terms` — terms chosen for teachable definitions and concrete cues.
- `lesson-brainstorm` — ideas labeled by which UDL principle they pull.
- `suggest-dok-blooms` — each suggestion notes the UDL support implied by the cognitive shift.

**Not wrapped (intentionally):** `standards-tagger`, `ngss-tagger`, `parse-import-file`, `import-google-link` — classifiers/parsers, not generators.

**Frontend surfacing:** Generation dialogs (`GenerateContentDialog`, `GenerateISATExamDialog`, `GenerateEscapeRoomDialog`, `RegenerateLessonDialog`) show a small "UDL-aligned" pill next to the engine selector. Lesson plans render UDL fields when present.

**Rule:** When adding a new AI generator, always import `withUdl` from `_shared/udl.ts` and wrap the system prompt. UDL is non-optional.
