import { supabase } from "@/integrations/supabase/client";
import { requestTokenRefresh } from "./canvas-token-refresh";

export interface CanvasConfig {
  canvasUrl: string;
  apiToken: string;
}

// Decode common HTML entities & strip tags. Drops <img>/<iframe>/<style>/<script> contents.
function stripHtmlForTagger(input: string): string {
  if (!input) return "";
  let s = String(input);
  // Remove script/style/iframe/img blocks entirely
  s = s.replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<img[^>]*>/gi, " ");
  // Replace <br> and block tags with spaces
  s = s.replace(/<br\s*\/?>/gi, " ");
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|td)>/gi, " ");
  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, " ");
  // Decode common entities
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Build a sanitized, enriched payload string for the standards tagger.
 * Strips HTML, decodes entities, appends answer choices when present.
 * Caps result at ~1500 chars to keep batch requests within token budget.
 */
export function buildTaggerText(question: {
  question_text: string;
  question_type?: string;
  answers?: Array<{ text?: string; html?: string }> | null;
}): string {
  const stem = stripHtmlForTagger(question.question_text || "");
  const type = (question.question_type || "").toLowerCase();
  const includesChoices = ["multiple_choice_question", "true_false_question", "multiple_answers_question", "matching_question"].some(t => type.includes(t.replace("_question", ""))) || ["multiple_choice_question", "true_false_question", "multiple_answers_question", "matching_question"].includes(type);

  let out = `STEM: ${stem}`;
  if (includesChoices && Array.isArray(question.answers) && question.answers.length > 0) {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const choices = question.answers
      .slice(0, 8)
      .map((a, i) => {
        const txt = stripHtmlForTagger(a?.text || a?.html || "");
        return txt ? `${letters[i]}) ${txt}` : null;
      })
      .filter(Boolean)
      .join(" ");
    if (choices) out += `\nCHOICES: ${choices}`;
  }
  if (out.length > 1500) out = out.slice(0, 1497) + "...";
  return out;
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

async function canvasRequest(config: CanvasConfig, action: string, params: Record<string, unknown> = {}, _isRetry = false): Promise<any> {
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

  // Extract the real error message — supabase.functions.invoke wraps non-2xx
  // responses with a generic message and stashes the body on error.context.
  let errMsg: string | null = null;
  if (error) {
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        errMsg = body?.error || body?.message || null;
      } else if (ctx && typeof ctx.text === 'function') {
        errMsg = await ctx.text();
      }
    } catch { /* ignore */ }
    errMsg = errMsg || error.message || 'Failed to call Canvas API';
  } else if (data?.error) {
    errMsg = data.error;
  }

  if (errMsg) {
    if (/Canvas API error \[401\]|Invalid access token|Revoked access token/i.test(errMsg)) {
      // Notify any UI listeners (legacy rescue banner, toasts) that the token is bad.
      window.dispatchEvent(new CustomEvent('canvas-token-invalid'));

      if (!_isRetry) {
        // Pause this request, prompt the user for a fresh token, then retry once.
        // Forward the original action + course/quiz IDs so the dialog can
        // confirm the new token actually grants access to *this* resource.
        try {
          const scope = {
            action,
            courseId: typeof params.courseId === 'number' ? (params.courseId as number) : undefined,
            quizId: typeof params.quizId === 'number' ? (params.quizId as number) : undefined,
          };
          const newConfig = await requestTokenRefresh(config, scope);
          return canvasRequest(newConfig, action, params, true);
        } catch (refreshErr) {
          throw refreshErr instanceof Error ? refreshErr : new Error(String(refreshErr));
        }
      }
    }
    throw new Error(errMsg);
  }
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
