import { saveAs } from 'file-saver';

export interface MasteryExportStudent {
  name: string;
  standardScores: Map<string, { correct: number; total: number }>;
}

export interface MasteryExportStandard {
  code: string;
  description: string;
}

/**
 * Export a Mastery Connect Tracker-compatible CSV.
 * Format: rows = students, columns = standards, cells = percent mastery.
 * This can be imported into Mastery Connect's tracker import.
 */
export function exportMasteryConnectCSV(
  title: string,
  students: MasteryExportStudent[],
  standards: MasteryExportStandard[]
) {
  if (standards.length === 0 || students.length === 0) return;

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  // Header row: Student Name, then each standard code
  const headerRow = ['Student Name', ...standards.map(s => s.code)];

  // Description row (optional but helpful): blank first cell, then descriptions
  const descRow = ['Standard Description', ...standards.map(s => escapeCSV(s.description))];

  // Student rows: name, then score percentage for each standard
  const studentRows = students
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(student => {
      const cells = [escapeCSV(student.name)];
      for (const std of standards) {
        const data = student.standardScores.get(std.code);
        if (data && data.total > 0) {
          const pct = Math.min(Math.round((data.correct / data.total) * 100), 100);
          cells.push(String(pct));
        } else {
          cells.push('');
        }
      }
      return cells;
    });

  const lines = [
    headerRow.join(','),
    descRow.join(','),
    ...studentRows.map(r => r.join(','))
  ];

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeName = title.replace(/[^a-zA-Z0-9]/g, '_');
  saveAs(blob, `${safeName}_MasteryConnect.csv`);
}

/**
 * Export a Mastery Connect Tracker CSV with raw scores (correct/total) instead of percentages.
 * Some Mastery Connect imports prefer this format.
 */
export function exportMasteryConnectDetailCSV(
  title: string,
  students: MasteryExportStudent[],
  standards: MasteryExportStandard[]
) {
  if (standards.length === 0 || students.length === 0) return;

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  // Header: Student Name, then for each standard: "CODE (Score)" and "CODE (Total)"
  const headerCells = ['Student Name'];
  for (const s of standards) {
    headerCells.push(`${s.code} Score`, `${s.code} Total`, `${s.code} %`);
  }

  const studentRows = students
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(student => {
      const cells = [escapeCSV(student.name)];
      for (const std of standards) {
        const data = student.standardScores.get(std.code);
        if (data && data.total > 0) {
          const pct = Math.min(Math.round((data.correct / data.total) * 100), 100);
          cells.push(String(data.correct), String(data.total), String(pct));
        } else {
          cells.push('', '', '');
        }
      }
      return cells;
    });

  const lines = [
    headerCells.join(','),
    ...studentRows.map(r => r.join(','))
  ];

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeName = title.replace(/[^a-zA-Z0-9]/g, '_');
  saveAs(blob, `${safeName}_MasteryConnect_Detail.csv`);
}
