import { useState, useEffect, useMemo } from "react";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { SettingsForm } from "@/components/SettingsForm";
import { getCourses, getQuizzes, getQuizQuestions, getEnrollments, getQuizSubmissions, getQuizReport, type CanvasConfig, type Course, type Quiz, type QuizQuestion } from "@/lib/canvas-api";
import { getQuestionBank, type QuestionBankItem } from "@/lib/question-bank";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, BarChart3, Users, BookOpen, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PageBanner } from "@/components/PageBanner";

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

function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  }).filter(row => row.length > 1);
}

function ScoreCell({ pct }: { pct: number }) {
  const bg = pct >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : pct >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${bg}`}>{Math.round(pct)}%</span>;
}

export default function CanvasResults() {
  const { config, setConfig } = useCanvasConfig();
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Results data
  const [reportCSV, setReportCSV] = useState<string | null>(null);
  const [canvasQuestions, setCanvasQuestions] = useState<QuizQuestion[]>([]);
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([]);
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

  const handlePullResults = async () => {
    if (!config || !selectedCourse || !selectedQuiz) return;
    setLoading(true);
    setReportCSV(null);

    try {
      // Fetch in parallel: quiz report, quiz questions, enrollments, question bank
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
      setBankQuestions(bank);

      const enrollMap = new Map<number, string>();
      for (const e of enrollmentData) {
        enrollMap.set(e.user_id, e.user?.name || e.user?.sortable_name || `Student ${e.user_id}`);
      }
      setEnrollments(enrollMap);

      toast.success("Results loaded successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to pull results");
    } finally {
      setLoading(false);
    }
  };

  // Parse the CSV report and build data structures
  const { studentScores, standardPerformances, questionToStandards } = useMemo(() => {
    if (!reportCSV || canvasQuestions.length === 0) {
      return { studentScores: [], standardPerformances: [], questionToStandards: new Map() };
    }

    const rows = parseCSV(reportCSV);
    if (rows.length < 2) return { studentScores: [], standardPerformances: [], questionToStandards: new Map() };

    const header = rows[0];

    // Build mapping: canvas_question_id -> standards from our question bank
    const qToStandards = new Map<number, { code: string; desc: string }[]>();
    for (const bq of bankQuestions) {
      if (bq.canvas_question_id && bq.standards.length > 0) {
        qToStandards.set(bq.canvas_question_id, bq.standards.map(s => ({ code: s.ngss_code, desc: s.ngss_description })));
      }
    }

    // Find question columns in the CSV header
    // Canvas student_analysis CSV format: name, id, sis_id, ..., then question columns like "12345: Question Name"
    const questionColumns: { colIndex: number; questionId: number; questionName: string }[] = [];
    for (let i = 0; i < header.length; i++) {
      const match = header[i].match(/^(\d+):\s*(.+)/);
      if (match) {
        questionColumns.push({ colIndex: i, questionId: parseInt(match[1]), questionName: match[2] });
      }
    }

    // Find the "name" and "id" columns
    const nameIdx = header.findIndex(h => h.toLowerCase() === 'name');
    const idIdx = header.findIndex(h => h.toLowerCase() === 'id');

    // Parse student rows (skip header)
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

    // Build standard performances
    const standardMap = new Map<string, { code: string; desc: string; studentData: Map<string, { correct: number; total: number }> }>();

    for (const student of scores) {
      for (const [qId, qScore] of student.questionScores) {
        const stds = qToStandards.get(qId) || [];
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
      for (const [name, scores] of data.studentData) {
        const pct = scores.total > 0 ? (scores.correct / scores.total) * 100 : 0;
        students.push({ name, correct: scores.correct, total: scores.total, pct });
        totalPct += pct;
      }
      const avgPct = students.length > 0 ? totalPct / students.length : 0;
      stdPerformances.push({ standardCode: data.code, standardDescription: data.desc, students, avgPct });
    }

    stdPerformances.sort((a, b) => a.standardCode.localeCompare(b.standardCode));

    return { studentScores: scores, standardPerformances: stdPerformances, questionToStandards: qToStandards };
  }, [reportCSV, canvasQuestions, bankQuestions]);

  // Get all unique standards for the matrix header
  const allStandards = useMemo(() => {
    const stdSet = new Map<string, string>();
    for (const sp of standardPerformances) {
      stdSet.set(sp.standardCode, sp.standardDescription);
    }
    return Array.from(stdSet.entries()).map(([code, desc]) => ({ code, desc }));
  }, [standardPerformances]);

  // Build student × standard matrix
  const studentStandardMatrix = useMemo(() => {
    return studentScores.map(student => {
      const stdScores = new Map<string, { correct: number; total: number }>();
      for (const [qId, qScore] of student.questionScores) {
        const stds = questionToStandards.get(qId) || [];
        for (const std of stds) {
          const existing = stdScores.get(std.code) || { correct: 0, total: 0 };
          existing.correct += qScore.score;
          existing.total += qScore.possible;
          stdScores.set(std.code, existing);
        }
      }
      return { ...student, stdScores };
    });
  }, [studentScores, questionToStandards]);

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
        </div>

        {/* Course & Quiz Selection */}
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
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
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
                    <SelectContent>
                      {quizzes.map(q => <SelectItem key={q.id} value={String(q.id)}>{q.title}</SelectItem>)}
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

        {/* Results */}
        {studentScores.length > 0 && (
          <Tabs defaultValue="matrix" className="space-y-4">
            <TabsList>
              <TabsTrigger value="matrix" className="gap-2"><Users className="h-4 w-4" /> Student × Standard</TabsTrigger>
              <TabsTrigger value="standards" className="gap-2"><BookOpen className="h-4 w-4" /> By Standard</TabsTrigger>
            </TabsList>

            <TabsContent value="matrix">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Student × Standard Performance Matrix</CardTitle>
                  <CardDescription>{studentScores.length} students, {allStandards.length} standards mapped</CardDescription>
                </CardHeader>
                <CardContent>
                  {allStandards.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No standards were matched. Make sure questions in your Question Bank are tagged with standards and have matching Canvas question IDs.</p>
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
                          {/* Class average row */}
                          <TableRow className="border-t-2 font-medium">
                            <TableCell className="sticky left-0 bg-background z-10">Class Average</TableCell>
                            <TableCell className="text-center">
                              <ScoreCell pct={studentScores.reduce((sum: number, s) => sum + (s.totalPossible > 0 ? (s.totalScore / s.totalPossible) * 100 : 0), 0 as number) / studentScores.length} />
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
                    <CardContent className="py-8">
                      <p className="text-sm text-muted-foreground text-center">No standards were matched to quiz questions. Tag questions in your Question Bank with standards first.</p>
                    </CardContent>
                  </Card>
                ) : standardPerformances.map(sp => (
                  <Card key={sp.standardCode}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge variant="outline">{sp.standardCode}</Badge>
                            <ScoreCell pct={sp.avgPct} />
                          </CardTitle>
                          <CardDescription className="mt-1">{sp.standardDescription}</CardDescription>
                        </div>
                      </div>
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
        )}

        {reportCSV && studentScores.length === 0 && !loading && (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">No student submission data found in the report. Make sure students have completed the quiz.</p>
            </CardContent>
          </Card>
        )}

        <div className="pt-2">
          <SettingsForm config={config} onSave={setConfig} onDisconnect={() => setConfig(null)} />
        </div>
      </div>
    </div>
  );
}
