# Fix: question generator returns fewer questions than requested

Asking for 10 questions often yields only 2. The requested count is passed correctly all the way to the AI call, so the shortfall happens in the AI response itself: the model is asked once for the whole set with no minimum enforced, no size limits declared, and no check that what came back matches the request. Long tool-call payloads (each question carries a JSON answers string) also get cut off mid-array, and whatever partial set arrives is saved silently.

## What will change

1. **Enforce the count in the request**
   - Add `minItems`/`maxItems` equal to the requested count on the `questions` array schema.
   - State the exact count as a hard requirement in both the system and user prompt ("Return exactly N questions — no fewer").

2. **Top-up loop instead of one shot**
   - After the first call, if fewer than N questions came back, make follow-up calls asking only for the remaining number, passing the already-generated stems so the model does not repeat them.
   - Cap at 3 total attempts, then return whatever was collected.

3. **Batch large requests**
   - Requests over 5 questions are split into chunks of 5 and generated sequentially, which keeps each response well inside the response-size limit that currently truncates the array.

4. **Detect and log truncation**
   - Log the response `finish_reason`; when it is `length`, treat that batch as incomplete and let the top-up loop refill it.

5. **Surface shortfalls in the UI**
   - The generator response includes `requested` and `returned` counts.
   - When fewer questions than requested were saved, the progress/summary toast says so ("Saved 8 of 10 — try again to fill the rest") instead of silently reporting success.

## Technical details

- `supabase/functions/generate-content/index.ts` — `buildQuestionPrompt` gains explicit count language and `minItems`/`maxItems`; the question path gets a chunk + top-up loop around the gateway call with `finish_reason` logging, and returns `{ questions, requested, returned }`.
- `supabase/functions/generate-questions/index.ts` — the same count enforcement, chunking, and top-up loop, since the portable generator library calls this function.
- `src/lib/content-generator.ts` — `saveQuestions` returns the requested vs saved counts so callers can report a shortfall.
- `src/components/GenerateContentDialog.tsx` — progress summary reports partial results.
- Model choice and existing UDL prompt wrapping stay unchanged.

## Verification

Generate 10 questions for one standard and confirm 10 land in the bank; check the edge function logs for the per-batch counts and any `finish_reason: length` entries.
