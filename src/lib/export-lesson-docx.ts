import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } from "docx";
import { saveAs } from "file-saver";

interface Activity {
  name: string;
  duration: number;
  description: string;
}

interface LessonPlan {
  id: string;
  title: string;
  lesson_date: string | null;
  duration_minutes: number;
  objectives: string;
  activities: Activity[];
  materials: string;
  assessment: string;
  differentiation: string;
  notes: string;
  vocabulary?: { term: string; definition: string }[];
  standards?: { ngss_code: string; ngss_description: string }[];
}

interface Unit {
  title: string;
  description: string;
  grade_level: string;
  discipline: string;
  date_start: string | null;
  date_end: string | null;
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: "0A7AFF" })],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function buildLessonParagraphs(lesson: LessonPlan, index: number): Paragraph[] {
  const paras: Paragraph[] = [];

  // Lesson heading
  paras.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({ text: `Lesson ${index + 1}: ${lesson.title}`, bold: true, size: 28 }),
        ...(lesson.lesson_date
          ? [new TextRun({ text: `  (${lesson.lesson_date})`, size: 22, color: "666666" })]
          : []),
        new TextRun({ text: `  •  ${lesson.duration_minutes} min`, size: 22, color: "666666" }),
      ],
    })
  );

  // Separator
  paras.push(new Paragraph({
    spacing: { after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
    children: [],
  }));

  // Standards
  if (lesson.standards && lesson.standards.length > 0) {
    paras.push(sectionTitle("NGSS Standards"));
    lesson.standards.forEach(s => {
      paras.push(bodyText(`${s.ngss_code} — ${s.ngss_description}`));
    });
  }

  // Objectives
  if (lesson.objectives) {
    paras.push(sectionTitle("Learning Objectives"));
    lesson.objectives.split("\n").filter(Boolean).forEach(line => paras.push(bodyText(line)));
  }

  // Key Vocabulary
  if (lesson.vocabulary && lesson.vocabulary.length > 0) {
    paras.push(sectionTitle("Key Vocabulary"));
    lesson.vocabulary.forEach(v => {
      paras.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: v.term, bold: true, size: 22 }),
          new TextRun({ text: ` — ${v.definition}`, size: 22 }),
        ],
      }));
    });
  }

  // Activities
  if (lesson.activities.length > 0) {
    paras.push(sectionTitle("Activities & Timing"));
    lesson.activities.forEach(act => {
      paras.push(new Paragraph({
        spacing: { before: 80, after: 40 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: `${act.name}`, bold: true, size: 22 }),
          new TextRun({ text: ` (${act.duration} min)`, size: 20, color: "666666" }),
        ],
      }));
      if (act.description) {
        paras.push(new Paragraph({
          indent: { left: 720 },
          spacing: { after: 60 },
          children: [new TextRun({ text: act.description, size: 20 })],
        }));
      }
    });
  }

  // Materials
  if (lesson.materials) {
    paras.push(sectionTitle("Materials & Resources"));
    lesson.materials.split("\n").filter(Boolean).forEach(line => paras.push(bodyText(line)));
  }

  // Assessment
  if (lesson.assessment) {
    paras.push(sectionTitle("Assessment"));
    lesson.assessment.split("\n").filter(Boolean).forEach(line => paras.push(bodyText(line)));
  }

  // Differentiation
  if (lesson.differentiation) {
    paras.push(sectionTitle("Differentiation"));
    lesson.differentiation.split("\n").filter(Boolean).forEach(line => paras.push(bodyText(line)));
  }

  // Notes
  if (lesson.notes) {
    paras.push(sectionTitle("Teacher Notes"));
    lesson.notes.split("\n").filter(Boolean).forEach(line => paras.push(bodyText(line)));
  }

  return paras;
}

export async function exportUnitToDocx(unit: Unit, lessons: LessonPlan[]) {
  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: unit.title, bold: true, size: 36 })],
  }));

  // Subtitle
  const meta = [unit.discipline, unit.grade_level].filter(Boolean).join(" • ");
  if (meta) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [new TextRun({ text: meta, size: 24, color: "666666" })],
    }));
  }

  // Date range
  if (unit.date_start) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [new TextRun({ text: `${unit.date_start}${unit.date_end ? " – " + unit.date_end : ""}`, size: 22, color: "666666" })],
    }));
  }

  // Description
  if (unit.description) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: unit.description, size: 22, italics: true })],
    }));
  }

  // Info line
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: `${lessons.length} Lessons`, size: 22, color: "666666" })],
  }));

  // Separator
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "333333", space: 1 } },
    children: [],
  }));

  // Lessons
  lessons.forEach((lesson, idx) => {
    children.push(...buildLessonParagraphs(lesson, idx));
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safeName = unit.title.replace(/[^a-zA-Z0-9]/g, "_");
  saveAs(blob, `${safeName}_Unit_Plan.docx`);
}
