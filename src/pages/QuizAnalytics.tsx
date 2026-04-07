import { useState, useEffect, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { supabase } from "@/integrations/supabase/client";
import { getCourses, getQuizzes, getQuizSubmissions, getEnrollments, type CanvasConfig, type Course, type Quiz, type QuizSubmission, type Enrollment } from "@/lib/canvas-api";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2, BarChart3, TrendingUp, TrendingDown, Users, Target,
  Trophy, AlertTriangle, ArrowLeft, RefreshCw, BookOpen, FileText, Globe,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, Area, AreaChart,
} from "recharts";

// ── Types ──

interface ISATExam {
  id: string;
  title: string;
  grade_level: string;
  score: number | null;
  total_points: number | null;
  completed_at: string | null;
  created_at: string;
  question_count: number;
  hints_used: number;
  hints_enabled: boolean;
  questions: any;
  answers: any;
}

interface CanvasQuizData {
  course: Course;
  quiz: Quiz;
  submissions: QuizSubmission[];
  enrollments: Enrollment[];
}

interface EmbeddedResult {
  id: string;
  studentName: string;
  canvasUserId: string;
  activityId: string;
  activityTitle: string;
  activityType: string;
  score: number;
  maxScore: number;
  percentage: number;
  completedAt: string;
}

interface EmbeddedSummary {
  total: number;
  uniqueStudents: number;
  avgScore: number;
  activityCount: number;
}

