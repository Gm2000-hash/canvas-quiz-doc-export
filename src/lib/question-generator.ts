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

interface GenerateOptions {
  framework?: "NGSS" | "Idaho";
  subject?: string;
  dokLevel?: number | null;
  questionStyle?: "standard" | "big_ideas" | "desmos" | null;
}

/**
 * Generate ISAT-style questions for a specific standard and save to bank.
 */
async function generateForSubstandard(
  code: string,
  description: string,
  count: number,
  options: GenerateOptions = {}
): Promise<{ saved: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");

  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: {
      standard_code: code,
      standard_description: description,
      count,
      framework: options.framework || "NGSS",
      subject: options.subject || "Science",
      ...(options.dokLevel ? { dok_level: options.dokLevel } : {}),
    },
  });

  if (error) return { saved: 0, error: error.message || 'Edge function error' };
  if (data?.error) return { saved: 0, error: data.error };

  const questions = data?.questions || [];
  let saved = 0;

  for (const q of questions) {
    try {
      let answers = q.answers;
      if (Array.isArray(answers)) {
        answers = answers.map((a: any, i: number) => ({
          id: Date.now() + i,
          text: a.text || '',
          weight: a.weight ?? (a.correct ? 100 : 0),
        }));
      }

      const sourceLabel = options.framework === "Idaho" ? `Idaho ${options.subject}` : "NGSS Science";

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
          source_course: `AI Generated (${sourceLabel})`,
          source_quiz: `ISAT Sample - ${code}`,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to save question:`, insertError);
        continue;
      }

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
 * Generate questions for a list of standards.
 */
export async function generateForStandards(
  standards: { code: string; description: string }[],
  questionsPerStandard: number,
  onProgress: ProgressCallback,
  options: GenerateOptions = {}
): Promise<void> {
  const progress: GenerationProgress = {
    total: standards.length,
    completed: 0,
    current: null,
    errors: [],
    questionsGenerated: 0,
  };

  onProgress({ ...progress });

  for (const sub of standards) {
    progress.current = sub.code;
    onProgress({ ...progress });

    const result = await generateForSubstandard(sub.code, sub.description, questionsPerStandard, options);

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
 * Generate questions for all substandards in a core idea (e.g. "MS-LS1").
 */
export async function generateForCoreIdea(
  coreIdea: string,
  questionsPerSubstandard: number,
  onProgress: ProgressCallback
): Promise<void> {
  const substandards = ALL_SUBSTANDARDS[coreIdea] || [];
  return generateForStandards(substandards, questionsPerSubstandard, onProgress, { framework: "NGSS", subject: "Science" });
}

/**
 * Generate questions for all substandards in a discipline (e.g. all LS groups).
 */
export async function generateForDiscipline(
  coreIdeas: string[],
  questionsPerSubstandard: number,
  onProgress: ProgressCallback
): Promise<void> {
  const allSubs = coreIdeas.flatMap(ci => (ALL_SUBSTANDARDS[ci] || []));
  return generateForStandards(allSubs, questionsPerSubstandard, onProgress, { framework: "NGSS", subject: "Science" });
}

/**
 * Get count of all substandards across all disciplines.
 */
export function getTotalSubstandardCount(): number {
  return Object.values(ALL_SUBSTANDARDS).reduce((sum, subs) => sum + subs.length, 0);
}
