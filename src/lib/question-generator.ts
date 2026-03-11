import { supabase } from "@/integrations/supabase/client";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";

export interface GenerationProgress {
  total: number;
  completed: number;
  current: string | null;
  errors: string[];
  questionsGenerated: number;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Generate ISAT-style questions for a specific substandard and save to bank.
 */
async function generateForSubstandard(
  code: string,
  description: string,
  count: number
): Promise<{ saved: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");

  // Call the edge function
  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: { standard_code: code, standard_description: description, count },
  });

  if (error) return { saved: 0, error: error.message || 'Edge function error' };
  if (data?.error) return { saved: 0, error: data.error };

  const questions = data?.questions || [];
  let saved = 0;

  for (const q of questions) {
    try {
      // Normalize answers for DB storage
      let answers = q.answers;
      // MC/multi-answer should be an array of {text, weight}
      if (Array.isArray(answers)) {
        answers = answers.map((a: any, i: number) => ({
          id: Date.now() + i,
          text: a.text || '',
          weight: a.weight ?? (a.correct ? 100 : 0),
        }));
      }

      const { data: inserted, error: insertError } = await supabase
        .from("question_bank")
        .insert({
          user_id: user.id,
          question_text: q.question_text,
          question_type: q.question_type,
          points_possible: q.points_possible || 1,
          answers: answers as any,
          dok_level: q.dok_level || 1,
          blooms_level: q.blooms_level || 'Remember',
          source_course: 'AI Generated',
          source_quiz: `ISAT Sample - ${code}`,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to save question:`, insertError);
        continue;
      }

      // Tag with the standard
      if (inserted) {
        await supabase.from("question_bank_standards").insert({
          question_bank_id: inserted.id,
          ngss_code: code,
          ngss_description: description,
        });
        saved++;
      }
    } catch (e) {
      console.error('Error saving generated question:', e);
    }
  }

  return { saved };
}

/**
 * Generate questions for all substandards in a core idea (e.g. "MS-LS1").
 */
export async function generateForCoreIdea(
  coreIdea: string,
  questionsPerSubstandard: number,
  onProgress: ProgressCallback
): Promise<void> {
  const substandards = ALL_SUBSTANDARDS[coreIdea] || [];
  const progress: GenerationProgress = {
    total: substandards.length,
    completed: 0,
    current: null,
    errors: [],
    questionsGenerated: 0,
  };

  onProgress({ ...progress });

  for (const sub of substandards) {
    progress.current = sub.code;
    onProgress({ ...progress });

    const result = await generateForSubstandard(sub.code, sub.description, questionsPerSubstandard);

    if (result.error) {
      progress.errors.push(`${sub.code}: ${result.error}`);
    }
    progress.questionsGenerated += result.saved;
    progress.completed++;
    progress.current = null;
    onProgress({ ...progress });

    // Small delay between calls to avoid rate limiting
    if (progress.completed < progress.total) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/**
 * Generate questions for all substandards in a discipline (e.g. all LS groups).
 */
export async function generateForDiscipline(
  coreIdeas: string[],
  questionsPerSubstandard: number,
  onProgress: ProgressCallback
): Promise<void> {
  const allSubs = coreIdeas.flatMap(ci => (ALL_SUBSTANDARDS[ci] || []).map(s => ({ ...s, coreIdea: ci })));
  const progress: GenerationProgress = {
    total: allSubs.length,
    completed: 0,
    current: null,
    errors: [],
    questionsGenerated: 0,
  };

  onProgress({ ...progress });

  for (const sub of allSubs) {
    progress.current = sub.code;
    onProgress({ ...progress });

    const result = await generateForSubstandard(sub.code, sub.description, questionsPerSubstandard);

    if (result.error) {
      progress.errors.push(`${sub.code}: ${result.error}`);
    }
    progress.questionsGenerated += result.saved;
    progress.completed++;
    progress.current = null;
    onProgress({ ...progress });

    if (progress.completed < progress.total) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/**
 * Get count of all substandards across all disciplines.
 */
export function getTotalSubstandardCount(): number {
  return Object.values(ALL_SUBSTANDARDS).reduce((sum, subs) => sum + subs.length, 0);
}
