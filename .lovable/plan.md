

## UDL-aligned reset: clear the deck, then bake UDL into every generator

Two phases. Phase 1 wipes existing generated/uploaded learning content so we start clean. Phase 2 makes UDL Guidelines v2.2 (the PDF you uploaded — CAST framework: Engagement / Representation / Action & Expression) the unbreakable backbone of every AI prompt, paired with the state standards (NGSS + Idaho).

---

### Phase 1 — Wipe generated & uploaded materials

**Deleted (full reset):**
- `lesson_plans` + `lesson_plan_standards`
- `curriculum_lessons` + `curriculum_lesson_standards`
- `isat_exams` + `exam_review_materials`
- `h5p_activities` + `h5p_activity_standards`
- `custom_quizzes`
- `question_bank` + `question_bank_standards`
- `units` (cascading anchor)
- `library_books` rows **+ all PDFs in the `library-pdfs` storage bucket + cover images in `book-covers`**
- `dashboard_layouts` (so the reading dashboard rebuilds against an empty library)
- `standard_key_terms` (regenerate against UDL-aware prompts later)
- `activity_completions` (orphaned student attempts on now-deleted activities)

**Preserved:**
- `profiles` (incl. your new `ai_preferences`), `user_roles`
- `notes` + `note_links` (your personal notebook is untouched)
- `lti_platforms`, `lti_sessions` (Canvas integration intact)
- All auth, avatars bucket, `activity-media` bucket

Done as one migration with explicit `DELETE` statements + a storage cleanup script for `library-pdfs` and `book-covers`.

---

### Phase 2 — UDL becomes the core of every AI prompt

#### 2a. Shared UDL prompt module

New file: **`supabase/functions/_shared/udl.ts`**

Exports:
- `UDL_CORE_PROMPT` — a tight, reusable system-prompt fragment that every generator prepends. Summary of what it enforces:
  - **Standards = the *what*** (NGSS / Idaho code + description always restated verbatim).
  - **UDL = the *how***, applied across all three principles every time:
    - **Engagement** — recruit interest (choice, relevance, authentic context), sustain effort (clear goals, varied challenge, collaboration cues, mastery feedback), self-regulation (reflection prompts).
    - **Representation** — perception (plain-language + visual/diagram suggestions where relevant), language & symbols (define vocabulary inline, illustrate through multiple media), comprehension (activate prior knowledge, highlight big ideas, scaffold processing).
    - **Action & Expression** — physical action (multiple response modes), expression & communication (multiple media for student response), executive function (goal-setting, planning prompts, progress checkpoints).
  - **Output discipline**: every generated artifact must include explicit fields/sections that surface UDL choices (see per-generator changes below) so they're not invisible.

- `UDL_PRINCIPLE_HINTS` — short reusable snippets for per-task emphasis (used later if we add a per-run picker).
- Helper `withUdl(systemPrompt: string, taskHint?: string)` that prepends `UDL_CORE_PROMPT` and optionally a task-specific hint.

#### 2b. Generator-by-generator updates

Every generator wraps its existing system prompt with `withUdl(...)` and adds UDL-required output fields. **Prompts only — no schema changes** unless noted.