// ── Helpers ──

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function gradeColor(pctScore: number): string {
  if (pctScore >= 90) return "text-green-600 dark:text-green-400";
  if (pctScore >= 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function gradeBg(pctScore: number): string {
  if (pctScore >= 90) return "bg-green-500";
  if (pctScore >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

export default function QuizAnalytics() {
  usePageTitle("Quiz Analytics");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config: canvasConfig, isConfigured: canvasConnected } = useCanvasConfig();

  // ISAT data
  const [isatExams, setIsatExams] = useState<ISATExam[]>([]);
  const [loadingIsat, setLoadingIsat] = useState(true);

  // Canvas data
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [canvasQuizData, setCanvasQuizData] = useState<CanvasQuizData[]>([]);
  const [loadingCanvas, setLoadingCanvas] = useState(false);
  const [fetchedCanvasCourses, setFetchedCanvasCourses] = useState(false);

  // Embedded results data
  const [embeddedResults, setEmbeddedResults] = useState<EmbeddedResult[]>([]);
  const [embeddedSummary, setEmbeddedSummary] = useState<EmbeddedSummary | null>(null);
  const [loadingEmbedded, setLoadingEmbedded] = useState(false);
  const [embeddedLoaded, setEmbeddedLoaded] = useState(false);

  // Load ISAT exams
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingIsat(true);
      const { data } = await supabase
        .from("isat_exams")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setIsatExams((data || []) as any);
      setLoadingIsat(false);
    })();
  }, [user]);

  // Load Canvas courses
  useEffect(() => {
    if (!canvasConnected || !canvasConfig || fetchedCanvasCourses) return;
    (async () => {
      try {
        const c = await getCourses(canvasConfig);
        setCourses(c);
        setFetchedCanvasCourses(true);
      } catch { /* silent */ }
    })();
  }, [canvasConnected, canvasConfig, fetchedCanvasCourses]);

  const loadCanvasData = async () => {
    if (!canvasConfig) return;
    setLoadingCanvas(true);
    try {
      const targetCourses = selectedCourseId === "all"
        ? courses
        : courses.filter(c => c.id === Number(selectedCourseId));

      const results: CanvasQuizData[] = [];
      for (const course of targetCourses.slice(0, 5)) {
        try {
          const [quizzes, enrollments] = await Promise.all([
            getQuizzes(canvasConfig, course.id),
            getEnrollments(canvasConfig, course.id),
          ]);
          for (const quiz of quizzes.slice(0, 10)) {
            try {
              const submissions = await getQuizSubmissions(canvasConfig, course.id, quiz.id);
              const completed = submissions.filter(s => s.score !== null && s.workflow_state === "complete");
              if (completed.length > 0) {
                results.push({ course, quiz, submissions: completed, enrollments });
              }
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
      setCanvasQuizData(results);
      toast.success(`Loaded ${results.length} quizzes with submissions`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load Canvas data");
    } finally {
      setLoadingCanvas(false);
    }
  };

  // ── ISAT Analytics ──

  const completedIsats = useMemo(() => isatExams.filter(e => e.completed_at && e.score != null), [isatExams]);

  const isatOverview = useMemo(() => {
    if (completedIsats.length === 0) return null;
    const avgScore = completedIsats.reduce((s, e) => s + pct(e.score!, e.total_points!), 0) / completedIsats.length;
    const totalHints = completedIsats.reduce((s, e) => s + e.hints_used, 0);
    const byGrade: Record<string, { count: number; avg: number }> = {};
    completedIsats.forEach(e => {
      if (!byGrade[e.grade_level]) byGrade[e.grade_level] = { count: 0, avg: 0 };
      byGrade[e.grade_level].count++;
      byGrade[e.grade_level].avg += pct(e.score!, e.total_points!);
    });
    Object.values(byGrade).forEach(v => { v.avg = Math.round(v.avg / v.count); });
    return { avgScore: Math.round(avgScore), totalExams: completedIsats.length, totalHints, byGrade };
  }, [completedIsats]);

  const isatTrendData = useMemo(() => {
    return completedIsats
      .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())
      .map((e, i) => ({
        label: `Exam ${i + 1}`,
        score: pct(e.score!, e.total_points!),
        title: e.title,
        date: new Date(e.completed_at!).toLocaleDateString(),
        grade: e.grade_level,
      }));
  }, [completedIsats]);

  const isatStandardPerformance = useMemo(() => {
    const byStandard: Record<string, { correct: number; total: number }> = {};
    completedIsats.forEach(exam => {
      const questions = exam.questions as any[];
      const answers = (exam.answers || {}) as Record<string, any>;
      questions?.forEach((q, qi) => {
        const code = q.standard_code || "Untagged";
        if (!byStandard[code]) byStandard[code] = { correct: 0, total: 0 };
        byStandard[code].total += q.points_possible || 1;
        const ans = answers[qi] ?? answers[String(qi)] ?? answers[q.question_number];
        if (ans !== undefined && ans !== null) {
          if (q.question_type === "multiple_choice_question" || q.question_type === "scenario_question" || q.question_type === "data_analysis_question" || q.question_type === "investigation_design_question") {
            const correct = (q.answers || []).find((a: any) => a.weight === 100);
            if (correct && ans === correct.text) byStandard[code].correct += q.points_possible || 1;
          } else if (q.question_type === "multiple_answers_question") {
            const correctTexts = (q.answers || []).filter((a: any) => a.weight === 100).map((a: any) => a.text);
            const selected = Array.isArray(ans) ? ans : [];
            if (correctTexts.every((t: string) => selected.includes(t)) && selected.length === correctTexts.length) {
              byStandard[code].correct += q.points_possible || 1;
            }
          }
        }
      });
    });
    return Object.entries(byStandard)
      .map(([code, v]) => ({ code, pct: pct(v.correct, v.total), correct: v.correct, total: v.total }))
      .sort((a, b) => a.pct - b.pct);
  }, [completedIsats]);

  // ── Canvas Analytics ──

  const canvasOverview = useMemo(() => {
    if (canvasQuizData.length === 0) return null;
    let totalStudents = 0;
    let totalScore = 0;
    let totalCount = 0;
    canvasQuizData.forEach(d => {
      d.submissions.forEach(s => {
        if (s.kept_score != null) {
          totalScore += pct(s.kept_score, d.quiz.points_possible);
          totalCount++;
        }
      });
      totalStudents = Math.max(totalStudents, d.enrollments.length);
    });
    return {
      quizCount: canvasQuizData.length,
      totalStudents,
      avgScore: totalCount > 0 ? Math.round(totalScore / totalCount) : 0,
    };
  }, [canvasQuizData]);

  const canvasQuizSummary = useMemo(() => {
    return canvasQuizData.map(d => {
      const scores = d.submissions
        .map(s => s.kept_score ?? s.score)
        .filter((s): s is number => s != null)
        .map(s => pct(s, d.quiz.points_possible));
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const high = scores.length > 0 ? Math.max(...scores) : 0;
      const low = scores.length > 0 ? Math.min(...scores) : 0;
      return {
        course: d.course.name,
        quiz: d.quiz.title,
        submissions: d.submissions.length,
        avg,
        high,
        low,
        points: d.quiz.points_possible,
      };
    });
  }, [canvasQuizData]);

  const canvasDistribution = useMemo(() => {
    const buckets = [
      { range: "0-59%", count: 0, label: "F" },
      { range: "60-69%", count: 0, label: "D" },
      { range: "70-79%", count: 0, label: "C" },
      { range: "80-89%", count: 0, label: "B" },
      { range: "90-100%", count: 0, label: "A" },
    ];
    canvasQuizData.forEach(d => {
      d.submissions.forEach(s => {
        const score = pct(s.kept_score ?? s.score ?? 0, d.quiz.points_possible);
        if (score >= 90) buckets[4].count++;
        else if (score >= 80) buckets[3].count++;
        else if (score >= 70) buckets[2].count++;
        else if (score >= 60) buckets[1].count++;
        else buckets[0].count++;
      });
    });
    return buckets;
  }, [canvasQuizData]);

  // ── Embedded Results ──

  const loadEmbeddedResults = async () => {
    setLoadingEmbedded(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-embedded-results");
      if (error) throw error;
      setEmbeddedResults(data.results || []);
      setEmbeddedSummary(data.summary || null);
      setEmbeddedLoaded(true);
      if ((data.results || []).length === 0) {
        toast.info("No embedded completions found yet");
      } else {
        toast.success(`Loaded ${data.results.length} student completions`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load embedded results");
    } finally {
      setLoadingEmbedded(false);
    }
  };

  const embeddedDistribution = useMemo(() => {
    const buckets = [
      { range: "0-59%", count: 0, label: "F" },
      { range: "60-69%", count: 0, label: "D" },
      { range: "70-79%", count: 0, label: "C" },
      { range: "80-89%", count: 0, label: "B" },
      { range: "90-100%", count: 0, label: "A" },
    ];
    embeddedResults.forEach(r => {
      if (r.percentage >= 90) buckets[4].count++;
      else if (r.percentage >= 80) buckets[3].count++;
      else if (r.percentage >= 70) buckets[2].count++;
      else if (r.percentage >= 60) buckets[1].count++;
      else buckets[0].count++;
    });
    return buckets;
  }, [embeddedResults]);

  const embeddedByActivity = useMemo(() => {
    const map: Record<string, { title: string; type: string; scores: number[] }> = {};
    embeddedResults.forEach(r => {
      if (!map[r.activityId]) map[r.activityId] = { title: r.activityTitle, type: r.activityType, scores: [] };
      map[r.activityId].scores.push(r.percentage);
    });
    return Object.entries(map).map(([id, v]) => ({
      id,
      title: v.title,
      type: v.type,
      count: v.scores.length,
      avg: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
      high: Math.max(...v.scores),
      low: Math.min(...v.scores),
    }));
  }, [embeddedResults]);

  const loading = loadingIsat;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <AppNavSheet />
          <Breadcrumbs items={[{ label: "Quiz Analytics" }]} />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Home
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="isat">
            <TabsList className="mb-4">
              <TabsTrigger value="isat" className="gap-1.5">
                <Target className="h-4 w-4" /> ISAT Practice
                {completedIsats.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{completedIsats.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="canvas" className="gap-1.5" disabled={!canvasConnected}>
                <BookOpen className="h-4 w-4" /> Canvas Quizzes
                {canvasQuizData.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{canvasQuizData.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="embedded" className="gap-1.5">
                <Users className="h-4 w-4" /> Embedded Results
                {embeddedResults.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{embeddedResults.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ─── ISAT Tab ─── */}
            <TabsContent value="isat" className="space-y-6">
              {completedIsats.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-lg font-semibold">No completed ISAT exams yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Complete some ISAT practice exams to see analytics here</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/question-bank")}>
                      Go to Question Bank
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Overview Cards */}
                  {isatOverview && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
                          <p className="text-2xl font-bold">{isatOverview.avgScore}%</p>
                          <p className="text-xs text-muted-foreground">Avg Score</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
                          <p className="text-2xl font-bold">{isatOverview.totalExams}</p>
                          <p className="text-xs text-muted-foreground">Exams Taken</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                          <p className="text-2xl font-bold">{isatOverview.totalHints}</p>
                          <p className="text-xs text-muted-foreground">Hints Used</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
                          <p className="text-2xl font-bold">{Object.keys(isatOverview.byGrade).length}</p>
                          <p className="text-xs text-muted-foreground">Grade Levels</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Score Trend */}
                  {isatTrendData.length > 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" /> Score Trend Over Time
                        </CardTitle>
                        <CardDescription>Performance progression across ISAT practice exams</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={isatTrendData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="bg-popover border border-border rounded-lg p-2 shadow-md text-xs">
                                    <p className="font-semibold">{d.title}</p>
                                    <p className="text-muted-foreground">{d.date} • {d.grade} Grade</p>
                                    <p className={`font-bold ${gradeColor(d.score)}`}>{d.score}%</p>
                                  </div>
                                );
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="score"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary) / 0.15)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Standard Performance + Grade Breakdown side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Standards Performance */}
                    {isatStandardPerformance.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4" /> Performance by Standard
                          </CardTitle>
                          <CardDescription>Mastery level per NGSS standard across all exams</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="max-h-[300px]">
                            <div className="space-y-3">
                              {isatStandardPerformance.map(s => (
                                <div key={s.code} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium truncate max-w-[60%]">{s.code}</span>
                                    <span className={`font-bold ${gradeColor(s.pct)}`}>{s.pct}%</span>
                                  </div>
                                  <Progress value={s.pct} className="h-2" />
                                  <p className="text-[10px] text-muted-foreground">{s.correct}/{s.total} points earned</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {/* Grade Level Breakdown */}
                    {isatOverview && Object.keys(isatOverview.byGrade).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" /> Performance by Grade Level
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={Object.entries(isatOverview.byGrade).map(([grade, v]) => ({ grade: `${grade} Grade`, avg: v.avg, count: v.count }))}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="grade" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null;
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-popover border border-border rounded-lg p-2 shadow-md text-xs">
                                      <p className="font-semibold">{d.grade}</p>
                                      <p>Average: <span className="font-bold">{d.avg}%</span></p>
                                      <p className="text-muted-foreground">{d.count} exams</p>
                                    </div>
                                  );
                                }}
                              />
                              <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Exam History Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Exam History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Questions</TableHead>
                              <TableHead>Hints</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {completedIsats.map(e => {
                              const scorePct = pct(e.score!, e.total_points!);
                              return (
                                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/isat-exam/${e.id}`)}>
                                  <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-xs">{e.grade_level}</Badge></TableCell>
                                  <TableCell>
                                    <span className={`font-bold ${gradeColor(scorePct)}`}>{scorePct}%</span>
                                    <span className="text-xs text-muted-foreground ml-1">({e.score}/{e.total_points})</span>
                                  </TableCell>
                                  <TableCell>{e.question_count}</TableCell>
                                  <TableCell>{e.hints_used}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {new Date(e.completed_at!).toLocaleDateString()}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ─── Canvas Tab ─── */}
            <TabsContent value="canvas" className="space-y-6">
              {!canvasConnected ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-lg font-semibold">Canvas not connected</p>
                    <p className="text-sm text-muted-foreground mt-1">Configure your Canvas API settings to view quiz analytics</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/profile")}>
                      Go to Settings
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Controls */}
                  <Card>
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger className="w-[220px] h-9 text-sm">
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Courses</SelectItem>
                          {courses.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={loadCanvasData} disabled={loadingCanvas} className="gap-1.5">
                        {loadingCanvas ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Load Quiz Data
                      </Button>
                      {canvasQuizData.length > 0 && (
                        <Badge variant="secondary">{canvasQuizData.length} quizzes loaded</Badge>
                      )}
                    </CardContent>
                  </Card>

                  {canvasQuizData.length === 0 && !loadingCanvas ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <p className="text-lg font-semibold">No quiz data loaded</p>
                        <p className="text-sm text-muted-foreground mt-1">Select a course and click "Load Quiz Data" to see analytics</p>
                      </CardContent>
                    </Card>
                  ) : canvasQuizData.length > 0 && (
                    <>
                      {/* Overview */}
                      {canvasOverview && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
                              <p className="text-2xl font-bold">{canvasOverview.avgScore}%</p>
                              <p className="text-xs text-muted-foreground">Class Average</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
                              <p className="text-2xl font-bold">{canvasOverview.quizCount}</p>
                              <p className="text-xs text-muted-foreground">Quizzes</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                              <p className="text-2xl font-bold">{canvasOverview.totalStudents}</p>
                              <p className="text-xs text-muted-foreground">Students</p>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Distribution */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" /> Grade Distribution
                            </CardTitle>
                            <CardDescription>Student scores across all quizzes</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={canvasDistribution}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="range" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                      <div className="bg-popover border border-border rounded-lg p-2 shadow-md text-xs">
                                        <p className="font-semibold">{d.range} ({d.label})</p>
                                        <p>{d.count} submissions</p>
                                      </div>
                                    );
                                  }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                  {canvasDistribution.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {/* Quiz Comparison */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" /> Quiz Averages Comparison
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={canvasQuizSummary.slice(0, 10)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                <YAxis
                                  type="category"
                                  dataKey="quiz"
                                  width={120}
                                  tick={{ fontSize: 10 }}
                                  className="fill-muted-foreground"
                                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                                />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                      <div className="bg-popover border border-border rounded-lg p-2 shadow-md text-xs space-y-0.5">
                                        <p className="font-semibold">{d.quiz}</p>
                                        <p className="text-muted-foreground">{d.course}</p>
                                        <p>Avg: <span className="font-bold">{d.avg}%</span></p>
                                        <p>Range: {d.low}% – {d.high}%</p>
                                        <p>{d.submissions} submissions</p>
                                      </div>
                                    );
                                  }}
                                />
                                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Quiz Details Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Quiz Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="max-h-[350px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Quiz</TableHead>
                                  <TableHead>Course</TableHead>
                                  <TableHead>Submissions</TableHead>
                                  <TableHead>Avg</TableHead>
                                  <TableHead>High</TableHead>
                                  <TableHead>Low</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {canvasQuizSummary.map((q, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium max-w-[180px] truncate">{q.quiz}</TableCell>
                                    <TableCell className="text-sm max-w-[140px] truncate">{q.course}</TableCell>
                                    <TableCell>{q.submissions}</TableCell>
                                    <TableCell><span className={`font-bold ${gradeColor(q.avg)}`}>{q.avg}%</span></TableCell>
                                    <TableCell className="text-green-600 dark:text-green-400">{q.high}%</TableCell>
                                    <TableCell className="text-red-600 dark:text-red-400">{q.low}%</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* ─── Embedded Results Tab ─── */}
            <TabsContent value="embedded" className="space-y-6">
              {/* Controls */}
              <Card>
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={loadEmbeddedResults} disabled={loadingEmbedded} className="gap-1.5">
                    {loadingEmbedded ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Load Embedded Results
                  </Button>
                  {embeddedResults.length > 0 && (
                    <Badge variant="secondary">{embeddedResults.length} completions loaded</Badge>
                  )}
                </CardContent>
              </Card>

              {!embeddedLoaded && !loadingEmbedded ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-lg font-semibold">Embedded Activity Results</p>
                    <p className="text-sm text-muted-foreground mt-1">Click "Load Embedded Results" to view student scores from Canvas-embedded exams and activities</p>
                  </CardContent>
                </Card>
              ) : embeddedResults.length === 0 && embeddedLoaded ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-lg font-semibold">No completions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Students haven't completed any embedded exams or activities via Canvas LTI yet</p>
                  </CardContent>
                </Card>
              ) : embeddedResults.length > 0 && (
                <>
                  {/* Overview Cards */}
                  {embeddedSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
                          <p className="text-2xl font-bold">{embeddedSummary.total}</p>
                          <p className="text-xs text-muted-foreground">Completions</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                          <p className="text-2xl font-bold">{embeddedSummary.uniqueStudents}</p>
                          <p className="text-xs text-muted-foreground">Students</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
                          <p className="text-2xl font-bold">{embeddedSummary.avgScore}%</p>
                          <p className="text-xs text-muted-foreground">Avg Score</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Target className="h-5 w-5 text-primary mx-auto mb-1" />
                          <p className="text-2xl font-bold">{embeddedSummary.activityCount}</p>
                          <p className="text-xs text-muted-foreground">Activities</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Score Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" /> Grade Distribution
                        </CardTitle>
                        <CardDescription>Student scores across all embedded activities</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={embeddedDistribution}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="range" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="bg-popover border border-border rounded-lg p-2 shadow-md text-xs">
                                    <p className="font-semibold">{d.range} ({d.label})</p>
                                    <p>{d.count} completions</p>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                              {embeddedDistribution.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Per-Activity Breakdown */}
                    {embeddedByActivity.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Activity Averages
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={embeddedByActivity.slice(0, 10)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <YAxis
                                type="category"
                                dataKey="title"
                                width={120}
                                tick={{ fontSize: 10 }}
                                className="fill-muted-foreground"
                                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null;
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-popover border border-border rounded-lg p-2 shadow-md text-xs space-y-0.5">
                                      <p className="font-semibold">{d.title}</p>
                                      <p className="text-muted-foreground">{d.type}</p>
                                      <p>Avg: <span className="font-bold">{d.avg}%</span></p>
                                      <p>Range: {d.low}% – {d.high}%</p>
                                      <p>{d.count} completions</p>
                                    </div>
                                  );
                                }}
                              />
                              <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Student Results Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Student Completions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Activity</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Percentage</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {embeddedResults.map(r => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{r.studentName}</TableCell>
                                <TableCell className="max-w-[180px] truncate">{r.activityTitle}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{r.activityType}</Badge></TableCell>
                                <TableCell className="text-sm">{r.score}/{r.maxScore}</TableCell>
                                <TableCell>
                                  <span className={`font-bold ${gradeColor(r.percentage)}`}>{r.percentage}%</span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {new Date(r.completedAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
