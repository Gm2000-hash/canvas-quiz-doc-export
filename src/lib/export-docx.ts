import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import type { Quiz, QuizQuestion } from './canvas-api';

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function getQuestionTypeName(type: string): string {
  const map: Record<string, string> = {
    multiple_choice_question: 'Multiple Choice',
    true_false_question: 'True/False',
    short_answer_question: 'Short Answer',
    fill_in_multiple_blanks_question: 'Fill in the Blanks',
    multiple_answers_question: 'Select All That Apply',
    matching_question: 'Matching',
    numerical_question: 'Numerical',
    essay_question: 'Essay',
    calculated_question: 'Calculated',
    multiple_dropdowns_question: 'Multiple Dropdowns',
    text_only_question: 'Text Only',
  };
  return map[type] || type;
}

function getLetterLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function buildQuestionParagraphs(
  question: QuizQuestion,
  index: number,
  showAnswers: boolean
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Question number + text
  paragraphs.push(
    new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({ text: `${index + 1}. `, bold: true, size: 24 }),
        new TextRun({ text: stripHtml(question.question_text), size: 24 }),
        new TextRun({ text: `  (${question.points_possible} pts)`, size: 20, italics: true, color: '666666' }),
      ],
    })
  );

  // Answer choices
  if (question.answers && question.answers.length > 0) {
    const isMultipleChoice = ['multiple_choice_question', 'true_false_question', 'multiple_answers_question'].includes(question.question_type);

    if (isMultipleChoice) {
      question.answers.forEach((answer, ai) => {
        const isCorrect = answer.weight > 0;
        const label = getLetterLabel(ai);
        const answerText = stripHtml(answer.html || answer.text);

        paragraphs.push(
          new Paragraph({
            spacing: { before: 60 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: `${label}) ${answerText}`,
                size: 22,
                bold: showAnswers && isCorrect,
                color: showAnswers && isCorrect ? '16a34a' : '000000',
              }),
              ...(showAnswers && isCorrect
                ? [new TextRun({ text: ' ✓', bold: true, color: '16a34a', size: 22 })]
                : []),
            ],
          })
        );
      });
    } else if (showAnswers && question.question_type === 'short_answer_question') {
      const correctAnswers = question.answers.filter(a => a.weight > 0);
      if (correctAnswers.length > 0) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 60 },
            indent: { left: 720 },
            children: [
              new TextRun({ text: 'Answer: ', bold: true, color: '16a34a', size: 22 }),
              new TextRun({ text: correctAnswers.map(a => stripHtml(a.html || a.text)).join(' or '), color: '16a34a', size: 22 }),
            ],
          })
        );
      }
    } else if (!showAnswers && ['short_answer_question', 'essay_question', 'numerical_question'].includes(question.question_type)) {
      // Add blank line for student answers
      paragraphs.push(
        new Paragraph({
          spacing: { before: 100 },
          indent: { left: 720 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999', space: 1 } },
          children: [new TextRun({ text: '', size: 22 })],
        })
      );
      paragraphs.push(
        new Paragraph({
          spacing: { before: 200 },
          indent: { left: 720 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999', space: 1 } },
          children: [new TextRun({ text: '', size: 22 })],
        })
      );
    }
  }

  return paragraphs;
}

function createDocument(quiz: Quiz, questions: QuizQuestion[], showAnswers: boolean, courseName: string): Document {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: quiz.title, bold: true, size: 36 })],
    })
  );

  // Course name
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [new TextRun({ text: courseName, size: 24, color: '666666' })],
    })
  );

  // Subtitle
  if (showAnswers) {
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: '— ANSWER KEY —', bold: true, size: 28, color: '16a34a' })],
      })
    );
  }

  // Info line
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `${questions.length} Questions`, size: 22, color: '666666' }),
        new TextRun({ text: `  •  ${quiz.points_possible} Points`, size: 22, color: '666666' }),
      ],
    })
  );

  // Student name line (only for student version)
  if (!showAnswers) {
    sections.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Name: ', bold: true, size: 24 }),
          new TextRun({ text: '________________________________________', size: 24 }),
        ],
      })
    );
    sections.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({ text: 'Date: ', bold: true, size: 24 }),
          new TextRun({ text: '________________________________________', size: 24 }),
        ],
      })
    );
  }

  // Separator
  sections.push(
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '333333', space: 1 } },
      children: [],
    })
  );

  // Questions
  const filteredQuestions = questions.filter(q => q.question_type !== 'text_only_question');
  filteredQuestions.forEach((question, index) => {
    sections.push(...buildQuestionParagraphs(question, index, showAnswers));
  });

  return new Document({
    sections: [{ children: sections }],
  });
}

export async function exportQuizToDocx(
  quiz: Quiz,
  questions: QuizQuestion[],
  courseName: string,
  includeAnswerKey: boolean
) {
  // Export student version
  const studentDoc = createDocument(quiz, questions, false, courseName);
  const studentBlob = await Packer.toBlob(studentDoc);
  const safeName = quiz.title.replace(/[^a-zA-Z0-9]/g, '_');
  saveAs(studentBlob, `${safeName}_Quiz.docx`);

  // Export answer key if requested
  if (includeAnswerKey) {
    const answerDoc = createDocument(quiz, questions, true, courseName);
    const answerBlob = await Packer.toBlob(answerDoc);
    saveAs(answerBlob, `${safeName}_Answer_Key.docx`);
  }
}
