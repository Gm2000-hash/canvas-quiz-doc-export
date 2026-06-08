/**
 * Portable types for the AI generator bundle.
 *
 * These mirror the request/response shapes of the four edge functions:
 *   - generate-questions
 *   - generate-lesson-plans
 *   - generate-escape-room
 *   - generate-curriculum-reading
 *
 * No app-specific imports. Safe to copy verbatim into another project.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────

export type ModelTier = "default" | "heavy" | "utility";

export interface AiPreferences {
  default_model?: string;
  overrides?: Partial<Record<ModelTier, string>>;
}

/** Common AI knobs accepted by every generator. */
export interface GenerationOptions {
  model_override?: string;
  ai_preferences?: AiPreferences;
}

// ─────────────────────────────────────────────────────────────────────────────
// Questions
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionFramework = "NGSS" | "Idaho";
export type QuestionSubject = "Science" | "Math" | "ELA" | "Social Studies";
export type QuestionStyle = "standard" | "big_ideas" | "desmos";

export interface GenerateQuestionsInput extends GenerationOptions {
  standard_code: string;
  standard_description: string;
  count?: number;
  subject?: QuestionSubject;
  framework?: QuestionFramework;
  /** DOK 1–4. If omitted, generator mixes levels. */
  dok_level?: 1 | 2 | 3 | 4;
  question_style?: QuestionStyle;
}

export interface PortableAnswer {
  text: string;
  weight: number; // 100 = correct, 0 = incorrect
}

export interface GeneratedQuestion {
  question_type:
    | "multiple_choice_question"
    | "multiple_answers_question"
    | "multi_step_question"
    | "drag_and_drop_question";
  question_text: string;
  points_possible: number;
  dok_level: number;
  blooms_level: string;
  /** Shape depends on question_type. Array for MC/multi-answer, object for multi-step/drag-drop. */
  answers: PortableAnswer[] | Record<string, unknown>;
}

export interface GenerateQuestionsOutput {
  questions: GeneratedQuestion[];
  standard_code: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson plans
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateLessonsInput extends GenerationOptions {
  unitTitle: string;
  topic: string;
  discipline?: string;
  gradeLevel?: string;
  numLessons: number;
  additionalContext?: string;
  focusConcepts?: string;
  deemphasizeConcepts?: string;
}

export interface LessonActivity {
  name: string;
  duration: number;
  description: string;
}

export interface LessonStandard {
  code: string;
  description: string;
}

export interface LessonVocab {
  term: string;
  definition: string;
}

export interface LessonResource {
  title: string;
  url: string;
  type: "video" | "article" | "activity" | "other";
}

export interface LessonVocabScaffold {
  term: string;
  student_friendly: string;
  visual_cue: string;
}

export interface LessonUdlSupports {
  lesson_flow: string; // HTML
  vocabulary_scaffolds: LessonVocabScaffold[];
  reflection_prompt: string;
}

export interface GeneratedLesson {
  title: string;
  duration_minutes: number;
  objectives: string;
  activities: LessonActivity[];
  materials?: string;
  assessment?: string;
  differentiation?: string;
  notes?: string;
  vocabulary: LessonVocab[];
  resources: LessonResource[];
  standards: LessonStandard[];
  udl_supports: LessonUdlSupports;
}

export interface GenerateLessonsOutput {
  lessons: GeneratedLesson[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Escape room
// ─────────────────────────────────────────────────────────────────────────────

export type EscapeRoomDifficulty = "easy" | "medium" | "hard";

export interface GenerateEscapeRoomInput extends GenerationOptions {
  title?: string;
  topic: string;
  gradeLevel?: string;
  discipline?: string;
  objectives?: string;
  vocabulary?: string;
  numPuzzles: number;
  difficulty?: EscapeRoomDifficulty;
  additionalContext?: string;
}

export interface EscapeRoomPuzzle {
  room_number: number;
  room_name: string;
  narrative_text: string;
  scenario_text?: string;
  challenge_steps?: string[];
  story_transition?: string;
  puzzle_type: "decode" | "matching" | "diagram" | "vocabulary" | "data" | "riddle";
  lock_code: string;
  lock_code_explanation: string;
  form_section_instructions: string;
  hints: string[];
  distractors: string[];
}

export interface GenerateEscapeRoomOutput {
  theme_title: string;
  narrative_intro: string;
  google_form_setup: string;
  puzzles: EscapeRoomPuzzle[];
  answer_key_summary: string;
  estimated_time_minutes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Curriculum reading
// ─────────────────────────────────────────────────────────────────────────────

export type ReadingFormat = "textbook" | "scripted" | "both";

export interface GenerateReadingInput extends GenerationOptions {
  subject_area: string;
  objectives: string;
  key_terms?: string;
  ngss_standard?: string;
  grade_level?: string;
  format?: ReadingFormat;
}

export interface ReadingTermDef {
  term: string;
  definition: string;
}

export interface ReadingArtifact {
  reading_title: string;
  reading_paragraphs: string[];
}

export interface TextbookLesson {
  title: string;
  objectives: string[];
  key_terms: ReadingTermDef[];
  intro: string[];
  explanation: string[];
}

export interface ScriptedLesson {
  title: string;
  hook: string[];
  key_concepts: { heading: string; content: string }[];
  assignment: { title: string; description: string; instructions: string };
}

export interface GeneratedReadingLesson {
  reading: ReadingArtifact;
  // Present when format === "textbook" or "both"
  textbook?: TextbookLesson;
  // When format === "textbook" returned at top level (not nested) — accept both
  title?: string;
  objectives?: string[];
  key_terms?: ReadingTermDef[];
  intro?: string[];
  explanation?: string[];
  // Present when format === "scripted" or "both"
  scripted?: ScriptedLesson;
  hook?: string[];
  key_concepts?: { heading: string; content: string }[];
  assignment?: { title: string; description: string; instructions: string };
}

export interface GenerateReadingOutput {
  lesson: GeneratedReadingLesson;
}
