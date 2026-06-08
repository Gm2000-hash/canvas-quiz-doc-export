/**
 * Quiz → QTI 1.2 .zip exporter (Canvas / Blackboard / Moodle import).
 *
 * Optionally bundles a `results.xml` with per-student per-question scores so
 * downstream LMSes that read QTI results can ingest analytics too.
 *
 * Dependencies: `jszip`, `file-saver`. No app-specific imports.
 */
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type {
  PortableAnswer,
  PortableQuestion,
  PortableStudentResult,
} from "./portable-types";
import { escapeXml, safeFilename, stripHtml } from "./strip-html";

function metadataXml(q: PortableQuestion): string {
  const parts: string[] = [];

  if (q.dok_level != null) {
    parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_webbdepthofknowledge</fieldlabel>
          <fieldentry>${q.dok_level}</fieldentry>
        </qtimetadatafield>`);
  }

  if (q.blooms_level) {
    parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_bloomstaxonomy</fieldlabel>
          <fieldentry>${escapeXml(q.blooms_level)}</fieldentry>
        </qtimetadatafield>`);
  }

  parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_maximumscore</fieldlabel>
          <fieldentry>${q.points_possible}</fieldentry>
        </qtimetadatafield>`);

  const typeMap: Record<string, string> = {
    multiple_choice_question: "Multiple Choice",
    true_false_question: "True/False",
    short_answer_question: "Short Answer",
    essay_question: "Essay",
    multiple_answers_question: "Multiple Response",
    fill_in_multiple_blanks_question: "Fill in the Blank",
    matching_question: "Matching",
    numerical_question: "Numerical",
  };
  parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_itemtype</fieldlabel>
          <fieldentry>${escapeXml(typeMap[q.question_type] || q.question_type)}</fieldentry>
        </qtimetadatafield>`);

  return parts.join("");
}

function standardsXml(q: PortableQuestion): string {
  if (!q.standards || q.standards.length === 0) return "";
  return q.standards
    .map(
      (s) => `
        <qtimetadatafield>
          <fieldlabel>qmd_standard</fieldlabel>
          <fieldentry>${escapeXml(s.code)}: ${escapeXml(s.description)}</fieldentry>
        </qtimetadatafield>`,
    )
    .join("");
}

function multipleChoiceItem(q: PortableQuestion, itemId: string): string {
  const answers: PortableAnswer[] = q.answers ?? [];
  const isMultiAnswer = q.question_type === "multiple_answers_question";
  const rcardinality = isMultiAnswer ? "Multiple" : "Single";
  const correct = answers.filter((a) => (a.weight ?? 0) > 0);

  const responseConditions = correct
    .map(
      (a, i) => `
          <respcondition${!isMultiAnswer && i === 0 ? ' continue="No"' : ""}>
            <conditionvar>
              <varequal respident="response1">${escapeXml(String(a.id))}</varequal>
            </conditionvar>
            <setvar action="Set" varname="SCORE">100</setvar>
          </respcondition>`,
    )
    .join("");

  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${metadataXml(q)}${standardsXml(q)}
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html"><![CDATA[${q.question_text}]]></mattext>
      </material>
      <response_lid ident="response1" rcardinality="${rcardinality}">
        <render_choice>
          ${answers
            .map(
              (a) => `
          <response_label ident="${escapeXml(String(a.id))}">
            <material>
              <mattext texttype="text/plain">${escapeXml(stripHtml(a.html || a.text || ""))}</mattext>
            </material>
          </response_label>`,
            )
            .join("")}
        </render_choice>
      </response_lid>
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>${responseConditions}
    </resprocessing>
  </item>`;
}

function shortAnswerItem(q: PortableQuestion, itemId: string): string {
  const correct = (q.answers ?? []).filter((a) => (a.weight ?? 0) > 0);
  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${metadataXml(q)}${standardsXml(q)}
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html"><![CDATA[${q.question_text}]]></mattext>
      </material>
      <response_str ident="response1" rcardinality="Single">
        <render_fib>
          <response_label ident="answer1" rshuffle="No"/>
        </render_fib>
      </response_str>
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>
      ${correct
        .map(
          (a) => `
      <respcondition continue="No">
        <conditionvar>
          <varequal respident="response1">${escapeXml(stripHtml(a.html || a.text || ""))}</varequal>
        </conditionvar>
        <setvar action="Set" varname="SCORE">100</setvar>
      </respcondition>`,
        )
        .join("")}
    </resprocessing>
  </item>`;
}

function essayItem(q: PortableQuestion, itemId: string): string {
  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${metadataXml(q)}${standardsXml(q)}
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html"><![CDATA[${q.question_text}]]></mattext>
      </material>
      <response_str ident="response1" rcardinality="Single">
        <render_fib>
          <response_label ident="answer1" rshuffle="No"/>
        </render_fib>
      </response_str>
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>
    </resprocessing>
  </item>`;
}

function matchingItem(q: PortableQuestion, itemId: string): string {
  const answers = q.answers ?? [];
  const pairs = answers.map((a, i) => ({
    id: `pair_${i}`,
    left: stripHtml(a.left || a.text || ""),
    right: stripHtml(a.right || a.match || ""),
  }));
  const uniqueRights = [...new Set(pairs.map((p) => p.right))];

  const responseLids = pairs
    .map(
      (p) => `
      <response_lid ident="response_${p.id}">
        <material>
          <mattext texttype="text/plain">${escapeXml(p.left)}</mattext>
        </material>
        <render_choice>
          ${uniqueRights
            .map(
              (r, ri) => `
          <response_label ident="right_${ri}">
            <material>
              <mattext texttype="text/plain">${escapeXml(r)}</mattext>
            </material>
          </response_label>`,
            )
            .join("")}
        </render_choice>
      </response_lid>`,
    )
    .join("");

  const respconditions = pairs
    .map((p) => {
      const idx = uniqueRights.indexOf(p.right);
      return `
      <respcondition>
        <conditionvar>
          <varequal respident="response_${p.id}">right_${idx}</varequal>
        </conditionvar>
        <setvar action="Add" varname="SCORE">${(100 / pairs.length).toFixed(2)}</setvar>
      </respcondition>`;
    })
    .join("");

  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${metadataXml(q)}${standardsXml(q)}
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html"><![CDATA[${q.question_text}]]></mattext>
      </material>
      ${responseLids}
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>${respconditions}
    </resprocessing>
  </item>`;
}

