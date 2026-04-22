---
name: Curriculum reading generation
description: Five-act narrative arc for curriculum readings — exposition, story-rich scientist, climax mapped to standard, deep technical re-teaching, modern case study; story-first naming; preferred scientist roster; anti-thinness guardrails
type: feature
---

# Curriculum reading generation contract

All AI-generated curriculum readings (full generation + `intro`/`reading` regenerations) follow a **five-act narrative arc** anchored in a real historical scientist. Edge function: `supabase/functions/generate-curriculum-reading/index.ts`.

## Five-act structure (12-16 narrative paragraphs total)

The reader **never sees act labels** — the structure is invisible in the prose.

1. **Act 1 — Exposition (2 paragraphs)** — scene of the scientific question, what was/wasn't known at the time, why it mattered. Plant the hook. No "Imagine..." openings.
2. **Act 2 — Rising action (3-4 paragraphs)** — story-rich scientist intro. **Required**: birth era + place, family/social context, what drew them to science, ≥2 specific obstacles (poverty, prejudice, war, lack of equipment, scientific resistance, illness, gender/racial barriers, exile, personal loss), the problem that obsessed them, sensory detail of daily lab/fieldwork life. Treat as a character, paraphrased dialogue welcome.
3. **Act 3 — Climax (2-3 paragraphs)** — breakthrough with narrative tension (failed attempts, the "aha"). Final paragraph **must explicitly map the discovery onto the targeted content standard**.
4. **Act 4 — Falling action (3-4 paragraphs)** — deep technical re-teaching: mechanisms, vocabulary defined inline, diagrams referenced in prose, ≥1 common misconception named and corrected.
5. **Act 5 — Denouement (2-3 paragraphs)** — modern real-world case study (named event/place/year when possible) connecting back to the scientist's original question.

After Act 5, append the UDL closing block in the same `reading_paragraphs` array: inline vocabulary callouts (already woven through), a "Try it your way" paragraph (2-3 engagement modes), and a labeled "Reflect:" prompt.

## Field mapping (textbook format)

- `intro` (5-7 paragraphs) = Acts 1 + 2 (exposition + story-rich scientist).
- `explanation` (3-4 paragraphs) = Act 4 (deep technical pass).
- `reading.reading_paragraphs` = the full 12-16 paragraph five-act arc + UDL block.

## Naming convention

`reading_title` is **plain and descriptive** — e.g. "Marie Curie and the Hidden Element", "Galileo's Forbidden Sky". Do **not** prefix the standard code (e.g. "MS-PS1: ...") onto the title. Standard tagging happens at the DB level via `curriculum_lesson_standards`.

## Preferred scientist roster

Pick one of these unless the standard genuinely makes them implausible (e.g. modern plate tectonics, mRNA vaccines): Albert Einstein, Marie Curie, Isaac Newton, Charles Darwin, Nikola Tesla, Galileo Galilei, Ada Lovelace, Pythagoras, Carl Linnaeus, Rosalind Franklin. If none fit, choose another **real, historically documented** scientist and justify the choice naturally inside Act 2 — never invent a scientist.

## Anti-thinness guardrails (hard rules in the prompt)

- No paragraph shorter than ~4 sentences (aim 5-7).
- No vague summary lines ("this was a major discovery"). Every claim specific: what, where, who, when, why.
- The scientist's hardships, era, and personality are **required** in Act 2, not optional.
- No act labels printed in output prose.
- No bullet lists inside reading paragraphs — continuous narrative only.

## Voice

Warm, vivid, third-person narrator. Scenes, not summaries. Paraphrased dialogue welcome. Ground abstractions in physical, observable detail. Tone of *Hidden Figures Young Readers Edition*, *The Boy Who Harnessed the Wind*, *The Disappearing Spoon* — curiosity-forward, never condescending.

## Regeneration parity

`handleRegeneration` enforces the same contract: regenerating `reading` rebuilds the full five-act arc + UDL block; regenerating `intro` rebuilds Acts 1-2 with the same biographical depth requirements and anti-thinness guardrails.

## UDL doctrine

Wrapped via `withUdl()` from `supabase/functions/_shared/udl.ts`. Inline vocabulary callouts = Representation; "Try it your way" = Action & Expression; "Reflect:" = Engagement / Self-Regulation. UDL block lands **after** Act 5 so it doesn't break narrative flow.
