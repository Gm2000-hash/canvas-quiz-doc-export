# Standards Mastery Matrix in the Canvas Analytics tab

Add a horizontal accordion table to the Analytics tab: students down the left, standards across the top, each cell showing a 1-4 mastery level.

## Where the data comes from

The Results tab already computes per-student, per-question scores from the Canvas quiz report CSV and maps each question to its NGSS/Idaho standards. That same computation feeds this new grid — no new API calls, no new database tables.

Because the two tabs are separate views, the Results tab will publish its computed matrix to a small shared in-memory store (plus a snapshot in browser storage so it survives a page reload). The Analytics tab reads it.

- If a report has been loaded in Results, the matrix appears in Analytics with a note naming the quiz and course it came from.
- If nothing has been loaded yet, Analytics shows an empty state with a "Load a quiz in Results" button that switches tabs.

## The table

- Left column: student names, frozen while scrolling right.
- Column headers: three accordion levels expanding to the right — discipline (Physical Science / Life Science / Earth & Space Science), then domain (e.g. MS-PS1), then individual standard code (e.g. MS-PS1-1). All levels start collapsed; clicking a header expands its children to the right.
- Cells: mastery level 1-4, color-coded (4 green, 3 light green, 2 amber, 1 red), with a tooltip showing points earned / points possible and percent.
- Parent (collapsed) cells show the average of their child levels to one decimal.
- Final row: class average per column.
- Blank cell when a student has no scored questions for that standard.

## Scale

Percent correct converts to a level: 4 = 90% and above, 3 = 75-89%, 2 = 60-74%, 1 = below 60%.

## Technical notes

- New `src/lib/standards-mastery.ts`: shared types, a discipline/domain/code parser for NGSS-style codes (Idaho and untagged codes fall into an "Other" discipline group), percent-to-level conversion, and a module-level store with a change event plus `sessionStorage` snapshot.
- `src/pages/CanvasResults.tsx`: publish the existing `studentStandardMatrix` / `allStandards` result (with quiz + course labels) to the store when the report step renders. No changes to the existing mapping or report UI.
- New `src/components/StandardsMasteryMatrix.tsx`: the accordion grid, self-contained, driven by the store.
- `src/pages/QuizAnalytics.tsx`: render the matrix in a new card inside the Canvas sub-tab, below the existing quiz summary table.
