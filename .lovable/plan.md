

# Embedded Exam Results Analysis & Canvas Score Recording

## Problem

1. **No visibility into student results**: When ISAT exams and H5P activities are embedded in Canvas, student completion data is recorded in the `activity_completions` table but there's no UI to view it.
2. **Embed URL bypasses LTI**: The "Embed in Canvas" dialog (`PushISATEmbedToCanvasDialog`) uses a direct URL (`/isat-exam/{id}`) instead of the LTI launch URL, so Canvas can't record grades — even though the LTI grade passback infrastructure already exists.

## Plan

### 1. Fix Canvas Assignment URLs to Use LTI Launch

Update `PushISATEmbedToCanvasDialog.tsx` and `PushActivityToCanvasDialog.tsx` to use the LTI launch URL pattern instead of the direct embed URL. This ensures Canvas initiates a proper LTI 1.3 flow, which enables automatic grade passback when students complete the exam.

- Change the `external_tool_tag_attributes.url` from the direct app URL to the LTI launch URL based on the user's configured LTI platform settings
- Fall back to the direct embed URL if LTI is not configured, with a warning that grades won't sync

### 2. Add "Embedded Results" Tab to Quiz Analytics

Add a third tab to `QuizAnalytics.tsx` — **Embedded Results** — that queries `activity_completions` joined with `lti_sessions` to show:

- **Overview cards**: Total completions, unique students, average score, number of distinct activities/exams
- **Results table**: Student name, activity/exam title, score, max score, percentage, completion date
- **Score distribution chart**: Same A-F grade distribution as the Canvas tab
- **Per-exam breakdown**: Group completions by activity ID, show avg/high/low per exam

This requires a new edge function or RPC since `activity_completions` and `lti_sessions` are service-role-only tables.

### 3. Create Edge Function for Fetching Embedded Results

New edge function `get-embedded-results` that:
- Authenticates the teacher via JWT
- Joins `activity_completions` with `lti_sessions` (for student names) and cross-references `isat_exams` and `h5p_activities` (for titles)
- Filters to only show completions for exams/activities owned by the authenticated teacher
- Returns structured results grouped by activity

### 4. Auto-Submit Score for ISAT Exams in LTI Context

Currently, the ISAT exam player posts scores via LTI on submit (line 228-249 of `ISATExamPlayer.tsx`), which is correct. But verify the flow works end-to-end when the exam is launched via LTI (the `lti_session` param is present). No code change expected here — just validation.

## Technical Details

**Files to create:**
- `supabase/functions/get-embedded-results/index.ts` — Authenticated edge function to query completions

**Files to modify:**
- `src/components/PushISATEmbedToCanvasDialog.tsx` — Use LTI launch URL for external tool assignments
- `src/components/PushActivityToCanvasDialog.tsx` — Same LTI URL fix
- `src/pages/QuizAnalytics.tsx` — Add "Embedded Results" tab with completions data, charts, and student table

**Database:** No schema changes needed. The `activity_completions` and `lti_sessions` tables already have the required data. The new edge function uses service role to read them.

