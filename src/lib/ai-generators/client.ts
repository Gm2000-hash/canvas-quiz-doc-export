/**
 * Typed client wrappers around the four AI generator edge functions.
 *
 * Each function takes a `SupabaseClient` (so the consuming app supplies its own
 * configured client) and a typed input. Returns the typed output, or throws.
 *
 * Edge function names expected in the target project:
 *   - generate-questions
 *   - generate-lesson-plans
 *   - generate-escape-room
 *   - generate-curriculum-reading
 */

import type {
  GenerateQuestionsInput,
  GenerateQuestionsOutput,
  GenerateLessonsInput,
  GenerateLessonsOutput,
  GenerateEscapeRoomInput,
  GenerateEscapeRoomOutput,
  GenerateReadingInput,
  GenerateReadingOutput,
} from "./types";

/** Minimal structural type — any @supabase/supabase-js client satisfies this. */
export interface SupabaseFunctionsClient {
  functions: {
    invoke: <T = unknown>(
      name: string,
      opts: { body: unknown },
    ) => Promise<{ data: T | null; error: { message: string } | null }>;
  };
}

async function invoke<TOut>(
  supabase: SupabaseFunctionsClient,
  fn: string,
  body: unknown,
): Promise<TOut> {
  const { data, error } = await supabase.functions.invoke<TOut>(fn, { body });
  if (error) throw new Error(error.message || `${fn} failed`);
  if (!data) throw new Error(`${fn} returned no data`);
  const maybeError = (data as { error?: string }).error;
  if (maybeError) throw new Error(maybeError);
  return data;
}

export function generateQuestions(
  supabase: SupabaseFunctionsClient,
  input: GenerateQuestionsInput,
): Promise<GenerateQuestionsOutput> {
  return invoke<GenerateQuestionsOutput>(supabase, "generate-questions", input);
}

export function generateLessons(
  supabase: SupabaseFunctionsClient,
  input: GenerateLessonsInput,
): Promise<GenerateLessonsOutput> {
  return invoke<GenerateLessonsOutput>(supabase, "generate-lesson-plans", input);
}

export function generateEscapeRoom(
  supabase: SupabaseFunctionsClient,
  input: GenerateEscapeRoomInput,
): Promise<GenerateEscapeRoomOutput> {
  return invoke<GenerateEscapeRoomOutput>(supabase, "generate-escape-room", input);
}

export function generateReading(
  supabase: SupabaseFunctionsClient,
  input: GenerateReadingInput,
): Promise<GenerateReadingOutput> {
  return invoke<GenerateReadingOutput>(supabase, "generate-curriculum-reading", input);
}
