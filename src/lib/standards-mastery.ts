/**
 * Shared standards-mastery snapshot.
 *
 * The Canvas Results tab computes per-student, per-standard point totals from
 * the Canvas quiz report CSV. This module lets that result be published once
 * and read by the Analytics tab (and survive a reload via sessionStorage).
 */

const STORAGE_KEY = "canvas_standards_mastery";
export const MASTERY_EVENT = "canvas-standards-mastery-updated";

export interface MasteryStudentRow {
  studentName: string;
  /** standard code → raw points earned / possible */
  scores: Record<string, { correct: number; total: number }>;
}

export interface MasterySnapshot {
  quizTitle: string;
  courseName: string;
  capturedAt: string;
  /** All standard codes present, with descriptions. */
  standards: { code: string; desc: string }[];
  students: MasteryStudentRow[];
}

export function getMasterySnapshot(): MasterySnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MasterySnapshot) : null;
  } catch {
    return null;
  }
}

export function saveMasterySnapshot(snapshot: MasterySnapshot) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch { /* quota — in-memory event still fires */ }
  window.dispatchEvent(new CustomEvent(MASTERY_EVENT));
}

export function clearMasterySnapshot() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(MASTERY_EVENT));
}

// ── 1-4 mastery scale ──

/** 4: 90%+, 3: 75–89%, 2: 60–74%, 1: <60% */
export function pctToLevel(pct: number): 1 | 2 | 3 | 4 {
  if (pct >= 90) return 4;
  if (pct >= 75) return 3;
  if (pct >= 60) return 2;
  return 1;
}

export function levelClasses(level: number): string {
  if (level >= 3.5) return "bg-green-600/15 text-green-700 dark:text-green-400";
  if (level >= 2.5) return "bg-green-500/10 text-green-600 dark:text-green-400";
  if (level >= 1.5) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-destructive/15 text-destructive";
}

// ── Code parsing: discipline → domain → code ──

const DISCIPLINE_LABELS: Record<string, string> = {
  PS: "Physical Science",
  LS: "Life Science",
  ESS: "Earth & Space Science",
  ETS: "Engineering Design",
};

export interface StandardNode {
  code: string;
  desc: string;
}

export interface DomainNode {
  key: string;
  label: string;
  children: StandardNode[];
}

export interface DisciplineNode {
  key: string;
  label: string;
  children: DomainNode[];
}

/**
 * Parse an NGSS-style code such as "MS-PS1-1" into
 * discipline "PS" and domain "MS-PS1". Anything unrecognized
 * (Idaho codes, "Untagged") groups under "Other".
 */
function parseCode(code: string): { discipline: string; disciplineLabel: string; domain: string } {
  const m = code.match(/^([A-Z0-9]+)-(PS|LS|ESS|ETS)(\d+)/i);
  if (m) {
    const disc = m[2].toUpperCase();
    return {
      discipline: disc,
      disciplineLabel: DISCIPLINE_LABELS[disc] || disc,
      domain: `${m[1].toUpperCase()}-${disc}${m[3]}`,
    };
  }
  // Idaho / other frameworks: group by the leading segment before the first dot or dash.
  const seg = code.split(/[.\-\s]/)[0] || "Other";
  return { discipline: "OTHER", disciplineLabel: "Other standards", domain: seg };
}

/** Build the three-level column tree from a flat standards list. */
export function buildStandardsTree(standards: { code: string; desc: string }[]): DisciplineNode[] {
  const discMap = new Map<string, DisciplineNode>();
  for (const s of standards) {
    const { discipline, disciplineLabel, domain } = parseCode(s.code);
    let d = discMap.get(discipline);
    if (!d) {
      d = { key: discipline, label: disciplineLabel, children: [] };
      discMap.set(discipline, d);
    }
    let dom = d.children.find(x => x.key === domain);
    if (!dom) {
      dom = { key: domain, label: domain, children: [] };
      d.children.push(dom);
    }
    if (!dom.children.some(c => c.code === s.code)) {
      dom.children.push({ code: s.code, desc: s.desc });
    }
  }
  const order = ["PS", "LS", "ESS", "ETS", "OTHER"];
  const list = Array.from(discMap.values()).sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key)
  );
  for (const d of list) {
    d.children.sort((a, b) => a.key.localeCompare(b.key));
    for (const dom of d.children) dom.children.sort((a, b) => a.code.localeCompare(b.code));
  }
  return list;
}
