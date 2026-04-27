# Color-code standards by rigor (DoK 3+ count)

Replace the current "any question count" coloring on standard chips with a rigor-based rule:

| Color | Meaning | DoK 3+ questions on this standard |
|-------|---------|-----------------------------------|
| Green | Strong rigor coverage | 10 or more |
| Yellow | Moderate rigor coverage | 4–9 |
| Red | Weak rigor coverage | 3 or fewer (including 0) |

A question counts toward a standard's tally only if `dok_level >= 3`.

## Where the colors will appear

The Question Bank shows standards in two places — both will use the same rule for consistency:

1. **Standards Coverage grid** (the panel near the top of the Question Bank with all the small `MS-LS1-3`, `6.RP.A.1`, etc. chips). Today these chips are colored by raw question count (red if 0, yellow if ≤2, green if >2). They will switch to the DoK-3+ rule above.
2. **Grouped view substandard rows** (when you expand a discipline tile like Life Science → MS-LS1, the individual `MS-LS1-1`, `MS-LS1-2`… badges). The badge color will follow the same rule.

The tooltip on each chip will also show "X questions at DoK 3+ of Y total" so the meaning of the color is obvious on hover.

## What stays the same

- Discipline tile cards (Life Science / Earth & Space / Physical / Idaho subjects) keep their current "X/Y standards covered (Z%)" summary — unchanged.
- Total question counts, filters, charts, and the question list itself are unchanged.
- "Untagged" pile is unchanged.

## Technical notes

- `StandardsCoverageGrid`'s `questions` prop currently exposes only `{ id, standards }`. Extend it to include `dok_level: number | null` so the grid can compute rigor counts. Caller in `QuestionBank.tsx` already has `dok_level` on each question, so wiring is one extra field.
- Add a small helper `rigorTone(count: number): "red" | "yellow" | "green"` and reuse it in both `StandardChip` (coverage grid) and the substandard badge in the grouped view.
- Keep the existing `bg-success / bg-warning / bg-destructive` Tailwind tokens — no new colors introduced.

## Files touched

- `src/components/StandardsCoverageGrid.tsx` — add `dok_level` to prop type, compute DoK-3+ count per standard, swap chip color logic, update tooltip text.
- `src/pages/QuestionBank.tsx` — pass `dok_level` through to the grid; apply the same color rule to the per-substandard badge in the expanded discipline view.

No DB changes, no new dependencies, no edge function changes.
