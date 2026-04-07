

# Fix Math Exponents and Formatting Display in Questions

## Problem

Questions containing mathematical notation (exponents like x², fractions, expressions) display incorrectly because:
1. **AI generates plain text notation** — the edge function prompt doesn't instruct the AI to use HTML for math formatting (e.g., `x^2` instead of `x<sup>2</sup>`)
2. **Question Bank strips all HTML** — `stripHtml(q.question_text)` removes any formatting, turning `x<sup>2</sup>` back into `x2`
3. **Answer options also lack math rendering** — answer text in multiple choice, drag-and-drop categories, etc. is rendered as plain text

## Plan

### 1. Add KaTeX for Math Rendering

Install KaTeX (lightweight LaTeX math renderer). Create a `MathText` component that detects LaTeX delimiters (`$...$` for inline, `$$...$$` for block) and renders them as formatted math, while passing non-math content through as HTML via `RichContent`.

**New file**: `src/components/MathText.tsx`

### 2. Update AI Prompt to Use LaTeX Notation

Modify `supabase/functions/generate-questions/index.ts` to instruct the AI to:
- Use LaTeX notation for all math expressions: `$x^2$`, `$\frac{1}{2}$`, `$3 \times 10^5$`
- Use HTML `<sup>` / `<sub>` as fallback for simple exponents in science questions (e.g., CO`<sub>`2`</sub>`)
- This applies to both question text AND answer option text

### 3. Fix Question Bank Display

In `src/pages/QuestionBank.tsx`:
- Replace `stripHtml(q.question_text)` in the card display (line 476) with the new `MathText` component that preserves math formatting
- Keep `stripHtml` only for search filtering and delete confirmation (where plain text is fine)

### 4. Update All Question Rendering Locations

Replace plain-text question rendering with `MathText` in:
- `src/pages/QuestionBank.tsx` — question cards and edit dialog
- `src/pages/ISATExamPlayer.tsx` — answer options (question text already uses `RichContent`)
- `src/pages/ISATExamEditor.tsx` — sidebar question list preview
- `src/pages/QuestionEditor.tsx` — preview areas
- `src/pages/AdminDashboard.tsx` — question list
- `src/components/ExamSummaryPanel.tsx` — if it displays question text

### 5. Update RichContent Component

Enhance `src/components/activities/players/RichContent.tsx` to detect and render LaTeX math delimiters using KaTeX before sanitizing, so all rich content areas automatically support math.

## Technical Details

**Files to modify:**
- `package.json` — add `katex` dependency
- `src/components/MathText.tsx` — new shared math-aware text component
- `src/components/activities/players/RichContent.tsx` — add KaTeX support
- `supabase/functions/generate-questions/index.ts` — update prompt for LaTeX math notation
- `src/pages/QuestionBank.tsx` — use MathText instead of stripHtml for display
- `src/pages/ISATExamPlayer.tsx` — use MathText for answer options
- `src/pages/ISATExamEditor.tsx` — use MathText for sidebar previews
- `src/pages/AdminDashboard.tsx` — use MathText for question display

**No database changes needed.**

