import { supabase } from "@/integrations/supabase/client";

export interface CanvasConfig {
  canvasUrl: string;
  apiToken: string;
}

export interface Course {
  id: number;
  name: string;
  course_code: string;
}

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  quiz_type: string;
  question_count: number;
  points_possible: number;
}

export interface QuizQuestion {
  id: number;
  question_name: string;
  question_text: string;
  question_type: string;
  points_possible: number;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  id: number;
  text: string;
  html: string;
  weight: number;
}

async function canvasRequest(config: CanvasConfig, action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('canvas-proxy', {
    body: { ...params, action, canvasUrl: config.canvasUrl, apiToken: config.apiToken },
  });

  if (error) throw new Error(error.message || 'Failed to call Canvas API');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getCourses(config: CanvasConfig): Promise<Course[]> {
  return canvasRequest(config, 'get_courses');
}

export async function getQuizzes(config: CanvasConfig, courseId: number): Promise<Quiz[]> {
  return canvasRequest(config, 'get_quizzes', { courseId });
}

export async function getQuiz(config: CanvasConfig, courseId: number, quizId: number): Promise<Quiz> {
  return canvasRequest(config, 'get_quiz', { courseId, quizId });
}

export async function getQuizQuestions(config: CanvasConfig, courseId: number, quizId: number): Promise<QuizQuestion[]> {
  return canvasRequest(config, 'get_quiz_questions', { courseId, quizId });
}
