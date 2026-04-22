

## Add depth + storytelling guarantees to the 5-act reading

Building on the previously approved 5-act narrative plan, this revision tightens the prompt so every act gives students enough context to actually understand both the science and the human story — no thin or summary-style paragraphs.

### What changes

**1. Per-act minimum depth requirements**

Rewrite the system + user prompts in `generate-curriculum-reading/index.ts` so each of the five acts has an explicit length floor and a content checklist. The AI will be told:

- **Act 1 — Exposition (2 paragraphs):** Set the scene of the scientific question or natural phenomenon. Establish what was known (and not known) at the time, and why this question mattered to people then. Plant the hook.
- **Act 2 — Rising action (3-4 paragraphs):** This is the **story-rich** scientist section. Required to include: birth era + place, family/social context, what drew them into science, the obstacles they faced (poverty, prejudice, war, lack of equipment, scientific resistance, personal loss, etc.), the specific problem they became obsessed with, and what daily life in their lab or fieldwork actually looked like. Treat them as a character, not a footnote. Use sensory and biographical detail.
- **Act 3 — Climax (2-3 paragraphs):** The breakthrough moment — described with narrative tension (the failed attempts, the "aha", the experiment that finally worked). End each climax by explicitly mapping the discovery onto the targeted content standard so students see the connection.
- **Act 4 — Falling action (3-4 paragraphs):** The deep teaching pass. Re-explain the underlying science thoroughly — mechanisms, vocabulary in context, diagrams referenced in prose, common misconceptions corrected. This is where students "get it" technically.
- **Act 5 — Denouement (2-3 paragraphs):** Modern, real-world case study (named event, place, year when possible) showing the concept active in the world today. Connect back to the scientist's original question to close the arc.

Total: ~12-16 paragraphs (up from 10-14) so depth isn't sacrificed.

**2. Anti-thinness guardrails added to the prompt**

Explicit "do not" rules baked into the system prompt:

- No paragraph shorter than ~4 sentences.
- No vague summary lines like "this was a major discovery" — every claim must be specific (what, where, who, when, why it mattered).
- No skipping the scientist's hardships, era, or personality — these are required, not optional.
- No restating the act labels in the output text; the structure is invisible to the reader.

**3. Storytelling voice instructions**

Add a "voice" paragraph to the system prompt: warm, vivid, third-person narrator; use scenes, not bullet points; let the scientist speak (paraphrased dialogue is allowed); ground abstract science in physical, observable detail; aim for the tone of a great middle-grade nonfiction book (think *Hidden Figures Young Readers Edition* or *The Boy Who Harnessed the Wind*).

**4. Same depth applied to regeneration**

Update the `intro` and `reading` regeneration prompts in `handleRegeneration` so partial regenerations preserve the same depth standards (Act 1-2 for intro; full 5-act with all checklists for reading).

**5. UDL inserts stay, but moved**

Inline vocabulary callouts, the "Try it your way" choice block, and the closing "Reflect:" prompt remain — they're appended *after* the denouement so they don't break the narrative flow.

### Files changed

- `supabase/functions/generate-curriculum-reading/index.ts` — system + user prompt rewrite, regeneration prompt rewrite, paragraph-count guidance bumped.
- `.lovable/memory/features/lesson-planner/generation.md` — record the per-act depth checklist + storytelling voice rules as the new generation contract.

### Out of scope

Same as before: existing readings in the DB are untouched; this affects new and regenerated content only. No DB or client-side changes.

