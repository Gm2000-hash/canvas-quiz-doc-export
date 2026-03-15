import { useState, useEffect, useMemo, useCallback } from "react";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { SettingsForm } from "@/components/SettingsForm";
import { getCourses, getQuizzes, getQuizQuestions, getEnrollments, getQuizReport, type CanvasConfig, type Course, type Quiz, type QuizQuestion } from "@/lib/canvas-api";
import { getQuestionBank, type QuestionBankItem } from "@/lib/question-bank";
import { supabase } from "@/integrations/supabase/client";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { ALL_IDAHO_STANDARDS_FLAT } from "@/lib/idaho-standards-data";
import { useProfileDefaults } from "@/hooks/useProfileDefaults";
import { tagQuestionsWithStandards } from "@/lib/standards-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, BarChart3, Users, BookOpen, ArrowLeft, Sparkles, Pencil, Check, X, FileSpreadsheet, FileArchive } from "lucide-react";
import { exportMasteryConnectCSV, exportMasteryConnectDetailCSV } from "@/lib/export-mastery-connect";
import { exportToQTI, type QTIStudentResult } from "@/lib/export-qti";
import { Checkbox } from "@/components/ui/checkbox";

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

interface TaggingSummary {
  totalQuestions: number;
  preMatchedCount: number;
  aiTaggedCount: number;
  stillUntagged: number;
  standardCounts: { code: string; desc: string; count: number }[];
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
  const clamped = Math.min(Math.round(pct), 100);
  const bg = clamped >= 75 ? 'bg-success/15 text-success'
    : clamped >= 50 ? 'bg-warning/15 text-warning-foreground'
    : 'bg-destructive/15 text-destructive';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${bg}`}>{clamped}%</span>;
}

// Flat list of all standards for the picker (combined NGSS + Idaho)
const ALL_NGSS_FLAT = Object.values(ALL_SUBSTANDARDS).flat();
const ALL_IDAHO_FLAT_MAPPED = ALL_IDAHO_STANDARDS_FLAT.map(s => ({ code: s.code, description: s.description, keyTerms: [] as string[] }));

// ── Standards Picker for a single question ──

function StandardsPicker({ standards, onChange, framework }: { standards: { code: string; desc: string }[]; onChange: (s: { code: string; desc: string }[]) => void; framework: "ngss" | "idaho" }) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const allStandardsList = framework === "ngss" ? ALL_NGSS_FLAT : ALL_IDAHO_FLAT_MAPPED;

  const filtered = useMemo(() => {
    if (!search) return allStandardsList.slice(0, 20);
    const q = search.toLowerCase();
    return allStandardsList.filter(s => s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).slice(0, 20);
  }, [search, allStandardsList]);

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
  const { defaultFramework, subjects, grades } = useProfileDefaults();
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [aiTagging, setAiTagging] = useState(false);
  const [includeScoresInQTI, setIncludeScoresInQTI] = useState(true);
  const [framework, setFramework] = useState<"ngss" | "idaho">(defaultFramework);
  const [tagSubject, setTagSubject] = useState(subjects.find(s => s !== "Science") || "ELA");

  const [step, setStep] = useState<Step>("select");
  const [reportCSV, setReportCSV] = useState<string | null>(null);
  const [canvasQuestions, setCanvasQuestions] = useState<QuizQuestion[]>([]);
  const [mappings, setMappings] = useState<QuestionMapping[]>([]);
  const [taggingSummary, setTaggingSummary] = useState<TaggingSummary | null>(null);
  const [enrollments, setEnrollments] = useState<Map<number, string>>(new Map());

  const buildTaggingSummary = useCallback((allMappings: QuestionMapping[], preMatchedCount: number, aiTaggedCount: number) => {
    const stdCountMap = new Map<string, { desc: string; count: number }>();
    for (const m of allMappings) {
      for (const s of m.standards) {
        const existing = stdCountMap.get(s.code);
        if (existing) existing.count++;
        else stdCountMap.set(s.code, { desc: s.desc, count: 1 });
      }
    }
    setTaggingSummary({
      totalQuestions: allMappings.length,
      preMatchedCount,
      aiTaggedCount,
      stillUntagged: allMappings.filter(m => m.standards.length === 0).length,
      standardCounts: Array.from(stdCountMap.entries())
        .map(([code, v]) => ({ code, desc: v.desc, count: v.count }))
        .sort((a, b) => b.count - a.count),
    });
  }, []);

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

      // Build a text-based lookup for fallback matching (strip HTML & normalize)
      const bankByText = new Map<string, QuestionBankItem>();
      for (const b of bank) {
        if (b.standards.length > 0) {
          const normalizedText = stripHtml(b.question_text).trim().toLowerCase().replace(/\s+/g, ' ');
          if (!bankByText.has(normalizedText)) {
            bankByText.set(normalizedText, b);
          }
        }
      }

      // Build initial mappings from question bank tags
      const initialMappings: QuestionMapping[] = questions
        .filter(q => q.question_type !== "text_only_question")
        .map(q => {
          // First try matching by canvas_question_id
          let bankMatch = bank.find(b => b.canvas_question_id === q.id);
          // Fallback: match by normalized question text
          if (!bankMatch || bankMatch.standards.length === 0) {
            const normalizedText = stripHtml(q.question_text).trim().toLowerCase().replace(/\s+/g, ' ');
            const textMatch = bankByText.get(normalizedText);
            if (textMatch) bankMatch = textMatch;
          }
          return {
            questionId: q.id,
            questionText: stripHtml(q.question_text),
            standards: bankMatch?.standards.map(s => ({ code: s.ngss_code, desc: s.ngss_description })) || [],
          };
        });

      const preMatchedCount = initialMappings.filter(m => m.standards.length > 0).length;
      setMappings(initialMappings);
      setTaggingSummary(null);

      // Auto-tag with AI if any questions have no standards
      const untagged = initialMappings.filter(m => m.standards.length === 0);
      let aiTaggedCount = 0;

      if (untagged.length > 0) {
        setAiTagging(true);
        try {
          const aiQuestions = untagged.map(m => ({
            id: m.questionId,
            question_text: m.questionText,
          }));

          // Use the unified standards tagger
          const tagMap = await tagQuestionsWithStandards(
            aiQuestions,
            framework,
            framework === "idaho" ? tagSubject : undefined,
            framework === "idaho" ? (grades[0] || undefined) : undefined,
          );

          for (const [, stds] of tagMap) {
            if (stds.length > 0) aiTaggedCount++;
          }

          setMappings(prev => {
            const updated = prev.map(m => {
              if (m.standards.length === 0 && tagMap.has(m.questionId)) {
                const matched = tagMap.get(m.questionId)!;
                return { ...m, standards: matched.map(s => ({ code: s.code, desc: s.description })) };
              }
              return m;
            });
            buildTaggingSummary(updated, preMatchedCount, aiTaggedCount);
            return updated;
          });

          toast.success(`AI tagged ${aiTaggedCount} of ${untagged.length} unmatched questions.`);
        } catch (err: any) {
          console.error("AI tagging failed:", err);
          toast.warning("AI auto-tagging failed. You can manually assign standards below.");
          buildTaggingSummary(initialMappings, preMatchedCount, 0);
        } finally {
          setAiTagging(false);
        }
      } else {
        buildTaggingSummary(initialMappings, preMatchedCount, 0);
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
    console.log("CSV headers:", rows[0]);
    console.log("CSV row count:", rows.length);
    console.log("Sample data row:", rows[1]);
    if (rows.length < 2) return { studentScores: [], standardPerformances: [] };

    const header = rows[0];
    const questionColumns: { colIndex: number; questionId: number }[] = [];
    for (let i = 0; i < header.length; i++) {
      // Canvas CSV headers for questions look like "12345: Question text" or just contain a colon
      const match = header[i].match(/^(\d+):/);
      if (match) questionColumns.push({ colIndex: i, questionId: parseInt(match[1]) });
    }

    // Try multiple possible name column headers
    const nameIdx = header.findIndex(h => /^name$/i.test(h.trim()));
    const idIdx = header.findIndex(h => /^id$/i.test(h.trim()));
    const sisIdx = header.findIndex(h => /^sis_id$/i.test(h.trim()) || /^sis_user_id$/i.test(h.trim()));

    // Skip summary/metadata rows at the bottom and students with no data
    const scores: StudentScore[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = nameIdx >= 0 ? row[nameIdx]?.trim() : '';
      if (!name || name === '' || name.toLowerCase() === 'points possible' || name.toLowerCase() === 'average score') continue;
      const id = idIdx >= 0 ? parseInt(row[idIdx]) || r : r;

      const qScores = new Map<number, { score: number; possible: number }>();
      let totalScore = 0;
      let totalPossible = 0;
      let hasAnyData = false;

      for (const qc of questionColumns) {
        const rawVal = row[qc.colIndex]?.trim();
        // Skip students who have no answers at all (empty cells)
        if (rawVal !== undefined && rawVal !== '') hasAnyData = true;
        const val = parseFloat(rawVal) || 0;
        const cq = canvasQuestions.find(q => q.id === qc.questionId);
        const possible = cq?.points_possible || 1;
        qScores.set(qc.questionId, { score: val, possible });
        totalScore += val;
        totalPossible += possible;
      }

      // Filter out students with zero data (no submissions)
      if (!hasAnyData || (totalScore === 0 && totalPossible > 0)) continue;

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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Standards Framework</label>
                <div className="flex gap-2">
                  <Select value={framework} onValueChange={(v) => setFramework(v as "ngss" | "idaho")}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ngss">NGSS (Science)</SelectItem>
                      <SelectItem value="idaho">Idaho Standards</SelectItem>
                    </SelectContent>
                  </Select>
                  {framework === "idaho" && (
                    <Select value={tagSubject} onValueChange={setTagSubject}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ELA">ELA</SelectItem>
                        <SelectItem value="Math">Math</SelectItem>
                        <SelectItem value="Social Studies">Social Studies</SelectItem>
                      </SelectContent>
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
              {/* Tagging Summary */}
              {taggingSummary && !aiTagging && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Tagging Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{taggingSummary.totalQuestions}</div>
                      <div className="text-[11px] text-muted-foreground">Total Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{taggingSummary.preMatchedCount}</div>
                      <div className="text-[11px] text-muted-foreground">Pre-matched (Bank)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{taggingSummary.aiTaggedCount}</div>
                      <div className="text-[11px] text-muted-foreground">AI Tagged</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${taggingSummary.stillUntagged > 0 ? 'text-destructive' : 'text-success'}`}>{taggingSummary.stillUntagged}</div>
                      <div className="text-[11px] text-muted-foreground">Still Untagged</div>
                    </div>
                  </div>
                  {taggingSummary.standardCounts.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Standards Distribution</p>
                      <div className="space-y-1.5">
                        {taggingSummary.standardCounts.slice(0, 8).map(sc => {
                          const maxCount = taggingSummary.standardCounts[0]?.count || 1;
                          const pct = Math.round((sc.count / maxCount) * 100);
                          return (
                            <div key={sc.code} className="flex items-center gap-2">
                              <span className="text-xs font-mono w-24 shrink-0 truncate" title={sc.code}>{sc.code}</span>
                              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary/70 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{sc.count}</span>
                            </div>
                          );
                        })}
                        {taggingSummary.standardCounts.length > 8 && (
                          <p className="text-[10px] text-muted-foreground">+{taggingSummary.standardCounts.length - 8} more standards</p>
                        )}
                      </div>
                      {taggingSummary.standardCounts.length > 1 && (
                        <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
                          <span>Most tagged: <strong className="text-foreground">{taggingSummary.standardCounts[0].code}</strong> ({taggingSummary.standardCounts[0].count})</span>
                          <span>Least tagged: <strong className="text-foreground">{taggingSummary.standardCounts[taggingSummary.standardCounts.length - 1].code}</strong> ({taggingSummary.standardCounts[taggingSummary.standardCounts.length - 1].count})</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                          framework={framework}
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
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle className="text-base">Student × Standard Performance Matrix</CardTitle>
                          <CardDescription>{studentScores.length} students, {allStandards.length} standards mapped</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={allStandards.length === 0}
                            onClick={() => {
                              const quizName = quizzes.find(q => String(q.id) === selectedQuiz)?.title || 'Quiz';
                              const exportStudents = studentStandardMatrix.map(s => ({
                                name: s.studentName,
                                standardScores: s.stdScores,
                              }));
                              const exportStandards = allStandards.map(s => ({ code: s.code, description: s.desc }));
                              exportMasteryConnectCSV(quizName, exportStudents, exportStandards);
                              toast.success("Mastery Connect CSV exported!");
                            }}
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" /> Export for Mastery Connect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={allStandards.length === 0}
                            onClick={() => {
                              const quizName = quizzes.find(q => String(q.id) === selectedQuiz)?.title || 'Quiz';
                              const exportStudents = studentStandardMatrix.map(s => ({
                                name: s.studentName,
                                standardScores: s.stdScores,
                              }));
                              const exportStandards = allStandards.map(s => ({ code: s.code, description: s.desc }));
                              exportMasteryConnectDetailCSV(quizName, exportStudents, exportStandards);
                              toast.success("Detailed CSV exported!");
                            }}
                          >
                          <Download className="h-3.5 w-3.5" /> Detailed CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={mappings.length === 0}
                            onClick={() => {
                              const quizName = quizzes.find(q => String(q.id) === selectedQuiz)?.title || 'Quiz';
                              const qtiQuestions: QuestionBankItem[] = canvasQuestions
                                .filter(cq => cq.question_type !== 'text_only_question')
                                .map(cq => {
                                  const mapping = mappings.find(m => m.questionId === cq.id);
                                  return {
                                    id: String(cq.id),
                                    canvas_question_id: cq.id,
                                    question_text: cq.question_text,
                                    question_type: cq.question_type,
                                    points_possible: cq.points_possible || 1,
                                    answers: cq.answers || [],
                                    source_course: null,
                                    source_quiz: null,
                                    created_at: new Date().toISOString(),
                                    dok_level: null,
                                    blooms_level: null,
                                    standards: (mapping?.standards || []).map(s => ({
                                      ngss_code: s.code,
                                      ngss_description: s.desc,
                                    })),
                                  };
                                });

                              // Build student results if checkbox is checked
                              let studentResultsData: QTIStudentResult[] | undefined;
                              if (includeScoresInQTI && studentStandardMatrix.length > 0) {
                                studentResultsData = studentStandardMatrix.map(student => ({
                                  name: student.studentName,
                                  scores: new Map(
                                    Array.from(student.questionScores.entries()).map(([qId, data]) => [
                                      String(qId),
                                      { score: data.score, possible: data.possible },
                                    ])
                                  ),
                                }));
                              }

                              exportToQTI(quizName, qtiQuestions, studentResultsData);
                              toast.success(includeScoresInQTI
                                ? "QTI package exported with standards + student scores!"
                                : "QTI package exported with standards tags!");
                            }}
                          >
                            <FileArchive className="h-3.5 w-3.5" /> Export QTI
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setStep("mapping")} className="gap-1">
                            <Pencil className="h-3.5 w-3.5" /> Edit Mappings
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Checkbox
                            id="include-scores"
                            checked={includeScoresInQTI}
                            onCheckedChange={(checked) => setIncludeScoresInQTI(checked === true)}
                          />
                          <label htmlFor="include-scores" className="text-xs text-muted-foreground cursor-pointer">
                            Include student scores in QTI package
                          </label>
                        </div>
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
                              {studentStandardMatrix.map((student, idx) => (
                                <TableRow key={student.studentId || idx}>
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
                                     <Badge variant={s.pct >= 75 ? 'default' : s.pct >= 50 ? 'secondary' : 'destructive'}>
                                       {s.pct >= 75 ? 'Mastered' : s.pct >= 50 ? 'Developing' : 'Needs Support'}
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
