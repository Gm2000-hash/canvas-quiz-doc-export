import { supabase } from "@/integrations/supabase/client";

export interface CanvasConfig {
  canvasUrl: string;
  apiToken: string;
}

export interface CourseTerm {
  id: number;
  name: string;
  start_at: string | null;
  end_at: string | null;
}

export interface Course {
  id: number;
  name: string;
  course_code: string;
  workflow_state?: string;
  term?: CourseTerm;
  total_students?: number;
  created_at?: string;
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
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error('Please sign in to use Canvas.');
  }

  const { data, error } = await supabase.functions.invoke('canvas-proxy', {
    body: { ...params, action, canvasUrl: config.canvasUrl, apiToken: config.apiToken },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) throw new Error(error.message || 'Failed to call Canvas API');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getCourses(config: CanvasConfig): Promise<Course[]> {
  return canvasRequest(config, 'get_courses');
}

export async function getAllCourses(config: CanvasConfig): Promise<Course[]> {
  return canvasRequest(config, 'get_all_courses');
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

export interface CreateQuizParams {
  title: string;
  description?: string;
  quiz_type?: 'practice_quiz' | 'assignment' | 'graded_survey' | 'survey';
  time_limit?: number | null;
  shuffle_answers?: boolean;
  published?: boolean;
}

export async function createCanvasQuiz(config: CanvasConfig, courseId: number, quizData: CreateQuizParams): Promise<Quiz> {
  return canvasRequest(config, 'create_quiz', { courseId, quizData });
}

export interface CreateQuizQuestionParams {
  question_name: string;
  question_text: string;
  question_type: string;
  points_possible: number;
  answers?: any[];
}

export async function createCanvasQuizQuestion(
  config: CanvasConfig,
  courseId: number,
  quizId: number,
  questionData: CreateQuizQuestionParams
): Promise<QuizQuestion> {
  return canvasRequest(config, 'create_quiz_question', { courseId, quizId, questionData });
}

// ── Pull Results ──

export interface Enrollment {
  user_id: number;
  user: { id: number; name: string; sortable_name: string };
}

export interface QuizSubmission {
  id: number;
  user_id: number;
  quiz_id: number;
  score: number | null;
  kept_score: number | null;
  attempt: number;
  workflow_state: string;
}

export interface QuizSubmissionsResponse {
  quiz_submissions: QuizSubmission[];
}

export async function getEnrollments(config: CanvasConfig, courseId: number): Promise<Enrollment[]> {
  return canvasRequest(config, 'get_enrollments', { courseId });
}

export async function getQuizSubmissions(config: CanvasConfig, courseId: number, quizId: number): Promise<QuizSubmission[]> {
  const data = await canvasRequest(config, 'get_quiz_submissions', { courseId, quizId });
  return data.quiz_submissions || data;
}

export async function getQuizReport(config: CanvasConfig, courseId: number, quizId: number): Promise<{ csv: string; pending?: boolean }> {
  return canvasRequest(config, 'get_quiz_report', { courseId, quizId });
}

export async function getQuizStatistics(config: CanvasConfig, courseId: number, quizId: number): Promise<any> {
  return canvasRequest(config, 'get_quiz_statistics', { courseId, quizId });
}

// ── Assignments ──

export interface CreateAssignmentParams {
  name: string;
  description?: string;
  submission_types?: string[];
  external_tool_tag_attributes?: {
    url: string;
    new_tab?: boolean;
  };
  points_possible?: number;
  published?: boolean;
}

export async function createCanvasAssignment(
  config: CanvasConfig,
  courseId: number,
  assignmentData: CreateAssignmentParams
): Promise<any> {
  return canvasRequest(config, 'create_assignment', { courseId, assignmentData });
}
