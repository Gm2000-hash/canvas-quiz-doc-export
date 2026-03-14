import { useState, useEffect, useMemo, useCallback } from "react";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { SettingsForm } from "@/components/SettingsForm";
import { getCourses, getQuizzes, getQuizQuestions, getEnrollments, getQuizReport, type CanvasConfig, type Course, type Quiz, type QuizQuestion } from "@/lib/canvas-api";
import { getQuestionBank, type QuestionBankItem } from "@/lib/question-bank";
import { supabase } from "@/integrations/supabase/client";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, BarChart3, Users, BookOpen, ArrowLeft, Sparkles, Pencil, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { PageBanner } from "@/components/PageBanner";

// ── Types ──

interface StudentScore {
  studentId: number;
  studentName: string;
  questionScores: Map<number, { score: number; possible: number }>;
  totalScore: number;
  totalPossible: number;
}

interface StandardPerformance {
  standardCode: string;
  standardDescription: string;
  students: { name: string; correct: number; total: number; pct: number }[];
  avgPct: number;
}

interface QuestionMapping {
  questionId: number;
  questionText: string;
  standards: { code: string; desc: string }[];
}

type Step = "select" | "mapping" | "report";

// ── Helpers ──

function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += line[i]; }
    }
    result.push(current.trim());
    return result;
  }).filter(row => row.length > 1);
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function ScoreCell({ pct }: { pct: number }) {
  const bg = pct >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : pct >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${bg}`}>{Math.round(pct)}%</span>;
}

// Flat list of all NGSS standards for the picker
const ALL_STANDARDS_FLAT = Object.values(ALL_SUBSTANDARDS).flat();

// ── Standards Picker for a single question ──

function StandardsPicker({ standards, onChange }: { standards: { code: string; desc: string }[]; onChange: (s: { code: string; desc: string }[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return ALL_STANDARDS_FLAT.slice(0, 20);
    const q = search.toLowerCase();
    return ALL_STANDARDS_FLAT.filter(s => s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).slice(0, 20);
  }, [search]);

  const remove = (code: string) => onChange(standards.filter(s => s.code !== code));
  const add = (s: { code: string; description: string }) => {
    if (!standards.find(x => x.code === s.code)) {
      onChange([...standards, { code: s.code, desc: s.description }]);
    }
    setAdding(false);
    setSearch("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {standards.map(s => (
        <Badge key={s.code} variant="secondary" className="gap-1 pr-1">
          {s.code}
          <button onClick={() => remove(s.code)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
        </Badge>
      ))}
      {adding ? (
        <div className="relative">
          <input
            autoFocus
            className="h-7 w-40 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search standards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onBlur={() => setTimeout(() => { setAdding(false); setSearch(""); }, 200)}
          />
          {filtered.length > 0 && (
            <div className="absolute z-50 mt-1 w-72 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
              {filtered.map(s => (
                <button key={s.code} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent" onMouseDown={() => add(s)}>
                  <span className="font-medium">{s.code}</span> — {s.description.slice(0, 80)}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Pencil className="h-3 w-3" /> Add
        </button>
      )}
    </div>
  );
}

// ── Main Component ──

export default function CanvasResults() {
  const { config, setConfig } = useCanvasConfig();
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [aiTagging, setAiTagging] = useState(false);

  const [step, setStep] = useState<Step>("select");
  const [reportCSV, setReportCSV] = useState<string | null>(null);
  const [canvasQuestions, setCanvasQuestions] = useState<QuizQuestion[]>([]);
  const [mappings, setMappings] = useState<QuestionMapping[]>([]);
  const [enrollments, setEnrollments] = useState<Map<number, string>>(new Map());

  // Load courses on mount
  useEffect(() => {
    if (config) {
      setLoadingCourses(true);
      getCourses(config).then(setCourses).catch(() => toast.error("Failed to load courses")).finally(() => setLoadingCourses(false));
    }
  }, [config]);

  // Load quizzes when course changes
  useEffect(() => {
    if (config && selectedCourse) {
      setLoadingQuizzes(true);
      setSelectedQuiz("");
      getQuizzes(config, Number(selectedCourse)).then(setQuizzes).catch(() => toast.error("Failed to load quizzes")).finally(() => setLoadingQuizzes(false));
    }
  }, [config, selectedCourse]);

  // Step 1: Pull data from Canvas
  const handlePullResults = async () => {
    if (!config || !selectedCourse || !selectedQuiz) return;
    setLoading(true);
    setReportCSV(null);
    setMappings([]);

    try {
      const [reportData, questions, enrollmentData, bank] = await Promise.all([
        getQuizReport(config, Number(selectedCourse), Number(selectedQuiz)),
        getQuizQuestions(config, Number(selectedCourse), Number(selectedQuiz)),
        getEnrollments(config, Number(selectedCourse)),
        getQuestionBank(),
      ]);

      if (reportData.pending) {
        toast.info("Report is still generating. Please try again in a minute.");
        setLoading(false);
        return;
      }

      setReportCSV(reportData.csv);
      setCanvasQuestions(questions);

      const enrollMap = new Map<number, string>();
      for (const e of enrollmentData) {
        enrollMap.set(e.user_id, e.user?.name || e.user?.sortable_name || `Student ${e.user_id}`);
      }
      setEnrollments(enrollMap);

      // Build initial mappings from question bank tags
      const initialMappings: QuestionMapping[] = questions
        .filter(q => q.question_type !== "text_only_question")
        .map(q => {
          const bankMatch = bank.find(b => b.canvas_question_id === q.id);
          return {
            questionId: q.id,
            questionText: stripHtml(q.question_text),
            standards: bankMatch?.standards.map(s => ({ code: s.ngss_code, desc: s.ngss_description })) || [],
          };
        });

      setMappings(initialMappings);

      // Auto-tag with AI if any questions have no standards
      const untagged = initialMappings.filter(m => m.standards.length === 0);
      if (untagged.length > 0) {
        setAiTagging(true);
        try {
          const aiQuestions = untagged.map(m => ({
            id: m.questionId,
            question_text: m.questionText,
          }));

          const { data, error } = await supabase.functions.invoke('ngss-tagger', {
            body: { questions: aiQuestions },
          });

          if (error) throw error;

          const tags = data?.tags || [];
          const tagMap = new Map<number, { code: string; desc: string }[]>();
          for (const t of tags) {
            tagMap.set(t.question_id, (t.standards || []).map((s: any) => ({ code: s.code, desc: s.description })));
          }

          setMappings(prev => prev.map(m => {
            if (m.standards.length === 0 && tagMap.has(m.questionId)) {
              return { ...m, standards: tagMap.get(m.questionId)! };
            }
            return m;
          }));

          toast.success(`AI suggested standards for ${tags.length} questions. Review and adjust below.`);
        } catch (err: any) {
          console.error("AI tagging failed:", err);
          toast.warning("AI auto-tagging failed. You can manually assign standards below.");
        } finally {
          setAiTagging(false);
        }
      }

      setStep("mapping");
      toast.success("Results loaded! Review the standards mappings below.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to pull results");
    } finally {
      setLoading(false);
    }
  };

  // Update a single question's mapping
  const updateMapping = useCallback((questionId: number, standards: { code: string; desc: string }[]) => {
    setMappings(prev => prev.map(m => m.questionId === questionId ? { ...m, standards } : m));
  }, []);

  // Build the question-to-standards map from current mappings
  const questionToStandards = useMemo(() => {
    const map = new Map<number, { code: string; desc: string }[]>();
    for (const m of mappings) {
      if (m.standards.length > 0) map.set(m.questionId, m.standards);
    }
    return map;
  }, [mappings]);

  // Parse CSV and build report data
  const { studentScores, standardPerformances } = useMemo(() => {
    if (!reportCSV || canvasQuestions.length === 0 || step !== "report") {
      return { studentScores: [], standardPerformances: [] };
    }

    const rows = parseCSV(reportCSV);
    if (rows.length < 2) return { studentScores: [], standardPerformances: [] };

    const header = rows[0];
    const questionColumns: { colIndex: number; questionId: number }[] = [];
    for (let i = 0; i < header.length; i++) {
      const match = header[i].match(/^(\d+):\s*.+/);
      if (match) questionColumns.push({ colIndex: i, questionId: parseInt(match[1]) });
    }

    const nameIdx = header.findIndex(h => h.toLowerCase() === 'name');
    const idIdx = header.findIndex(h => h.toLowerCase() === 'id');

    const scores: StudentScore[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = nameIdx >= 0 ? row[nameIdx] : `Student ${r}`;
      const id = idIdx >= 0 ? parseInt(row[idIdx]) : r;
      if (!name || name === '') continue;

      const qScores = new Map<number, { score: number; possible: number }>();
      let totalScore = 0;
      let totalPossible = 0;

      for (const qc of questionColumns) {
        const val = parseFloat(row[qc.colIndex]) || 0;
        const cq = canvasQuestions.find(q => q.id === qc.questionId);
        const possible = cq?.points_possible || 1;
        qScores.set(qc.questionId, { score: val, possible });
        totalScore += val;
        totalPossible += possible;
      }
      scores.push({ studentId: id, studentName: name, questionScores: qScores, totalScore, totalPossible });
    }

    // Build standard performances using current mappings
    const standardMap = new Map<string, { code: string; desc: string; studentData: Map<string, { correct: number; total: number }> }>();
    for (const student of scores) {
      for (const [qId, qScore] of student.questionScores) {
        const stds = questionToStandards.get(qId) || [];
        for (const std of stds) {
          if (!standardMap.has(std.code)) {
            standardMap.set(std.code, { code: std.code, desc: std.desc, studentData: new Map() });
          }
          const entry = standardMap.get(std.code)!;
          const existing = entry.studentData.get(student.studentName) || { correct: 0, total: 0 };
          existing.correct += qScore.score;
          existing.total += qScore.possible;
          entry.studentData.set(student.studentName, existing);
        }
      }
    }

    const stdPerformances: StandardPerformance[] = [];
    for (const [, data] of standardMap) {
      const students: StandardPerformance['students'] = [];
      let totalPct = 0;
      for (const [name, s] of data.studentData) {
        const pct = s.total > 0 ? (s.correct / s.total) * 100 : 0;
        students.push({ name, correct: s.correct, total: s.total, pct });
        totalPct += pct;
      }
      stdPerformances.push({ standardCode: data.code, standardDescription: data.desc, students, avgPct: students.length > 0 ? totalPct / students.length : 0 });
    }
    stdPerformances.sort((a, b) => a.standardCode.localeCompare(b.standardCode));

    return { studentScores: scores, standardPerformances: stdPerformances };
  }, [reportCSV, canvasQuestions, questionToStandards, step]);

  const allStandards = useMemo(() => {
    const m = new Map<string, string>();
    for (const sp of standardPerformances) m.set(sp.standardCode, sp.standardDescription);
    return Array.from(m.entries()).map(([code, desc]) => ({ code, desc }));
  }, [standardPerformances]);

  const studentStandardMatrix = useMemo(() => {
    return studentScores.map(student => {
      const stdScores = new Map<string, { correct: number; total: number }>();
      for (const [qId, qScore] of student.questionScores) {
        for (const std of questionToStandards.get(qId) || []) {
          const existing = stdScores.get(std.code) || { correct: 0, total: 0 };
          existing.correct += qScore.score;
          existing.total += qScore.possible;
          stdScores.set(std.code, existing);
        }
      }
      return { ...student, stdScores };
    });
  }, [studentScores, questionToStandards]);

  const mappedCount = mappings.filter(m => m.standards.length > 0).length;

  if (!config) {
    return (
      <div className="min-h-screen bg-background">
        <PageBanner greeting="Canvas Results" subtitle="Pull student quiz results and analyze performance by standard." />
        <div className="max-w-xl mx-auto p-6">
          <SettingsForm config={null} onSave={setConfig} onDisconnect={() => setConfig(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageBanner greeting="Canvas Results" subtitle="Pull student quiz results and analyze performance by standard." />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Link>
          </Button>
          {step !== "select" && (
            <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> New Quiz
            </Button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={step === "select" ? "default" : "secondary"}>1. Select Quiz</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step === "mapping" ? "default" : "secondary"}>2. Map Standards</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step === "report" ? "default" : "secondary"}>3. View Report</Badge>
        </div>

        {/* Step 1: Course & Quiz Selection */}
        {step === "select" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Pull Quiz Results</CardTitle>
              <CardDescription>Select a course and quiz to pull student performance data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Course</label>
                  {loadingCourses ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                  ) : (
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger><SelectValue placeholder="Select a course..." /></SelectTrigger>
                      <SelectContent>{courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Quiz</label>
                  {loadingQuizzes ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                  ) : (
                    <Select value={selectedQuiz} onValueChange={setSelectedQuiz} disabled={!selectedCourse}>
                      <SelectTrigger><SelectValue placeholder="Select a quiz..." /></SelectTrigger>
                      <SelectContent>{quizzes.map(q => <SelectItem key={q.id} value={String(q.id)}>{q.title}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <Button onClick={handlePullResults} disabled={loading || !selectedCourse || !selectedQuiz} className="gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Pulling Results...</> : <><Download className="h-4 w-4" /> Pull Results</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review & Adjust AI Mappings */}
        {step === "mapping" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Review Standards Mappings
                {aiTagging && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardTitle>
              <CardDescription>
                {aiTagging
                  ? "AI is analyzing questions and suggesting standards..."
                  : `${mappedCount} of ${mappings.length} questions mapped to standards. Adjust as needed, then generate the report.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="divide-y">
                {mappings.map((m, i) => (
                  <div key={m.questionId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground font-mono mt-1 shrink-0">Q{i + 1}</span>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-sm text-foreground line-clamp-2">{m.questionText}</p>
                        <StandardsPicker
                          standards={m.standards}
                          onChange={(s) => updateMapping(m.questionId, s)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {mappedCount === 0
                    ? "No questions mapped yet. Add standards above or proceed without."
                    : `${mappedCount} question${mappedCount !== 1 ? 's' : ''} mapped to standards.`}
                </p>
                <Button onClick={() => setStep("report")} className="gap-2" disabled={aiTagging}>
                  <Check className="h-4 w-4" /> Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Report */}
        {step === "report" && (
          <>
            {studentScores.length > 0 ? (
              <Tabs defaultValue="matrix" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="matrix" className="gap-2"><Users className="h-4 w-4" /> Student × Standard</TabsTrigger>
                  <TabsTrigger value="standards" className="gap-2"><BookOpen className="h-4 w-4" /> By Standard</TabsTrigger>
                </TabsList>

                <TabsContent value="matrix">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Student × Standard Performance Matrix</CardTitle>
                          <CardDescription>{studentScores.length} students, {allStandards.length} standards mapped</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setStep("mapping")} className="gap-1">
                          <Pencil className="h-3.5 w-3.5" /> Edit Mappings
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {allStandards.length === 0 ? (
                        <div className="text-center py-6 space-y-3">
                          <p className="text-sm text-muted-foreground">No standards were mapped to questions.</p>
                          <Button variant="outline" onClick={() => setStep("mapping")} className="gap-2">
                            <Pencil className="h-4 w-4" /> Go back and map standards
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">Student</TableHead>
                                <TableHead className="text-center min-w-[80px]">Overall</TableHead>
                                {allStandards.map(s => (
                                  <TableHead key={s.code} className="text-center min-w-[80px]" title={s.desc}>{s.code}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentStandardMatrix.map(student => (
                                <TableRow key={student.studentId}>
                                  <TableCell className="sticky left-0 bg-background z-10 font-medium">{student.studentName}</TableCell>
                                  <TableCell className="text-center">
                                    <ScoreCell pct={student.totalPossible > 0 ? (student.totalScore / student.totalPossible) * 100 : 0} />
                                  </TableCell>
                                  {allStandards.map(s => {
                                    const data = student.stdScores.get(s.code);
                                    return (
                                      <TableCell key={s.code} className="text-center">
                                        {data ? <ScoreCell pct={(data.correct / data.total) * 100} /> : <span className="text-muted-foreground text-xs">—</span>}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2 font-medium">
                                <TableCell className="sticky left-0 bg-background z-10">Class Average</TableCell>
                                <TableCell className="text-center">
                                  {(() => {
                                    let total = 0;
                                    for (const s of studentScores) total += s.totalPossible > 0 ? (s.totalScore / s.totalPossible) * 100 : 0;
                                    return <ScoreCell pct={total / studentScores.length} />;
                                  })()}
                                </TableCell>
                                {allStandards.map(s => {
                                  const sp = standardPerformances.find(p => p.standardCode === s.code);
                                  return (
                                    <TableCell key={s.code} className="text-center">
                                      {sp ? <ScoreCell pct={sp.avgPct} /> : <span className="text-muted-foreground text-xs">—</span>}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="standards">
                  <div className="space-y-4">
                    {standardPerformances.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center space-y-3">
                          <p className="text-sm text-muted-foreground">No standards mapped.</p>
                          <Button variant="outline" onClick={() => setStep("mapping")} className="gap-2">
                            <Pencil className="h-4 w-4" /> Map standards to questions
                          </Button>
                        </CardContent>
                      </Card>
                    ) : standardPerformances.map(sp => (
                      <Card key={sp.standardCode}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge variant="outline">{sp.standardCode}</Badge>
                            <ScoreCell pct={sp.avgPct} />
                          </CardTitle>
                          <CardDescription className="mt-1">{sp.standardDescription}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead className="text-center">Score</TableHead>
                                <TableHead className="text-center">Percent</TableHead>
                                <TableHead className="text-center">Mastery</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sp.students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                <TableRow key={s.name}>
                                  <TableCell className="font-medium">{s.name}</TableCell>
                                  <TableCell className="text-center">{s.correct}/{s.total}</TableCell>
                                  <TableCell className="text-center"><ScoreCell pct={s.pct} /></TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={s.pct >= 80 ? 'default' : s.pct >= 60 ? 'secondary' : 'destructive'}>
                                      {s.pct >= 80 ? 'Mastered' : s.pct >= 60 ? 'Developing' : 'Needs Support'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">No student submission data found. Make sure students have completed the quiz.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="pt-2">
          <SettingsForm config={config} onSave={setConfig} onDisconnect={() => setConfig(null)} />
        </div>
      </div>
    </div>
  );
}
