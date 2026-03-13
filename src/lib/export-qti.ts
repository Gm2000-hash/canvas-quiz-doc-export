import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { QuestionBankItem } from './question-bank';

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getLetterLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function buildMetadataXml(q: QuestionBankItem): string {
  const parts: string[] = [];

  // DOK Level
  if (q.dok_level != null) {
    parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_webbdepthofknowledge</fieldlabel>
          <fieldentry>${q.dok_level}</fieldentry>
        </qtimetadatafield>`);
  }

  // Bloom's Level
  if (q.blooms_level) {
    parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_bloomstaxonomy</fieldlabel>
          <fieldentry>${escapeXml(q.blooms_level)}</fieldentry>
        </qtimetadatafield>`);
  }

  // Points
  parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_maximumscore</fieldlabel>
          <fieldentry>${q.points_possible}</fieldentry>
        </qtimetadatafield>`);

  // Question type mapping
  const typeMap: Record<string, string> = {
    multiple_choice_question: 'Multiple Choice',
    true_false_question: 'True/False',
    short_answer_question: 'Short Answer',
    essay_question: 'Essay',
    multiple_answers_question: 'Multiple Response',
    fill_in_multiple_blanks_question: 'Fill in the Blank',
    matching_question: 'Matching',
    numerical_question: 'Numerical',
  };
  parts.push(`
        <qtimetadatafield>
          <fieldlabel>qmd_itemtype</fieldlabel>
          <fieldentry>${escapeXml(typeMap[q.question_type] || q.question_type)}</fieldentry>
        </qtimetadatafield>`);

  return parts.join('');
}

function buildStandardsXml(q: QuestionBankItem): string {
  if (q.standards.length === 0) return '';
  return q.standards.map(s => `
        <qtimetadatafield>
          <fieldlabel>qmd_standard</fieldlabel>
          <fieldentry>${escapeXml(s.ngss_code)}: ${escapeXml(s.ngss_description)}</fieldentry>
        </qtimetadatafield>`).join('');
}

function buildMultipleChoiceItem(q: QuestionBankItem, itemId: string): string {
  const isMultiAnswer = q.question_type === 'multiple_answers_question';
  const rcardinality = isMultiAnswer ? 'Multiple' : 'Single';
  const correctAnswers = (q.answers || []).filter((a: any) => a.weight > 0);
  
  const responseConditions = correctAnswers.map((a: any, i: number) => `
          <respcondition${!isMultiAnswer && i === 0 ? ' continue="No"' : ''}>
            <conditionvar>
              <varequal respident="response1">${escapeXml(String(a.id))}</varequal>
            </conditionvar>
            <setvar action="Set" varname="SCORE">100</setvar>
          </respcondition>`).join('');

  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${buildMetadataXml(q)}${buildStandardsXml(q)}
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html"><![CDATA[${q.question_text}]]></mattext>
      </material>
      <response_lid ident="response1" rcardinality="${rcardinality}">
        <render_choice>
          ${(q.answers || []).map((a: any) => `
          <response_label ident="${escapeXml(String(a.id))}">
            <material>
              <mattext texttype="text/plain">${escapeXml(stripHtml(a.html || a.text || ''))}</mattext>
            </material>
          </response_label>`).join('')}
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

function buildShortAnswerItem(q: QuestionBankItem, itemId: string): string {
  const correctAnswers = (q.answers || []).filter((a: any) => a.weight > 0);
  
  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${buildMetadataXml(q)}${buildStandardsXml(q)}
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
      ${correctAnswers.map((a: any) => `
      <respcondition continue="No">
        <conditionvar>
          <varequal respident="response1">${escapeXml(stripHtml(a.html || a.text || ''))}</varequal>
        </conditionvar>
        <setvar action="Set" varname="SCORE">100</setvar>
      </respcondition>`).join('')}
    </resprocessing>
  </item>`;
}

function buildEssayItem(q: QuestionBankItem, itemId: string): string {
  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${buildMetadataXml(q)}${buildStandardsXml(q)}
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

function buildMatchingItem(q: QuestionBankItem, itemId: string): string {
  const answers = q.answers || [];
  // Matching answers typically have: { left: string, right: string } or { text: string, match_id/right: string }
  const pairs = answers.map((a: any, i: number) => ({
    id: `pair_${i}`,
    left: stripHtml(a.left || a.text || ''),
    right: stripHtml(a.right || a.match || ''),
  }));

  // Unique right-side options (targets)
  const uniqueRights = [...new Set(pairs.map(p => p.right))];

  const responseLids = pairs.map(p => `
      <response_lid ident="response_${p.id}">
        <material>
          <mattext texttype="text/plain">${escapeXml(p.left)}</mattext>
        </material>
        <render_choice>
          ${uniqueRights.map((r, ri) => `
          <response_label ident="right_${ri}">
            <material>
              <mattext texttype="text/plain">${escapeXml(r)}</mattext>
            </material>
          </response_label>`).join('')}
        </render_choice>
      </response_lid>`).join('');

  const respconditions = pairs.map(p => {
    const rightIndex = uniqueRights.indexOf(p.right);
    return `
      <respcondition>
        <conditionvar>
          <varequal respident="response_${p.id}">right_${rightIndex}</varequal>
        </conditionvar>
        <setvar action="Add" varname="SCORE">${(100 / pairs.length).toFixed(2)}</setvar>
      </respcondition>`;
  }).join('');

  return `
  <item ident="${itemId}" title="${escapeXml(stripHtml(q.question_text).slice(0, 80))}">
    <itemmetadata>
      <qtimetadata>${buildMetadataXml(q)}${buildStandardsXml(q)}
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

function buildItemXml(q: QuestionBankItem, index: number): string {
  const itemId = `item_${index + 1}_${q.id.slice(0, 8)}`;
  
  switch (q.question_type) {
    case 'multiple_choice_question':
    case 'true_false_question':
    case 'multiple_answers_question':
      return buildMultipleChoiceItem(q, itemId);
    case 'matching_question':
      return buildMatchingItem(q, itemId);
    case 'short_answer_question':
    case 'fill_in_multiple_blanks_question':
    case 'numerical_question':
      return buildShortAnswerItem(q, itemId);
    case 'essay_question':
      return buildEssayItem(q, itemId);
    default:
      return buildEssayItem(q, itemId);
  }
}

export async function exportToQTI(
  title: string,
  questions: QuestionBankItem[]
) {
  const zip = new JSZip();
  const assessmentId = `assessment_${Date.now()}`;
  
  // Build assessment XML
  const itemsXml = questions.map((q, i) => buildItemXml(q, i)).join('\n');
  
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

  // Build manifest
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="manifest_${assessmentId}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="res_${assessmentId}" type="imsqti_xmlv1p2" href="${assessmentId}.xml">
      <file href="${assessmentId}.xml"/>
    </resource>
  </resources>
</manifest>`;

  zip.file('imsmanifest.xml', manifestXml);
  zip.file(`${assessmentId}.xml`, assessmentXml);

  const blob = await zip.generateAsync({ type: 'blob' });
  const safeName = title.replace(/[^a-zA-Z0-9]/g, '_');
  saveAs(blob, `${safeName}_QTI.zip`);
}