| Edge function | UDL additions to output |
|---|---|
| `generate-lesson-plans` | New required fields: `udl_engagement` (hook + choice options), `udl_representation` (visual/auditory/text alternatives, vocabulary supports), `udl_action_expression` (≥2 ways students can demonstrate learning), `reflection_prompt`. Existing `differentiation` field expanded with concrete UDL-tagged supports. |
| `generate-curriculum-reading` | Reading retains the 3-part framework (Scientist Story / Tech Explanation / Student Connection) but now adds: inline vocabulary callouts (Representation), a "Try it your way" choice block (Action & Expression), and a reflection question (Engagement/Self-Regulation). |
| `generate-content` (questions) | Each question gets `udl_supports`: `{ visual_aid_suggestion, simplified_rephrase, alt_response_modes }`. Question sets must include a mix of response formats (not all multiple-choice). |
| `generate-questions` | Same UDL fields as above. |
| `generate-isat-exam` | Exam-level metadata adds `udl_accommodations_summary`; each question carries `udl_supports`. Distribution now requires varied DOK + varied response types per UDL Action & Expression. |
| `generate-exam-review` | Study guide adds `multi_modal_review` (text + visual + practice variants). Flashcards include both verbal and visual cue suggestions. Review lesson explicitly tagged with which UDL principle each section serves. |
| `generate-escape-room` | Each puzzle must offer ≥2 solution paths (Action & Expression) and include accessibility notes (Representation). Narrative hooks explicitly tied to Engagement/relevance. |
| `generate-h5p-activity` | Activity content includes alt text suggestions, optional audio/visual variants where the H5P type supports it, and a "stretch / scaffold" pair where applicable. |
| `generate-key-terms` | Each term returned with: definition, kid-friendly rephrase, visual/example cue, and a usage sentence (full Representation coverage). |
| `lesson-brainstorm` | Brainstorm ideas explicitly bucketed by UDL principle so you see which lever each suggestion pulls. |
| `suggest-dok-blooms` | Suggestions include a UDL-aligned rationale (why this DOK level + what UDL supports it needs). |
| `standards-tagger` / `ngss-tagger` | No prompt change — these classify, they don't generate. |
| `parse-import-file` / `import-google-link` | No UDL injection — these are parsers, not generators. |

#### 2c. Frontend surfacing

So UDL isn't invisible to you, the editors render the new fields when present:

- **Lesson editor** (`LessonPlanEditor.tsx`) — new collapsible "UDL Supports" section showing the three principle blocks; editable like other fields.
- **Curriculum reading viewer/editor** (`CurriculumEditor.tsx`, `CurriculumReadingViewer.tsx`) — vocabulary callouts and reflection prompt rendered inline; "Try it your way" rendered as a styled aside.
- **Question editor** (`QuestionEditor.tsx`) — small "UDL supports" panel with the suggested visual aid / rephrase / alt response.
- **ISAT editor** (`ISATExamEditor.tsx`) — top-of-exam UDL accommodations summary; per-question UDL chips.
- **Generation dialogs** (Content / ISAT / EscapeRoom / RegenerateLesson) — small badge "UDL-aligned" next to the engine selector so you can see at a glance.

No new selector UI for UDL emphasis in this phase (we keep dialogs simple — UDL is always on). We can add a per-run "UDL emphasis" picker in a follow-up if useful.

#### 2d. Memory update

Add `mem://features/udl-core` describing the always-on UDL framework, the shared module, and the per-generator output contract, so future changes stay consistent.

---

### Out of scope for this round

- Renaming/moving any existing UI sections.
- Changing standards data sources (NGSS middle-school whitelist + Idaho framework stay as-is).
- Touching the activity *players* (UDL-friendly UI of players is a separate later pass once the new content is flowing).
- The careers/NextSteps lessons import — that's external content, not AI-generated.

### Files added / changed

**Migration (deletion):** one new SQL migration + storage cleanup edge invocation.

**New:**
- `supabase/functions/_shared/udl.ts`
- `mem://features/udl-core`

**Edited (prompts only, ~15 functions):** `generate-lesson-plans`, `generate-curriculum-reading`, `generate-content`, `generate-questions`, `generate-isat-exam`, `generate-exam-review`, `generate-escape-room`, `generate-h5p-activity`, `generate-key-terms`, `lesson-brainstorm`, `suggest-dok-blooms`.

**Edited (frontend surfacing):** `LessonPlanEditor.tsx`, `CurriculumEditor.tsx`, `CurriculumReadingViewer.tsx`, `QuestionEditor.tsx`, `ISATExamEditor.tsx`, `GenerateContentDialog.tsx`, `GenerateISATExamDialog.tsx`, `GenerateEscapeRoomDialog.tsx`, `RegenerateLessonDialog.tsx` (badge only).

After approval I'll run the wipe migration first (irreversible — confirming you want **all** generated/uploaded materials gone, including the PDFs in your library), then layer in the UDL prompt module and roll it through every generator.

