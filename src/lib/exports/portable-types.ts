/**
 * Portable, framework-agnostic shapes for the Canvas-quiz exporters.
 *
 * Nothing in this folder imports from the host app — these types are the
 * ONLY contract between the exporters and the caller. Map your Canvas /
 * database shapes onto these and the exporters will work unchanged.
 */

export interface PortableAnswer {
  /** Stable id for QTI <response_label> identifiers (string or number). */
  id: string | number;
  /** Plain text answer (preferred for QTI / CSV output). */
  text?: string;
  /** HTML answer body, if Canvas returned one. Exporter strips tags. */
  html?: string;
  /** Canvas weight: >0 means this answer is correct. */
  weight: number;
  /** Matching-question only: left/right pair text. */
  left?: string;
  right?: string;
  match?: string;
}

export type PortableQuestionType =
  | "multiple_choice_question"
  | "true_false_question"
  | "multiple_answers_question"
  | "short_answer_question"
  | "fill_in_multiple_blanks_question"
  | "numerical_question"
  | "calculated_question"
  | "matching_question"
  | "essay_question"
  | "text_only_question"
  | (string & {});

export interface PortableStandard {
  /** e.g. "MS-PS1-1" */
  code: string;
  /** Human-readable description. */
  description: string;
}

export interface PortableQuestion {
  /** Stable id (Canvas question id, DB row id, etc.). */
  id: string | number;
  question_text: string;
  question_type: PortableQuestionType;
  points_possible: number;
  answers?: PortableAnswer[];
  /** Optional standards alignment (NGSS, state, etc.). */
  standards?: PortableStandard[];
  /** Optional cognitive metadata used by QTI metadata fields. */
  dok_level?: number | null;
  blooms_level?: string | null;
}

export interface PortableQuiz {
  title: string;
  /** Optional — surfaces under the title in the Word header. */
  course_name?: string;
  /** Optional — falls back to sum of question points. */
  points_possible?: number;
}

/** Per-student per-question scores for QTI results.xml export. */
export interface PortableStudentResult {
  name: string;
  /** Map of question id → { earned, possible }. */
  scores: Map<string | number, { score: number; possible: number }>;
}

/** Per-student per-standard aggregates for Mastery Connect CSV. */
export interface PortableMasteryStudent {
  name: string;
  /** Map of standard code → { correct, total } across all questions. */
  standardScores: Map<string, { correct: number; total: number }>;
}
