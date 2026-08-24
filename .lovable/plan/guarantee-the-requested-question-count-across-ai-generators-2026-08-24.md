# Guarantee the requested question count across AI generators

The count problem exists in more than one path and needs an end-to-end guarantee, not only stronger prompt wording.

## Confirmed failure paths

- The ISAT dialog accepts counts from 1–50, but `generate-isat-exam` clamps every request to a minimum of 15. It makes one large AI call, validates the result, drops malformed questions, and returns the reduced array without replacing dropped items. This can turn a request for 10 into only a few saved questions.
- The Question Bank and portable generators batch requests, but can still return a partial array when a later gateway call fails or yields no parseable questions.
- Question Bank persistence inserts questions one at a time and silently continues after an insert failure, so the function may generate the requested count while fewer records are actually saved.

## What will change

1. **Use one exact-count generation strategy everywhere**
   - Extract shared question batching, validation, deduplication, and top-up behavior for the Question Bank, portable generator, and ISAT generator.
   - Generate in small batches and continue requesting only the remaining count until the requested number of valid, unique questions is collected.
   - Apply a bounded retry policy: only `429` and `5xx` retry with backoff; terminal gateway errors stop and surface their real message.

2. **Fix ISAT count handling**
   - Make the backend count range match the UI instead of silently changing 10 to 15.
   - Add exact batch-size schema limits to each ISAT AI call.
   - Validate every batch immediately; malformed questions are excluded and replaced by top-up calls before the response is returned.
   - Preserve the requested DOK/type/standards distribution across batches and renumber only after the final set is complete.

3. **Do not treat partial generation as success**
   - Return `requested`, `generated`, and validation/drop diagnostics from all generator functions.
   - If bounded attempts cannot produce the exact count, return a clear failure instead of a normal success response containing two questions.
   - Keep valid partial work only as internal retry input; do not silently present it as a completed generation.

4. **Guarantee the saved count**
   - Validate generated question shapes before persistence.
   - Save Question Bank items in a controlled batch, verify the inserted row count, and surface individual validation/database failures rather than skipping them silently.
   - Report separate generated and saved counts so a storage failure cannot be mistaken for an AI count failure.

5. **Make every caller enforce the contract**
   - Update the Question Bank, ISAT exam, and portable generator clients to verify that returned length equals the requested count before closing the dialog or announcing success.
   - Keep the existing progress display, but show the exact failed stage and allow a fresh retry when the count contract is not met.
   - Extend portable response types with the count metadata.

## Technical details

- Consolidate shared server-side helpers under `supabase/functions/_shared/` and apply them to `generate-content`, `generate-questions`, and `generate-isat-exam`.
- Keep current model selection and always-on UDL prompt wrapping unchanged.
- Add structured logs for requested count, raw count, valid count, dropped reasons, retry attempt, final generated count, and final saved count.
- Avoid duplicate stems across batches using normalized stem comparison.

## Verification

- Run real authenticated requests for **10 questions** through all three functions and confirm each returns exactly 10 valid questions with complete answer structures.
- Generate from the Question Bank UI and confirm exactly 10 new database rows are saved and visible after refresh.
- Generate a 10-question ISAT exam and confirm the stored exam has `question_count = 10` and a 10-item questions array.
- Exercise malformed-output and retryable gateway failure cases to confirm top-up behavior, bounded backoff, and no false success state.
