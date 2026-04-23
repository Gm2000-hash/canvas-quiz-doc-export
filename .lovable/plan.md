

# Bento-Style Layout Makeover (Wix-Inspired)

Restyle the app to match the sleek, editorial monochrome aesthetic of the referenced Wix template — a top "pill" navigation bar, a hero brand tile, an asymmetric "bento grid" of feature tiles with oversized headlines, and one solitary accent tile to break up the monochrome.

## Visual Direction (from the template)

- Pure white background, soft `#F2F2F2` tile fills, deep black ink text
- Pill-shaped nav buttons across the top (rounded-full, grey capsule)
- Oversized display headline ("Crafting Digital Experiences That Feel Effortless" → "Plan Lessons Your Students Actually Remember")
- Bento layout: tiles of mixed sizes, generous radius (`rounded-3xl`), tight inner padding
- Single coral accent tile (the only color on the page) for visual anchor
- Round avatar floating over the hero tile
- Section labels small/uppercase (e.g. "About", "Selected Work")

## Plan

### 1. Top Navigation (replace left sidebar on Home)

- Keep the existing left `WorkspaceSidebar` available but **collapse it by default** on the dashboard so the top nav becomes primary.
- Add a horizontal **pill nav** in `AppShell`'s header showing: brand chip on the left (`TEACHERKIT / TOOLKIT`), and on the right, pill buttons for: `CURRICULUM`, `QUESTIONS`, `ACTIVITIES`, `STANDARDS`.
- Pills: `rounded-full bg-neutral-100 px-5 py-2 text-xs font-semibold tracking-wide uppercase`, hover → black bg / white text.
- Other inner pages keep the current sidebar behavior (no regression).

### 2. Bento Hero on the Dashboard (`src/pages/Home.tsx`)

Rebuild the dashboard as a 12-column asymmetric grid:

```text
┌─────────────────────────┬─────────────────────┬──────────┐
│ HERO TILE (cols 1-5)    │ ABOUT TILE (6-9)    │ CORAL    │
│ • avatar (round)        │ • "About"           │ ACCENT   │
│ • giant headline        │ • short bio /       │ (10-12)  │
│ • subhead               │   today's lessons   │ "Today"  │
│ • [View Curriculum →]   │ [View My Work →]    │ + count  │
├─────────────────────────┼─────────────────────┴──────────┤
│ EXPERTISE TILE (1-5)    │ FEATURE PREVIEW TILE (6-12)    │
│ • "Toolkit" label       │ • Large image / sketch         │
│ • pill chips:           │ • mini cards collage           │
│   Curriculum, Q-Bank,   │   (Question Bank, Activities,  │
│   Activities, Standards │    Reading Library)            │
│   ...                   │                                │
└─────────────────────────┴────────────────────────────────┘
```

- **Hero tile**: light grey gradient bg (`bg-gradient-to-br from-neutral-100 to-white`), avatar circle top-left, 4xl–6xl bold display headline, CTA = solid black pill button with arrow icon.
- **About tile**: white bg, "About" eyebrow, paragraph from teacher profile (subjects + grade levels rendered as a sentence), pill CTA "View My Work" → `/lesson-planner`.
- **Coral accent tile** (the *only* color on the page): solid `#FF6B47` (Sunkist coral), shows "Today" + today's lesson titles or "No lessons today", plus a download CV-style button → links to most recent lesson.
- **Expertise tile**: section label "Toolkit", chip list of every tool (each chip navigates), in pill style.
- **Feature preview tile**: large rounded image (rotating screenshot from `sketchLessonPlanner`/`sketchQuestionBank`), small floating mini-cards over it (the existing sketch icons reused).

### 3. "Selected Work" / Recent Activity strip

Below the bento, add a horizontal scroll row titled `RECENT WORK` showing the 3 most recent lesson plans or units. Each row:
- Tiny logo square (initials) + title + subject/grade + year.
- "View" pill button on the right.
- Below the row, a wide rounded preview image (use unit cover art if present).

### 4. "What I Do" → "What This App Does"

A 4-column numbered grid (`01.` `02.` `03.` `04.`) with the four pillars:
1. **Build Curriculum** — Units, lessons, pacing.
2. **Bank Questions** — NGSS/Idaho-tagged assessments.
3. **Create Activities** — H5P-style interactives.
4. **Export to Canvas** — One-click LMS sync.

Numbers in oversized light grey, headings in bold black, descriptions in muted grey.

### 5. Footer "About" Block

Wide rounded grey tile at the bottom: short app mission paragraph + "Learn More" pill → `/profile`.

### 6. Typography & Spacing Pass

In `src/index.css`, add a Wix-style display heading utility (no color changes — stays monochrome):
- `.display-xl` → `text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95]`
- `.eyebrow` → `text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold`
- `.pill-btn` → `rounded-full bg-neutral-100 hover:bg-black hover:text-white transition-colors px-5 py-2 text-xs font-semibold uppercase tracking-wide`
- `.bento-tile` → `rounded-3xl bg-neutral-50 border border-neutral-200 p-6 md:p-8`
- `.bento-tile--ink` → solid black variant
- `.bento-tile--coral` → the **single** allowed color tile (`bg-[#FF6B47] text-white`)

### 7. Files to modify

- `src/components/AppShell.tsx` — add top pill nav bar, default-collapse sidebar on `/`.
- `src/components/WorkspaceSidebar.tsx` — minor: respect collapsed default on home.
- `src/pages/Home.tsx` — full rebuild into bento layout (keep existing data fetches & drag/drop optional behind a "Customize" toggle — drag handles removed by default for clean look).
- `src/index.css` — add the utility classes above; no changes to color tokens (monochrome lock stays).

### 8. What stays the same

- Monochrome lockdown remains in force; coral is hard-coded inline only on the single accent tile.
- All routes, data hooks (`useProfile`, lesson counts, today's lessons), and tile destinations are preserved.
- All other pages (Curriculum, Question Bank, etc.) get the new top pill nav for free but keep their current layouts in this pass.

### 9. Out of scope (can do in a follow-up)

- Restyling the inside of Curriculum/QuestionBank/Activities pages to match bento.
- Dark mode variant of the new layout.
- Animated tile transitions on scroll.

