
## Scope honesty first

You said "everything export-related," and I want to flag a hard constraint before we commit:

This app has **10+ exporters**. They split into two groups:

**A. Portable** — read directly from Canvas, no app database needed:
- Canvas quiz → Word (`export-docx.ts`)
- Canvas quiz → Bank-Quiz Word (`export-bank-quiz.ts`)
- Canvas quiz → QTI .zip (`export-qti.ts`)
- Canvas quiz → Mastery Connect CSV (`export-mastery-connect.ts`) — Teacher's Companion already has a partial version

**B. Not portable without porting the whole app** — read from this app's database tables (curriculum, lessons, escape rooms, readings, H5P, ISAT exams) that Teacher's Companion doesn't have:
- `export-curriculum-docx.ts`, `export-lesson-docx.ts`, `export-escape-room-docx.ts`, `export-reading-docx.ts`, `export-reading-pdf.ts`, `export-h5p.ts`

Porting Group B = porting ~20 RLS tables, ~15 AI generators, the unit/curriculum editor UI, the reading library, ISAT, etc. That's effectively cloning the whole app into Teacher's Companion — which is a remix, not a port.

**Recommended scope:** port Group A only (the Canvas-tied exporters). Skip Group B. I'll surface a clear "Coming from your Canvas account" landing page that's honest about the scope.

If you actually want Group B too, say so and I'll quote a much larger plan.

---

## What I'll build (Group A)

A new route in Teacher's Companion at **`/_authenticated/canvas-export`** with a sidebar link in the existing nav. It uses the Canvas connection already configured in Teacher's Companion Settings (no new auth UI).

### UI flow

```text
/canvas-export
 ├─ Course picker          (reuses listCanvasCourses server fn — already exists)
 ├─ Quiz list              (Classic + New Quizzes, merged & paginated)
 ├─ Quiz detail panel      (question count, type breakdown)
 └─ Export buttons:
      ├─ Word (.docx)        ← teacher-friendly format
      ├─ Word (Bank Quiz)    ← question-bank import format
      ├─ QTI (.zip)          ← Canvas/Blackboard import
      └─ Mastery Connect CSV ← standards alignment export
```

### Server functions (new, in Teacher's Companion's TanStack Start style)

Add to `src/lib/canvas.functions.ts`:
- `listCanvasQuizzes({ courseId })` — lists Classic + New Quizzes side by side
- `getCanvasQuizQuestions({ courseId, quizId, quizType })` — fetches all questions, handles both Classic (`/quizzes/:id/questions`) and New Quizzes (`/api/quiz/v1/courses/:courseId/quizzes/:id/items`) endpoints with pagination
- All run **server-side**, so no CORS proxy edge function needed (unlike this app)

### Exporter library (ported from this app)

New folder `src/lib/exports/`:
- `quiz-types.ts` — normalized quiz/question shape (target for both Classic & New Quizzes)
- `quiz-to-docx.ts` — port of `export-docx.ts`, refactored to take normalized shape
- `quiz-to-bank-docx.ts` — port of `export-bank-quiz.ts`
- `quiz-to-qti.ts` — port of `export-qti.ts` (uses `fflate` for zip, already in Teacher's Companion deps)
- `quiz-to-mastery-csv.ts` — refactor of the existing partial in Teacher's Companion to handle Canvas-fetched data

All run **client-side** (file download happens in the browser via `file-saver`, already in deps).

### Components (new)

- `src/components/canvas-export/CourseQuizPicker.tsx` — course dropdown + quiz list
- `src/components/canvas-export/QuizExportPanel.tsx` — detail panel + 4 export buttons + loading states
- `src/components/canvas-export/NotConnectedNotice.tsx` — link to Settings if `canvas_token` is missing

### Nav integration

Add a "Canvas Export" link to the existing sidebar in `src/routes/_authenticated/route.tsx` (next to Library / Generate / Analytics).

---

## What does NOT change

- No new database tables (Canvas creds already on `profiles.canvas_token`)
- No new secrets
- No new auth flow
- No Supabase edge functions (TanStack server functions handle Canvas calls)
- This app (Canvas Quiz Export 2) is **not modified** — only Teacher's Companion gets new code

---

## Effort estimate

- Server fns + types: small
- 4 exporter ports: medium (the .docx/QTI generators are 200-500 lines each and need their dependencies on this app's data shapes stripped out)
- UI: small (3 components, 1 route)
- Total: ~1 build session

---

## What I need from you to start building

Nothing — answers already given. I'll switch to Teacher's Companion App when you approve, and build there. The work happens in that project, not here.

**One thing to confirm:** are you OK with Group B (curriculum/lesson/reading/escape-room/H5P/ISAT exports) staying only in *this* app? If you ever want those in Teacher's Companion, that's a separate, much larger conversation (likely a remix instead of a port).
