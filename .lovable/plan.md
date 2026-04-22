

## Deepen the UDL lesson template

**The core problem:** the AI is producing single-sentence UDL sections because (a) the prompt asks for a flat string per principle, and (b) the editor never renders the four UDL fields, so even when the AI returns more depth there's nowhere for it to live — and on regenerate it's silently dropped. We're going to fix all three layers (prompt → DB → editor) so UDL becomes a structured, multi-part section that mirrors the article you uploaded.

---

### 1. New structured UDL schema (per lesson)

Replace the four flat strings with a single structured JSON object, `udl_supports`, organized by CAST's three principles and their sub-checkpoints (matches the article's "Multiple modes of representation / action / engagement" framing):

```text
udl_supports = {
  engagement: {
    hook: "...",                        // recruit interest — authentic, relevant opener
    student_choice: ["...", "...", ...], // ≥2 concrete choice options (path / partner / product)
    collaboration: "...",                // pair, group, peer, fieldwork option
    sustain_effort: "...",               // varied challenge + mastery feedback cue
    self_regulation_prompt: "..."        // reflection / coping cue mid-lesson
  },
  representation: {
    visual: "...",                       // diagram / chart / slideshow / artifact suggestion
    auditory: "...",                     // read-aloud / podcast / verbal explanation
    text_supports: "...",                // outline / summary / study guide / sentence stems
    vocabulary_scaffolds: [              // beyond main vocab list — kid-friendly rephrase
      { term: "...", student_friendly: "...", visual_cue: "..." }
    ],
    big_idea_highlight: "...",           // single-sentence "what students must walk away with"
    background_activation: "..."         // hook to prior knowledge
  },
  action_expression: {
    response_modes: ["written", "verbal", "diagram", "build/model", "demonstrate", ...], // ≥2
    physical_action_options: "...",      // movement / manipulatives / hands-on
    planning_scaffold: "...",            // organizer cue (e.g., "I've covered the four major topics…")
    progress_checkpoint: "...",          // mid-task self-check
    flexible_assessment: "..."           // ≥2 ways to demonstrate mastery
  },
  reflection_prompt: "..."               // closing metacognitive prompt
}
```

Key shifts vs. today:
- **Multi-field per principle** so the AI must produce specifics per CAST checkpoint, not one paragraph.
- **Arrays of choice options & response modes** force ≥2 concrete options.
- **Vocabulary scaffolds become objects** (term + student-friendly rephrase + visual cue), aligned to the article's "use materials such as e-books, PowerPoint, podcasts, manipulatives" + "give students organizing cues" + "demonstrate vocally and graphically" passages.

### 2. Database

One additive migration:
- `lesson_plans.udl_supports jsonb default '{}'::jsonb`

No data loss. Existing lessons (we just wiped the table) start with the new shape.

### 3. AI prompt rewrite (`generate-lesson-plans`)

- Drop the four flat `udl_*` fields from the tool schema.
- Add a single required `udl_supports` object matching the structure above, with **per-field minimum-detail requirements** (e.g., `student_choice` must have ≥2 items, `response_modes` ≥2 items, `vocabulary_scaffolds` ≥3 items, each prose field 2–4 sentences with concrete classroom-ready language — no placeholders like "differentiate as needed").
- Add explicit examples in the system prompt grounded in the article's language ("role-play important times in American history", "PowerPoint + podcast + manipulative", "organizing cue: 'I've covered the four major topics'").
- Apply the same `udl_supports` requirement inside `regenerate-lesson` (same edge function path) so regeneration carries depth through.

### 4. Editor surfacing (`LessonPlanEditor.tsx`)

New "UDL Supports" card (collapsible, after Differentiation) with three principle sub-sections:

```text
🎯 Engagement (the WHY)
   Hook · Student Choice (chips) · Collaboration · Sustain Effort · Self-Regulation Prompt

👁  Representation (the WHAT)
   Visual · Auditory · Text Supports · Vocabulary Scaffolds (term/rephrase/cue rows) ·
   Big Idea Highlight · Background Activation

✋ Action & Expression (the HOW)
   Response Modes (chips) · Physical Action · Planning Scaffold ·
   Progress Checkpoint · Flexible Assessment

💭 Closing Reflection Prompt
```

- All fields editable.
- Chips for `student_choice` and `response_modes` (add/remove like tags).
- `vocabulary_scaffolds` is an add/remove row list (same UX pattern as the existing Vocabulary card).
- Each principle gets its own colored bubble (Engagement = warm yellow, Representation = soft blue, Action & Expression = soft green) so UDL is visually distinct from other lesson sections.

### 5. DOCX export

Update `export-lesson-docx.ts` to render the new `udl_supports` block as a structured section in the exported Word file (one heading per principle, bulleted sub-fields). So when you print/share, the UDL depth comes through.

### 6. Memory update

Update `mem://features/udl-core` and `mem://features/lesson-planner/editor` to reflect the new `udl_supports` schema and the editor's UDL Supports card.

---

### Files changed

**New:**
- One migration adding `lesson_plans.udl_supports`.

**Edited:**
- `supabase/functions/generate-lesson-plans/index.ts` — new structured tool schema + richer prompt.
- `src/pages/LessonPlanEditor.tsx` — new UDL Supports card, save/load mapping for `udl_supports`.
- `src/components/RegenerateLessonDialog.tsx` — pass through new shape.
- `src/lib/export-lesson-docx.ts` — render UDL structured block.
- `.lovable/memory/features/udl-core.md`, `.lovable/memory/features/lesson-planner/editor.md`.

After this lands, regenerate the MS-ESS1 lesson and you should see classroom-ready specifics for every CAST checkpoint, not one-line summaries.

