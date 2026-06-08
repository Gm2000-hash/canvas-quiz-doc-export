# AI Generators — Portable Bundle

Self-contained library for four NGSS/UDL-aligned AI generators originally built
for the Canvas Quiz/Doc Export app. Designed to drop into another Lovable
project (Teacher's Companion) that uses Lovable Cloud (Supabase + Edge
Functions + Lovable AI Gateway).

## What's here

```
src/lib/ai-generators/
├── types.ts           — request/response shapes, no app imports
├── client.ts          — typed supabase.functions.invoke wrappers
├── index.ts           — barrel
├── README.md          — this file
└── ui/
    ├── GenerateQuestionsDialog.tsx
    ├── GenerateLessonDialog.tsx
    ├── GenerateEscapeRoomDialog.tsx
    └── GenerateReadingDialog.tsx
```

## What's NOT here (you copy these too)

The edge functions and their shared helpers are unchanged from the source
project — they have no app-specific dependencies and don't write to the
database. Copy them verbatim from the source project:

```
supabase/functions/_shared/udl.ts
supabase/functions/_shared/model.ts
supabase/functions/_shared/logger.ts
supabase/functions/generate-questions/index.ts
supabase/functions/generate-lesson-plans/index.ts
supabase/functions/generate-escape-room/index.ts
supabase/functions/generate-curriculum-reading/index.ts
```

## Port steps (for the target project agent)

1. **Pull shared helpers.** From the source project copy these three files into
   the target's `supabase/functions/_shared/` directory:
   - `udl.ts` — UDL CAST v2.2 prompt wrapper. Required.
   - `model.ts` — AI model resolver + allow-list. Required.
   - `logger.ts` — Structured logging wrapper. Required.
2. **Pull edge functions.** Copy each generator's `index.ts` into the target's
   `supabase/functions/<name>/`:
   - `generate-questions`
   - `generate-lesson-plans`
   - `generate-escape-room`
   - `generate-curriculum-reading`
3. **Pull this library.** Copy `src/lib/ai-generators/` into the target.
4. **Verify secrets.** Only `LOVABLE_API_KEY` is required, and Lovable Cloud
   provisions it automatically.
5. **Verify auth.** Every function calls `supabase.auth.getClaims(...)` and
   rejects unauthenticated requests with 401. The target app's existing auth
   already satisfies this.
6. **Wire UI.** Add a route (e.g. `/_authenticated/ai-generate`) with tabs for
   each generator. Pass the target app's configured Supabase client and the
   user's AI preferences.

## Usage

```tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  GenerateQuestionsDialog,
  GenerateLessonDialog,
  GenerateEscapeRoomDialog,
  GenerateReadingDialog,
} from "@/lib/ai-generators/ui/...";
import { toast } from "sonner";

function MyPage() {
  const [open, setOpen] = useState(false);

  return (
    <GenerateLessonDialog
      open={open}
      onOpenChange={setOpen}
      supabase={supabase}
      defaults={{ unitTitle: "Cells", topic: "Mitosis", numLessons: 3 }}
      onGenerated={(result) => {
        // result.lessons is a GeneratedLesson[]
        // Persist to your own table, or pass to a preview component
        console.log(result.lessons);
        toast.success(`Generated ${result.lessons.length} lessons`);
      }}
      onError={(err) => toast.error(err.message)}
    />
  );
}
```

The dialogs are intentionally simple form → invoke → callback. They do **not**
preview the generated content and they do **not** write to the database — the
target app decides what to do with the result.

If you want the rich preview/editor UIs from the source project (with TipTap,
exports, etc.), copy `GenerateEscapeRoomDialog.tsx` from the source's
`src/components/` and adapt — but that pulls in many app-specific dependencies.

## Headless client (no UI)

If you want to call the generators without the dialogs:

```ts
import { supabase } from "@/integrations/supabase/client";
import { generateQuestions, generateLessons } from "@/lib/ai-generators";

const { questions } = await generateQuestions(supabase, {
  standard_code: "MS-LS1-1",
  standard_description: "Conduct an investigation to provide evidence that living things are made of cells...",
  count: 10,
  framework: "NGSS",
  subject: "Science",
});
```

## What stays in the source project

- **NGSS / Idaho standards data** (`src/lib/ngss-data.ts`, `idaho-standards-data.ts`).
  Each app keeps its own standards catalog. The generators only need a
  `{ code, description }` pair at call time.
- **Standards taggers** (`ngss-tagger`, `standards-tagger` edge fns). They
  depend on the full NGSS taxonomy — port separately if needed.
- **Rich preview/editor UIs** (`CreateQuestionDialog`, `RegenerateLessonDialog`,
  the full `GenerateEscapeRoomDialog`, the reading viewer). These have heavy
  TipTap/H5P/export dependencies.
- **Persistence** — every generator returns its payload. The source app's DB
  inserts happen in dialog calling code, not in the edge function.

## UDL doctrine (kept identical)

All four edge functions wrap their system prompt with `withUdl(...)` from
`_shared/udl.ts`. Standards = the WHAT (NGSS / Idaho); CAST UDL v2.2 = the HOW
(Engagement · Representation · Action & Expression). This is non-negotiable
across the source project and must remain so in the target.

## Models used

`_shared/model.ts` defines the allow-list. Each generator picks a tier:

| Generator                   | Tier      | Default                             |
| --------------------------- | --------- | ----------------------------------- |
| generate-questions          | `default` | google/gemini-3-flash-preview       |
| generate-lesson-plans       | `default` | google/gemini-3-flash-preview       |
| generate-escape-room        | `heavy`   | (user pref or gemini-3-flash)       |
| generate-curriculum-reading | `heavy`   | (user pref or gemini-3-flash)       |

Callers can override per-request via `model_override` or per-tier via
`ai_preferences.overrides.heavy/utility/default`. The resolver validates
against the allow-list.

## Errors

All four functions surface AI gateway failures as JSON:

- `429` — rate limited; user should retry shortly.
- `402` — workspace credits exhausted; user should top up.
- `500` — generation/validation failure; show `error.message` to the user.

The typed client (`client.ts`) throws on any of these. Wrap calls in
try/catch and surface to the user via toast.
