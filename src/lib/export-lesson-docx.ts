import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } from "docx";
import { saveAs } from "file-saver";

interface Activity {
  name: string;
  duration: number;
  description: string;
}

interface VocabScaffold {
  term: string;
  student_friendly: string;
  visual_cue: string;
}

interface UdlSupports {
  engagement?: {
    hook?: string;
    student_choice?: string[];
    collaboration?: string;
    sustain_effort?: string;
    self_regulation_prompt?: string;
  };
  representation?: {
    visual?: string;
    auditory?: string;
    text_supports?: string;
    vocabulary_scaffolds?: VocabScaffold[];
    big_idea_highlight?: string;
    background_activation?: string;
  };
  action_expression?: {
    response_modes?: string[];
    physical_action_options?: string;
    planning_scaffold?: string;
    progress_checkpoint?: string;
    flexible_assessment?: string;
  };
  reflection_prompt?: string;
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
  udl_supports?: UdlSupports;
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

  // UDL Supports
  const udl = lesson.udl_supports;
  if (udl && (udl.engagement || udl.representation || udl.action_expression || udl.reflection_prompt)) {
    paras.push(sectionTitle("UDL Supports (CAST v2.2)"));

    const subHeading = (text: string, color: string) => new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text, bold: true, size: 22, color })],
    });

    const labeled = (label: string, value?: string) => {
      if (!value) return;
      paras.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 20 }),
          new TextRun({ text: value, size: 20 }),
        ],
      }));
    };

    const list = (label: string, items?: string[]) => {
      if (!items || items.length === 0) return;
      paras.push(new Paragraph({
        spacing: { before: 60, after: 20 },
        indent: { left: 360 },
        children: [new TextRun({ text: label, bold: true, size: 20 })],
      }));
      items.forEach(item => paras.push(new Paragraph({
        spacing: { after: 20 },
        indent: { left: 720 },
        children: [new TextRun({ text: `• ${item}`, size: 20 })],
      })));
    };

    if (udl.engagement) {
      paras.push(subHeading("🎯 Engagement (the WHY)", "B45309"));
      labeled("Hook", udl.engagement.hook);
      list("Student Choice", udl.engagement.student_choice);
      labeled("Collaboration", udl.engagement.collaboration);
      labeled("Sustain Effort", udl.engagement.sustain_effort);
      labeled("Self-Regulation Prompt", udl.engagement.self_regulation_prompt);
    }

    if (udl.representation) {
      paras.push(subHeading("👁 Representation (the WHAT)", "1D4ED8"));
      labeled("Visual", udl.representation.visual);
      labeled("Auditory", udl.representation.auditory);
      labeled("Text Supports", udl.representation.text_supports);
      labeled("Big Idea Highlight", udl.representation.big_idea_highlight);
      labeled("Background Activation", udl.representation.background_activation);
      if (udl.representation.vocabulary_scaffolds && udl.representation.vocabulary_scaffolds.length > 0) {
        paras.push(new Paragraph({
          spacing: { before: 60, after: 20 },
          indent: { left: 360 },
          children: [new TextRun({ text: "Vocabulary Scaffolds", bold: true, size: 20 })],
        }));
        udl.representation.vocabulary_scaffolds.forEach(vs => {
          paras.push(new Paragraph({
            spacing: { after: 20 },
            indent: { left: 720 },
            children: [
              new TextRun({ text: `${vs.term}: `, bold: true, size: 20 }),
              new TextRun({ text: vs.student_friendly, size: 20 }),
              new TextRun({ text: ` (cue: ${vs.visual_cue})`, italics: true, size: 18, color: "666666" }),
            ],
          }));
        });
      }
    }

    if (udl.action_expression) {
      paras.push(subHeading("✋ Action & Expression (the HOW)", "15803D"));
      list("Response Modes", udl.action_expression.response_modes);
      labeled("Physical Action / Manipulatives", udl.action_expression.physical_action_options);
      labeled("Planning Scaffold", udl.action_expression.planning_scaffold);
      labeled("Progress Checkpoint", udl.action_expression.progress_checkpoint);
      labeled("Flexible Assessment", udl.action_expression.flexible_assessment);
    }

    if (udl.reflection_prompt) {
      paras.push(subHeading("💭 Closing Reflection Prompt", "7E22CE"));
      paras.push(bodyText(udl.reflection_prompt));
    }
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

export async function exportLessonToDocx(lesson: LessonPlan) {
  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 100 },
    children: [new TextRun({ text: lesson.title, bold: true, size: 36 })],
  }));

  // Meta line
  const metaParts: string[] = [];
  if (lesson.lesson_date) metaParts.push(lesson.lesson_date);
  metaParts.push(`${lesson.duration_minutes} minutes`);
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: metaParts.join("  •  "), size: 22, color: "666666" })],
  }));

  // Separator
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "333333", space: 1 } },
    spacing: { after: 100 },
    children: [],
  }));

  children.push(...buildLessonParagraphs(lesson, 0).slice(2)); // skip heading + separator since we already have them

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safeName = lesson.title.replace(/[^a-zA-Z0-9]/g, "_");
  saveAs(blob, `${safeName}_Lesson_Plan.docx`);
}
