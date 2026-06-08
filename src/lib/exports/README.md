# Portable Canvas-Quiz Exporters

Self-contained, framework-agnostic exporters for Canvas quizzes. The whole
folder is safe to copy verbatim into another project — there are **zero**
imports from this app's code.

## What's inside

| File                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `portable-types.ts`        | The only contract: normalized `PortableQuiz` / `PortableQuestion` / `PortableStandard` / etc. shapes |
| `strip-html.ts`            | SSR-safe HTML→text helper (no `document`), XML escaper, safe filename helper |
| `quiz-to-docx.ts`          | Word (.docx) exporter, with optional answer key             |
| `quiz-to-qti.ts`           | QTI 1.2 .zip exporter (Canvas / Blackboard / Moodle import) |
| `mastery-connect-csv.ts`   | Mastery Connect Tracker CSV (percent or detail format)      |
| `index.ts`                 | Barrel re-export                                            |

## Dependencies

Add to `package.json` if missing:

```bash
bun add docx file-saver jszip
bun add -d @types/file-saver
```

`docx` and `file-saver` are already in Teacher's Companion's `package.json`;
only `jszip` and its types may need to be added for QTI export.

## Porting checklist (for Teacher's Companion App)

1. Copy this entire folder to `src/lib/exports/` in the target project.
2. Install missing deps (above).
3. Write a thin adapter that converts Canvas API responses → `PortableQuiz`
   and `PortableQuestion[]`. The Canvas fields map 1:1; the only thing to
   remember is `answers[].weight > 0` means "this answer is correct".
4. Wire the three exporter calls to buttons.

## Adapter example

```ts
import type { PortableQuestion, PortableQuiz } from "@/lib/exports";

// `quiz` and `questions` are whatever your Canvas server fn returns.
const portableQuiz: PortableQuiz = {
  title: quiz.title,
  course_name: course.name,
  points_possible: quiz.points_possible,
};

const portableQuestions: PortableQuestion[] = questions.map((q) => ({
  id: q.id,
  question_text: q.question_text,
  question_type: q.question_type,
  points_possible: q.points_possible,
  answers: q.answers, // Canvas shape already satisfies PortableAnswer
  // Optional: attach standards if you have an NGSS tagger
  // standards: ngssMap.get(q.id),
}));
```

## Calling the exporters

```ts
import {
  exportQuizToDocx,
  exportToQTI,
  exportMasteryConnectCSV,
} from "@/lib/exports";

// Word doc + answer key
await exportQuizToDocx({
  quiz: portableQuiz,
  questions: portableQuestions,
  includeAnswerKey: true,
});

// QTI .zip (optionally with student analytics)
await exportToQTI({
  title: quiz.title,
  questions: portableQuestions,
  // studentResults: [...], // optional
});

// Mastery Connect CSV
exportMasteryConnectCSV({
  title: quiz.title,
  students: [
    {
      name: "Jane Doe",
      standardScores: new Map([
        ["MS-PS1-1", { correct: 4, total: 5 }],
      ]),
    },
  ],
  standards: [{ code: "MS-PS1-1", description: "Develop models..." }],
});
```

## SSR / server-side use

`stripHtml` does not touch `document`, so all four exporters are safe to call
from TanStack Start server functions if you ever want to generate the file
server-side. (The `saveAs` calls at the bottom of each exporter are
browser-only — call `Packer.toBlob` / `zip.generateAsync` directly server-side
and stream the result back to the client.)

## Why a separate folder?

The original app's exporters (`src/lib/export-docx.ts`, `export-bank-quiz.ts`,
`export-qti.ts`, `export-mastery-connect.ts`) are tied to that app's database
shapes (`QuizQuestion`, `QuestionBankItem`, etc.). This folder is the same
logic with all app-specific imports removed and a single normalized input
contract, so it travels cleanly.

The original app continues to use its existing exporters — nothing here
breaks them.
