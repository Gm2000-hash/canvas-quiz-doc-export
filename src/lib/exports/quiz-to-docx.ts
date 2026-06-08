/**
 * Quiz → Word (.docx) exporter.
 *
 * Produces a teacher-friendly assessment document, optionally with an answer
 * key. Standards alignment, DOK, and Bloom's metadata are surfaced inline.
 *
 * Dependencies: `docx`, `file-saver`. No app-specific imports.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";
import type {
  PortableAnswer,
  PortableQuestion,
  PortableQuiz,
} from "./portable-types";
import { safeFilename, stripHtml } from "./strip-html";

function letter(i: number): string {
  return String.fromCharCode(65 + i);
}

const MULTIPLE_CHOICE_TYPES = new Set([
  "multiple_choice_question",
  "true_false_question",
  "multiple_answers_question",
]);

const OPEN_RESPONSE_TYPES = new Set([
  "short_answer_question",
  "essay_question",
  "numerical_question",
]);

function buildQuestionParagraphs(
  q: PortableQuestion,
  index: number,
  showAnswers: boolean,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Question stem
  paragraphs.push(
    new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({ text: `${index + 1}. `, bold: true, size: 24 }),
        new TextRun({ text: stripHtml(q.question_text), size: 24 }),
        new TextRun({
          text: `  (${q.points_possible} pts)`,
          size: 20,
          italics: true,
          color: "666666",
        }),
      ],
    }),
  );

  // Standards alignment
  if (q.standards && q.standards.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Standards: ", bold: true, size: 18, color: "1a6b3c" }),
          ...q.standards.flatMap((s, i) => [
            ...(i > 0 ? [new TextRun({ text: ", ", size: 18, color: "1a6b3c" })] : []),
            new TextRun({ text: s.code, bold: true, size: 18, color: "1a6b3c" }),
            ...(s.description
              ? [new TextRun({ text: ` (${s.description})`, size: 18, italics: true, color: "4a8c64" })]
              : []),
          ]),
        ],
      }),
    );
  }

  const answers: PortableAnswer[] = q.answers ?? [];

  if (answers.length > 0 && MULTIPLE_CHOICE_TYPES.has(q.question_type)) {
    answers.forEach((a, ai) => {
      const correct = (a.weight ?? 0) > 0;
      const body = stripHtml(a.html || a.text || "");
      paragraphs.push(
        new Paragraph({
          spacing: { before: 60 },
          indent: { left: 720 },
          children: [
            new TextRun({
              text: `${letter(ai)}) ${body}`,
              size: 22,
              bold: showAnswers && correct,
              color: showAnswers && correct ? "16a34a" : "000000",
            }),
            ...(showAnswers && correct
              ? [new TextRun({ text: " ✓", bold: true, color: "16a34a", size: 22 })]
              : []),
          ],
        }),
      );
    });
  } else if (showAnswers && q.question_type === "short_answer_question" && answers.length > 0) {
    const correct = answers.filter((a) => (a.weight ?? 0) > 0);
    if (correct.length > 0) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 60 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: "Answer: ", bold: true, color: "16a34a", size: 22 }),
            new TextRun({
              text: correct.map((a) => stripHtml(a.html || a.text || "")).join(" or "),
              color: "16a34a",
              size: 22,
            }),
          ],
        }),
      );
    }
  } else if (!showAnswers && OPEN_RESPONSE_TYPES.has(q.question_type)) {
    // Two blank lines for student handwriting
    for (let i = 0; i < 2; i++) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: i === 0 ? 100 : 200 },
          indent: { left: 720 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999", space: 1 } },
          children: [new TextRun({ text: "", size: 22 })],
        }),
      );
    }
  }

  return paragraphs;
}

function createDocument(
  quiz: PortableQuiz,
  questions: PortableQuestion[],
  showAnswers: boolean,
): Document {
  const filtered = questions.filter((q) => q.question_type !== "text_only_question");
  const totalPoints =
    quiz.points_possible ?? filtered.reduce((sum, q) => sum + (q.points_possible || 0), 0);

  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: quiz.title, bold: true, size: 36 })],
    }),
  );

  if (quiz.course_name) {
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
        children: [new TextRun({ text: quiz.course_name, size: 24, color: "666666" })],
      }),
    );
  }

  if (showAnswers) {
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "— ANSWER KEY —", bold: true, size: 28, color: "16a34a" }),
        ],
      }),
    );
  }

  const hasStandards = filtered.some((q) => q.standards && q.standards.length > 0);
  if (hasStandards) {
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
        children: [
          new TextRun({
            text: "Standards-aligned assessment",
            size: 20,
            italics: true,
            color: "1a6b3c",
          }),
        ],
      }),
    );
  }

  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `${filtered.length} Questions`, size: 22, color: "666666" }),
        new TextRun({ text: `  •  ${totalPoints} Points`, size: 22, color: "666666" }),
      ],
    }),
  );

  if (!showAnswers) {
    sections.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "Name: ", bold: true, size: 24 }),
          new TextRun({ text: "________________________________________", size: 24 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({ text: "Date: ", bold: true, size: 24 }),
          new TextRun({ text: "________________________________________", size: 24 }),
        ],
      }),
    );
  }

  sections.push(
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "333333", space: 1 } },
      children: [],
    }),
  );

  filtered.forEach((q, i) => {
    sections.push(...buildQuestionParagraphs(q, i, showAnswers));
  });

  return new Document({ sections: [{ children: sections }] });
}

export interface ExportQuizToDocxOptions {
  quiz: PortableQuiz;
  questions: PortableQuestion[];
  /** When true, also emits a second file with "_Answer_Key" suffix. */
  includeAnswerKey?: boolean;
}

/**
 * Browser-only: triggers one or two `saveAs` downloads.
 *
 * Returns the generated blobs in case the caller wants to upload instead.
 */
export async function exportQuizToDocx(
  opts: ExportQuizToDocxOptions,
): Promise<{ studentBlob: Blob; answerKeyBlob?: Blob }> {
  const { quiz, questions, includeAnswerKey = false } = opts;
  const safe = safeFilename(quiz.title);

  const studentBlob = await Packer.toBlob(createDocument(quiz, questions, false));
  saveAs(studentBlob, `${safe}_Quiz.docx`);

  if (!includeAnswerKey) return { studentBlob };

  const answerKeyBlob = await Packer.toBlob(createDocument(quiz, questions, true));
  saveAs(answerKeyBlob, `${safe}_Answer_Key.docx`);
  return { studentBlob, answerKeyBlob };
}
