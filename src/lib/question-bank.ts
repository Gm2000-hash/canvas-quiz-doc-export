import { supabase } from "@/integrations/supabase/client";
import type { QuizQuestion } from "./canvas-api";
import type { NGSSStandard } from "./ngss-api";

export interface QuestionBankItem {
  id: string;
  canvas_question_id: number;
  question_text: string;
  question_type: string;
  points_possible: number;
  answers: any[];
  source_course: string | null;
  source_quiz: string | null;
  created_at: string;
  standards: { ngss_code: string; ngss_description: string }[];
}

export async function saveQuestionsToBank(
  questions: QuizQuestion[],
  ngssTags: Map<number, NGSSStandard[]>,
  courseName: string,
  quizTitle: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to save to question bank");

  const filtered = questions.filter(q => q.question_type !== "text_only_question");

  for (const q of filtered) {
    // Check if already saved (by canvas_question_id + user)
    const { data: existing } = await supabase
      .from("question_bank")
      .select("id")
      .eq("user_id", user.id)
      .eq("canvas_question_id", q.id)
      .maybeSingle();

    if (existing) continue; // skip duplicates

    const { data: inserted, error } = await supabase
      .from("question_bank")
      .insert({
        user_id: user.id,
        canvas_question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points_possible: q.points_possible,
        answers: q.answers as any,
        source_course: courseName,
        source_quiz: quizTitle,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save question:", error);
      continue;
    }

    const standards = ngssTags.get(q.id) || [];
    if (standards.length > 0 && inserted) {
      await supabase.from("question_bank_standards").insert(
        standards.map(s => ({
          question_bank_id: inserted.id,
          ngss_code: s.code,
          ngss_description: s.description,
        }))
      );
    }
  }
}

export async function getQuestionBank(): Promise<QuestionBankItem[]> {
  const { data: questions, error } = await supabase
    .from("question_bank")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!questions || questions.length === 0) return [];

  const { data: standards } = await supabase
    .from("question_bank_standards")
    .select("*")
    .in("question_bank_id", questions.map(q => q.id));

  const standardsMap = new Map<string, { ngss_code: string; ngss_description: string }[]>();
  for (const s of standards || []) {
    const list = standardsMap.get(s.question_bank_id) || [];
    list.push({ ngss_code: s.ngss_code, ngss_description: s.ngss_description });
    standardsMap.set(s.question_bank_id, list);
  }

  return questions.map(q => ({
    id: q.id,
    canvas_question_id: q.canvas_question_id,
    question_text: q.question_text,
    question_type: q.question_type,
    points_possible: q.points_possible,
    answers: (q.answers as any[]) || [],
    source_course: q.source_course,
    source_quiz: q.source_quiz,
    created_at: q.created_at,
    standards: standardsMap.get(q.id) || [],
  }));
}

export async function deleteFromBank(id: string) {
  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) throw error;
}
