/**
 * Mastery Connect Tracker CSV exporter.
 *
 * Two formats:
 *   - Percent grid (rows = students, columns = standards, cells = %).
 *   - Detail grid (Score / Total / % triples per standard).
 *
 * Dependencies: `file-saver`. No app-specific imports.
 */
import { saveAs } from "file-saver";
import type { PortableMasteryStudent, PortableStandard } from "./portable-types";
import { safeFilename } from "./strip-html";

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadCsv(filename: string, lines: string[]): Blob {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename);
  return blob;
}

export interface MasteryConnectExportOptions {
  title: string;
  students: PortableMasteryStudent[];
  standards: PortableStandard[];
}

/**
 * Percent-only Mastery Connect Tracker CSV.
 * Header row: "Student Name", then each standard code.
 * Second row: standard descriptions (helpful, ignored by importer).
 * Body rows: student name, then percent mastery per standard.
 */
export function exportMasteryConnectCSV(opts: MasteryConnectExportOptions): Blob | null {
  const { title, students, standards } = opts;
  if (standards.length === 0 || students.length === 0) return null;

  const header = ["Student Name", ...standards.map((s) => s.code)];
  const descRow = ["Standard Description", ...standards.map((s) => escapeCSV(s.description))];

  const rows = students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((student) => {
      const cells = [escapeCSV(student.name)];
      for (const std of standards) {
        const data = student.standardScores.get(std.code);
        if (data && data.total > 0) {
          const pct = Math.min(Math.round((data.correct / data.total) * 100), 100);
          cells.push(String(pct));
        } else {
          cells.push("");
        }
      }
      return cells;
    });

  return downloadCsv(`${safeFilename(title)}_MasteryConnect.csv`, [
    header.join(","),
    descRow.join(","),
    ...rows.map((r) => r.join(",")),
  ]);
}

/**
 * Detail-format Mastery Connect Tracker CSV with Score / Total / % triples.
 * Use this when the importer expects raw counts in addition to percent.
 */
export function exportMasteryConnectDetailCSV(opts: MasteryConnectExportOptions): Blob | null {
  const { title, students, standards } = opts;
  if (standards.length === 0 || students.length === 0) return null;

  const header = ["Student Name"];
  for (const s of standards) header.push(`${s.code} Score`, `${s.code} Total`, `${s.code} %`);

  const rows = students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((student) => {
      const cells = [escapeCSV(student.name)];
      for (const std of standards) {
        const data = student.standardScores.get(std.code);
        if (data && data.total > 0) {
          const pct = Math.min(Math.round((data.correct / data.total) * 100), 100);
          cells.push(String(data.correct), String(data.total), String(pct));
        } else {
          cells.push("", "", "");
        }
      }
      return cells;
    });

  return downloadCsv(`${safeFilename(title)}_MasteryConnect_Detail.csv`, [
    header.join(","),
    ...rows.map((r) => r.join(",")),
  ]);
}