function itemXml(q: PortableQuestion, index: number): string {
  const shortId = String(q.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || String(index);
  const itemId = `item_${index + 1}_${shortId}`;

  switch (q.question_type) {
    case "multiple_choice_question":
    case "true_false_question":
    case "multiple_answers_question":
      return multipleChoiceItem(q, itemId);
    case "matching_question":
      return matchingItem(q, itemId);
    case "short_answer_question":
    case "fill_in_multiple_blanks_question":
    case "numerical_question":
      return shortAnswerItem(q, itemId);
    case "essay_question":
      return essayItem(q, itemId);
    default:
      return essayItem(q, itemId);
  }
}

function resultsXml(
  assessmentId: string,
  title: string,
  questions: PortableQuestion[],
  students: PortableStudentResult[],
): string {
  const studentEntries = students
    .map((student, si) => {
      const itemResults = questions
        .map((q, qi) => {
          const shortId = String(q.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || String(qi);
          const itemId = `item_${qi + 1}_${shortId}`;
          const data = student.scores.get(q.id);
          const score = data?.score ?? 0;
          const possible = data?.possible ?? q.points_possible;
          const pct = possible > 0 ? Math.min(Math.round((score / possible) * 100), 100) : 0;
          const standards = q.standards ?? [];
          const stdEntry =
            standards.length > 0
              ? `
            <entry key="standards">${standards.map((s) => escapeXml(s.code)).join(", ")}</entry>`
              : "";
          return `
        <item_result identifier="${itemId}">
          <result_metadata>
            <entry key="points_earned">${score}</entry>
            <entry key="points_possible">${possible}</entry>
            <entry key="percent">${pct}</entry>${stdEntry}
          </result_metadata>
        </item_result>`;
        })
        .join("");

      const totalScore = questions.reduce((sum, q) => sum + (student.scores.get(q.id)?.score ?? 0), 0);
      const totalPossible = questions.reduce(
        (sum, q) => sum + (student.scores.get(q.id)?.possible ?? q.points_possible),
        0,
      );

      return `
    <assessment_result identifier="result_${si}" student_name="${escapeXml(student.name)}">
      <result_metadata>
        <entry key="total_score">${totalScore}</entry>
        <entry key="total_possible">${totalPossible}</entry>
        <entry key="percent">${totalPossible > 0 ? Math.min(Math.round((totalScore / totalPossible) * 100), 100) : 0}</entry>
      </result_metadata>${itemResults}
    </assessment_result>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<results_report assessment_ident="${assessmentId}" title="${escapeXml(title)}">
  <metadata>
    <entry key="exported_at">${new Date().toISOString()}</entry>
    <entry key="student_count">${students.length}</entry>
    <entry key="question_count">${questions.length}</entry>
  </metadata>${studentEntries}
</results_report>`;
}

export interface ExportToQTIOptions {
  title: string;
  questions: PortableQuestion[];
  /** Optional analytics payload — adds a `results.xml` to the manifest. */
  studentResults?: PortableStudentResult[];
}

/**
 * Browser-only: triggers a `saveAs` download of a QTI 1.2 .zip package.
 * Returns the blob so callers can upload it instead if they prefer.
 */
export async function exportToQTI(opts: ExportToQTIOptions): Promise<Blob> {
  const { title, questions, studentResults } = opts;
  const zip = new JSZip();
  const assessmentId = `assessment_${Date.now()}`;
  const itemsXml = questions.map((q, i) => itemXml(q, i)).join("\n");

  const assessmentXml = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
  <assessment ident="${assessmentId}" title="${escapeXml(title)}">
    <qtimetadata>
      <qtimetadatafield>
        <fieldlabel>qmd_timelimit</fieldlabel>
        <fieldentry/>
      </qtimetadatafield>
    </qtimetadata>
    <section ident="root_section">
${itemsXml}
    </section>
  </assessment>
</questestinterop>`;

  const resourceFiles = [`<file href="${assessmentId}.xml"/>`];
  if (studentResults && studentResults.length > 0) {
    resourceFiles.push(`<file href="results.xml"/>`);
  }

  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="manifest_${assessmentId}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="res_${assessmentId}" type="imsqti_xmlv1p2" href="${assessmentId}.xml">
      ${resourceFiles.join("\n      ")}
    </resource>
  </resources>
</manifest>`;

  zip.file("imsmanifest.xml", manifestXml);
  zip.file(`${assessmentId}.xml`, assessmentXml);
  if (studentResults && studentResults.length > 0) {
    zip.file("results.xml", resultsXml(assessmentId, title, questions, studentResults));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${safeFilename(title)}_QTI.zip`);
  return blob;
}
