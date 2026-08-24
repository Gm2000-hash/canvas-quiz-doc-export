import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Grid3x3 } from "lucide-react";
import {
  MASTERY_EVENT,
  buildStandardsTree,
  getMasterySnapshot,
  levelClasses,
  pctToLevel,
  type MasterySnapshot,
} from "@/lib/standards-mastery";

type ColKind = "discipline" | "domain" | "code";

interface Column {
  id: string;
  kind: ColKind;
  label: string;
  title: string;
  /** Standard codes aggregated by this column. */
  codes: string[];
  /** Present for expandable columns. */
  expandable: boolean;
  expanded: boolean;
  onToggle?: () => void;
}

/** Average of the per-code levels a student actually has data for. */
function cellValue(
  scores: Record<string, { correct: number; total: number }> | undefined,
  codes: string[]
): { level: number; correct: number; total: number } | null {
  if (!scores) return null;
  const levels: number[] = [];
  let correct = 0;
  let total = 0;
  for (const code of codes) {
    const s = scores[code];
    if (!s || s.total <= 0) continue;
    correct += s.correct;
    total += s.total;
    levels.push(pctToLevel((s.correct / s.total) * 100));
  }
  if (levels.length === 0) return null;
  return { level: levels.reduce((a, b) => a + b, 0) / levels.length, correct, total };
}

function fmtLevel(level: number, isLeaf: boolean) {
  return isLeaf ? String(Math.round(level)) : level.toFixed(1);
}

export function StandardsMasteryMatrix({ onGoToResults }: { onGoToResults?: () => void }) {
  const [snapshot, setSnapshot] = useState<MasterySnapshot | null>(() => getMasterySnapshot());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onUpdate = () => setSnapshot(getMasterySnapshot());
    window.addEventListener(MASTERY_EVENT, onUpdate);
    return () => window.removeEventListener(MASTERY_EVENT, onUpdate);
  }, []);

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const tree = useMemo(() => buildStandardsTree(snapshot?.standards || []), [snapshot]);

  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = [];
    for (const disc of tree) {
      const discCodes = disc.children.flatMap(d => d.children.map(c => c.code));
      const discId = `d:${disc.key}`;
      const discOpen = expanded.has(discId);
      cols.push({
        id: discId,
        kind: "discipline",
        label: disc.label,
        title: `${disc.label} — ${discCodes.length} standard${discCodes.length !== 1 ? "s" : ""}`,
        codes: discCodes,
        expandable: discCodes.length > 0,
        expanded: discOpen,
        onToggle: () => toggle(discId),
      });
      if (!discOpen) continue;
      for (const dom of disc.children) {
        const domId = `m:${disc.key}:${dom.key}`;
        const domOpen = expanded.has(domId);
        const domCodes = dom.children.map(c => c.code);
        cols.push({
          id: domId,
          kind: "domain",
          label: dom.label,
          title: `${dom.label} — ${domCodes.length} standard${domCodes.length !== 1 ? "s" : ""}`,
          codes: domCodes,
          expandable: domCodes.length > 1 || !domOpen,
          expanded: domOpen,
          onToggle: () => toggle(domId),
        });
        if (!domOpen) continue;
        for (const std of dom.children) {
          cols.push({
            id: `c:${std.code}`,
            kind: "code",
            label: std.code,
            title: `${std.code} — ${std.desc}`,
            codes: [std.code],
            expandable: false,
            expanded: false,
          });
        }
      }
    }
    return cols;
  }, [tree, expanded]);

  if (!snapshot || snapshot.students.length === 0 || snapshot.standards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" /> Standards Mastery Matrix
          </CardTitle>
          <CardDescription>Students by standard, scored 1–4.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Load a quiz in the Results tab and confirm its standards mappings — the mastery grid builds
            from that report.
          </p>
          {onGoToResults && (
            <Button size="sm" variant="outline" onClick={onGoToResults}>
              Load a quiz in Results
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const classAverages = columns.map(col => {
    const vals = snapshot.students
      .map(s => cellValue(s.scores, col.codes)?.level)
      .filter((v): v is number => v != null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3x3 className="h-4 w-4" /> Standards Mastery Matrix
        </CardTitle>
        <CardDescription>
          {snapshot.quizTitle}
          {snapshot.courseName ? ` · ${snapshot.courseName}` : ""} — click a column header to expand
          discipline → domain → standard. Scale: 4 = 90%+, 3 = 75–89%, 2 = 60–74%, 1 = below 60%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={200}>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 backdrop-blur-sm text-left font-medium px-3 py-2 border-r border-border min-w-[180px]">
                    Student
                  </th>
                  {columns.map(col => (
                    <th
                      key={col.id}
                      className={`px-2 py-2 border-r border-border last:border-r-0 align-bottom whitespace-nowrap ${
                        col.kind === "code" ? "font-normal text-xs" : "font-medium text-xs"
                      }`}
                    >
                      {col.expandable ? (
                        <button
                          type="button"
                          onClick={col.onToggle}
                          title={col.title}
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          <ChevronRight
                            className={`h-3 w-3 transition-transform ${col.expanded ? "rotate-90" : ""}`}
                          />
                          {col.label}
                        </button>
                      ) : (
                        <span title={col.title}>{col.label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.students.map(student => (
                  <tr key={student.studentName} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-card px-3 py-1.5 border-r border-border font-medium whitespace-nowrap">
                      {student.studentName}
                    </td>
                    {columns.map(col => {
                      const v = cellValue(student.scores, col.codes);
                      if (!v) {
                        return (
                          <td
                            key={col.id}
                            className="px-2 py-1.5 text-center text-muted-foreground/40 border-r border-border last:border-r-0"
                          >
                            —
                          </td>
                        );
                      }
                      const p = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
                      return (
                        <td
                          key={col.id}
                          className="px-1 py-1 text-center border-r border-border last:border-r-0"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`inline-flex min-w-[2.25rem] justify-center rounded px-1.5 py-0.5 font-semibold ${levelClasses(v.level)}`}
                              >
                                {fmtLevel(v.level, col.kind === "code")}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-medium">{col.label}</div>
                                <div>
                                  {v.correct.toFixed(1)} / {v.total} pts · {p}%
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-muted/40">
                  <td className="sticky left-0 z-10 bg-muted/40 px-3 py-1.5 border-r border-border font-semibold whitespace-nowrap">
                    Class average
                  </td>
                  {classAverages.map((avg, i) => (
                    <td
                      key={columns[i].id}
                      className="px-2 py-1.5 text-center border-r border-border last:border-r-0 font-semibold"
                    >
                      {avg == null ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        <span className={`rounded px-1.5 py-0.5 ${levelClasses(avg)}`}>{avg.toFixed(1)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
