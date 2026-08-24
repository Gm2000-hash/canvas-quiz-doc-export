/**
 * Converts question-bank items into Canvas Quizzes (classic) question payloads
 * while preserving rich-text formatting.
 *
 * Canvas classic quizzes only support a fixed set of question types, so the
 * ISAT-style types in this app (drag & drop, multi-step, text highlight) are
 * mapped onto the closest Canvas equivalent. The mapper keeps the *stem* and
 * the *answer options* clearly separated so nothing collapses into one blob of
 * text in Canvas.
 */
import DOMPurify from "dompurify";
import type { CreateQuizQuestionParams } from "./canvas-api";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "sup", "sub", "span", "div",
  "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6", "img", "a", "code", "pre", "hr",
];

export function sanitizeRichText(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "src", "alt", "title", "width", "height", "style", "colspan", "rowspan", "target"],
  });
}

/** Plain-text version of rich content (Canvas needs this for match/blank fields). */
export function toPlainText(html: string): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = sanitizeRichText(html);
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function hasMarkup(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value || "");
}

/** Guarantee valid block-level HTML so Canvas renders line breaks correctly. */
function ensureHtml(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (hasMarkup(raw)) return sanitizeRichText(raw);
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map(block => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function answerText(a: any): string {
  return toPlainText(a?.text ?? a?.html ?? a?.label ?? a?.answer ?? "");
}

function answerHtml(a: any): string {
  return ensureHtml(a?.html ?? a?.text ?? a?.label ?? a?.answer ?? "");
}

function answerWeight(a: any): number {
  if (typeof a?.weight === "number") return a.weight;
  if (typeof a?.answer_weight === "number") return a.answer_weight;
  if (a?.correct === true) return 100;
  return 0;
}

/** Choice-style answers: keep rich HTML *and* a plain fallback. */
function choiceAnswers(answers: any[]) {
  return (answers || [])
    .map(a => {
      const text = answerText(a);
      if (!text) return null;
      return {
        answer_text: text,
        answer_html: answerHtml(a),
        answer_weight: answerWeight(a),
      };
    })
    .filter(Boolean) as Array<{ answer_text: string; answer_html: string; answer_weight: number }>;
}

export interface MappedCanvasQuestion {
  payload: CreateQuizQuestionParams;
  /** User-facing note when the type had to be converted for Canvas. */
  note?: string;
}

export interface MapOptions {
  /** Override per-question points (quiz-level setting). */
  pointsOverride?: number | null;
  /** 1-based position in the quiz. */
  position?: number;
  /** Fallback question name. */
  name?: string;
}

export function mapQuestionToCanvas(
  q: { question_text: string; question_type: string; points_possible?: number; answers?: any },
  options: MapOptions = {}
): MappedCanvasQuestion {
  const position = options.position ?? 1;
  const points = options.pointsOverride ?? q.points_possible ?? 1;
  const base = {
    question_name: options.name || `Question ${position}`,
    points_possible: points,
    position,
  };
  const stem = ensureHtml(q.question_text || "");
  const answers = q.answers;

  switch (q.question_type) {
    case "multiple_choice_question":
    case "multiple_answers_question": {
      const mapped = choiceAnswers(answers as any[]);
      return {
        payload: { ...base, question_text: stem, question_type: q.question_type, answers: mapped },
      };
    }

    case "true_false_question": {
      const list = Array.isArray(answers) ? answers : [];
      const trueAnswer = list.find(a => /^true$/i.test(answerText(a)));
      const trueWeight = trueAnswer ? answerWeight(trueAnswer) : 100;
      return {
        payload: {
          ...base,
          question_text: stem,
          question_type: "true_false_question",
          answers: [
            { answer_text: "True", answer_weight: trueWeight >= 50 ? 100 : 0 },
            { answer_text: "False", answer_weight: trueWeight >= 50 ? 0 : 100 },
          ],
        },
      };
    }

    case "short_answer_question": {
      // Canvas compares plain text only — never send HTML here.
      const accepted = (Array.isArray(answers) ? answers : [])
        .map(a => answerText(a))
        .filter(Boolean)
        .map(text => ({ answer_text: text, answer_weight: 100 }));
      return {
        payload: { ...base, question_text: stem, question_type: "short_answer_question", answers: accepted },
      };
    }

    case "essay_question":
      return { payload: { ...base, question_text: stem, question_type: "essay_question" } };

    case "matching_question": {
      const pairs = (Array.isArray(answers) ? answers : [])
        .map(a => ({
          answer_match_left: toPlainText(a?.left ?? a?.text ?? ""),
          answer_match_right: toPlainText(a?.right ?? ""),
        }))
        .filter(p => p.answer_match_left && p.answer_match_right);
      return {
        payload: { ...base, question_text: stem, question_type: "matching_question", answers: pairs },
      };
    }

    case "fill_in_multiple_blanks_question": {
      // Canvas requires [blank_id] tokens in the stem and a blank_id on each answer.
      const { html, blankIds } = normalizeBlanks(q.question_text || "");
      const list = Array.isArray(answers) ? answers : [];
      const mapped = list
        .map((a, i) => {
          const text = answerText(a);
          if (!text) return null;
          const blankId = a?.blank_id || blankIds[Math.min(i, blankIds.length - 1)] || blankIds[0] || "blank1";
          return { answer_text: text, blank_id: blankId, answer_weight: 100 };
        })
        .filter(Boolean);
      return {
        payload: { ...base, question_text: html, question_type: "fill_in_multiple_blanks_question", answers: mapped as any[] },
      };
    }

    case "drag_and_drop_question": {
      // Categories → Canvas matching question.
      // LEFT column = the draggable items (what the student sorts).
      // RIGHT column = the category labels (the answer options).
      const categories: Array<{ label: string; items: string[] }> = Array.isArray(answers?.categories)
        ? answers.categories
        : [];
      const pairs: Array<{ answer_match_left: string; answer_match_right: string }> = [];
      categories.forEach(cat => {
        const right = toPlainText(cat?.label || "");
        (cat?.items || []).forEach(item => {
          const left = toPlainText(item || "");
          if (left && right) pairs.push({ answer_match_left: left, answer_match_right: right });
        });
      });

      const categoryList = categories
        .map(c => toPlainText(c?.label || ""))
        .filter(Boolean)
        .map(label => `<li>${label}</li>`)
        .join("");

      const text = [
        stem,
        "<p><em>Match each item on the left to the correct category on the right.</em></p>",
        categoryList ? `<p><strong>Categories:</strong></p><ul>${categoryList}</ul>` : "",
      ].filter(Boolean).join("");

      return {
        payload: { ...base, question_text: text, question_type: "matching_question", answers: pairs },
        note: "Drag & drop exported as a Canvas matching question (items on the left, categories on the right).",
      };
    }

    case "multi_step_question": {
      const parts: any[] = Array.isArray(answers?.parts) ? answers.parts : [];
      const partsHtml = parts.map((part, pi) => {
        const label = toPlainText(part?.label || `Part ${LETTERS[pi] || pi + 1}`);
        const prompt = ensureHtml(part?.prompt || "");
        const options = Array.isArray(part?.options) ? part.options : [];
        const optionsHtml = options.length
          ? `<ul>${options
              .map((o: any, oi: number) => `<li>${LETTERS[oi] || oi + 1}. ${toPlainText(o?.text || "")}</li>`)
              .join("")}</ul>`
          : "";
        return `<p><strong>${label}</strong></p>${prompt}${optionsHtml}`;
      }).join("<hr />");

      return {
        payload: {
          ...base,
          question_text: `${stem}${partsHtml}`,
          question_type: "essay_question",
        },
        note: "Multi-step question exported as one Canvas essay question with each part labeled (manual grading).",
      };
    }

    case "text_highlight_question": {
      const passage = ensureHtml(answers?.passage || "");
      const selections: any[] = Array.isArray(answers?.correctSelections) ? answers.correctSelections : [];
      const key = selections.map(s => toPlainText(s?.text || "")).filter(Boolean);
      return {
        payload: {
          ...base,
          question_text: [
            stem,
            "<p><em>Quote the exact words or sentences from the passage that answer the question.</em></p>",
            passage ? `<blockquote>${passage}</blockquote>` : "",
          ].filter(Boolean).join(""),
          question_type: "essay_question",
          correct_comments_html: key.length ? `<p><strong>Answer key:</strong> ${key.join(" | ")}</p>` : undefined,
        },
        note: "Text-highlight question exported as a Canvas essay question with the passage quoted (manual grading).",
      };
    }

    default: {
      const mapped = choiceAnswers(Array.isArray(answers) ? answers : []);
      if (mapped.length > 0) {
        return {
          payload: { ...base, question_text: stem, question_type: "multiple_choice_question", answers: mapped },
          note: `Unrecognized type "${q.question_type}" exported as multiple choice.`,
        };
      }
      return {
        payload: { ...base, question_text: stem, question_type: "essay_question" },
        note: `Unrecognized type "${q.question_type}" exported as an essay question.`,
      };
    }
  }
}

/**
 * Ensure the stem contains Canvas [blank_id] tokens. Converts common blank
 * markers (____, {1}, [blank]) into sequential [blank1], [blank2]… tokens.
 */
export function normalizeBlanks(questionText: string): { html: string; blankIds: string[] } {
  let html = ensureHtml(questionText);
  const existing = Array.from(html.matchAll(/\[([a-z0-9_-]+)\]/gi)).map(m => m[1]);
  if (existing.length > 0) return { html, blankIds: existing };

  const blankIds: string[] = [];
  html = html.replace(/(_{3,}|\{\d+\})/g, () => {
    const id = `blank${blankIds.length + 1}`;
    blankIds.push(id);
    return `[${id}]`;
  });

  if (blankIds.length === 0) {
    blankIds.push("blank1");
    html += "<p>[blank1]</p>";
  }
  return { html, blankIds };
}
