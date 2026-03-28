import React, { useState, useEffect, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { getQuestionBank, type QuestionBankItem } from "@/lib/question-bank";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import PushToCanvasDialog from "@/components/PushToCanvasDialog";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { toast } from "sonner";
import {
  Loader2, Search, Plus, Minus, Save, Upload, ArrowLeft, GripVertical,
  Trash2, FileText, ClipboardCheck,
} from "lucide-react";
import { DOK_LEVELS, BLOOMS_LEVELS, ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { ALL_IDAHO_STANDARDS_FLAT } from "@/lib/idaho-standards-data";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

interface SavedQuiz {
  id: string;
  title: string;
  description: string;
  question_ids: string[];
  settings: any;
  created_at: string;
  updated_at: string;
}

export default function QuizBuilder() {
  usePageTitle("Quiz Builder");
  const navigate = useNavigate();
  const { id: quizId } = useParams<{ id: string }>();
  const { config: canvasConfig, isConfigured: canvasConnected } = useCanvasConfig();

  // Bank questions
  const [allQuestions, setAllQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [quizTitle, setQuizTitle] = useState("Custom Quiz");
  const [quizDescription, setQuizDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(quizId || null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStandard, setFilterStandard] = useState("all");
  const [filterDok, setFilterDok] = useState("all");
  const [filterBlooms, setFilterBlooms] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Push
  const [showPush, setShowPush] = useState(false);

  // Saved quizzes list
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadingSaved(true);
    try {
      const [questions, savedRes] = await Promise.all([
        getQuestionBank(),
        supabase.from("custom_quizzes").select("*").order("updated_at", { ascending: false }) as any,
      ]);
      setAllQuestions(questions);
      if (savedRes.data) setSavedQuizzes(savedRes.data);

      // Load existing quiz if editing
      if (quizId && savedRes.data) {
        const quiz = savedRes.data.find((q: SavedQuiz) => q.id === quizId);
        if (quiz) {
          setQuizTitle(quiz.title);
          setQuizDescription(quiz.description || "");
          setSelectedIds(quiz.question_ids || []);
          setExistingId(quiz.id);
        }
      }
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
      setLoadingSaved(false);
    }
  };

  // All unique standards from questions
  const allStandards = useMemo(() => {
    const set = new Set<string>();
    allQuestions.forEach(q => q.standards.forEach(s => set.add(s.ngss_code)));
    return Array.from(set).sort();
  }, [allQuestions]);

  // Filtered questions
  const filtered = useMemo(() => {
    return allQuestions.filter(q => {
      if (search) {
        const s = search.toLowerCase();
        if (!stripHtml(q.question_text).toLowerCase().includes(s)) return false;
      }
      if (filterStandard !== "all" && !q.standards.some(s => s.ngss_code === filterStandard)) return false;
      if (filterDok !== "all" && q.dok_level !== Number(filterDok)) return false;
      if (filterBlooms !== "all" && q.blooms_level !== filterBlooms) return false;
      if (filterType !== "all" && q.question_type !== filterType) return false;
      return true;
    });
  }, [allQuestions, search, filterStandard, filterDok, filterBlooms, filterType]);

  // Selected questions in order
  const selectedQuestions = useMemo(() => {
    const map = new Map(allQuestions.map(q => [q.id, q]));
    return selectedIds.map(id => map.get(id)).filter(Boolean) as QuestionBankItem[];
  }, [selectedIds, allQuestions]);

  const toggleQuestion = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const removeQuestion = (id: string) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const handleSave = async () => {
    if (!quizTitle.trim()) { toast.error("Enter a quiz title"); return; }
    if (selectedIds.length === 0) { toast.error("Add at least one question"); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        question_ids: selectedIds,
        settings: {},
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await (supabase.from("custom_quizzes").update(payload).eq("id", existingId) as any);
        if (error) throw error;
        toast.success("Quiz saved!");
      } else {
        const { data, error } = await (supabase.from("custom_quizzes").insert({ ...payload, user_id: user.id }).select("id").single() as any);
        if (error) throw error;
        setExistingId(data.id);
        toast.success("Quiz created!");
      }

      // Refresh saved list
      const { data: updated } = await supabase.from("custom_quizzes").select("*").order("updated_at", { ascending: false }) as any;
      if (updated) setSavedQuizzes(updated);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    try {
      const { error } = await (supabase.from("custom_quizzes").delete().eq("id", id) as any);
      if (error) throw error;
      setSavedQuizzes(prev => prev.filter(q => q.id !== id));
      if (existingId === id) {
        setExistingId(null);
        setQuizTitle("Custom Quiz");
        setQuizDescription("");
        setSelectedIds([]);
      }
      toast.success("Quiz deleted");
    } catch {
      toast.error("Failed to delete quiz");
    }
  };

  const loadQuiz = (quiz: SavedQuiz) => {
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || "");
    setSelectedIds(quiz.question_ids || []);
    setExistingId(quiz.id);
  };

  const startNew = () => {
    setExistingId(null);
    setQuizTitle("Custom Quiz");
    setQuizDescription("");
    setSelectedIds([]);
  };

  const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points_possible || 1), 0);

  const QUESTION_TYPES: Record<string, string> = {
    multiple_choice_question: "Multiple Choice",
    multiple_answers_question: "Select All",
    true_false_question: "True/False",
    short_answer_question: "Short Answer",
    essay_question: "Essay",
    matching_question: "Matching",
    fill_in_multiple_blanks_question: "Fill in Blanks",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <AppNavSheet />
          <Breadcrumbs items={[
            { label: "Question Bank", href: "/question-bank" },
            { label: existingId ? quizTitle : "New Quiz" },
          ]} />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/question-bank")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Quiz
            </Button>
            {canvasConnected && selectedIds.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowPush(true)} className="gap-1.5">
                <Upload className="h-4 w-4" /> Push to Canvas
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Quiz config + selected questions */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label>Quiz Title</Label>
                  <Input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea value={quizDescription} onChange={e => setQuizDescription(e.target.value)} rows={2} />
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="secondary">{selectedIds.length} questions</Badge>
                  <Badge variant="outline">{totalPoints} points</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Selected questions */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-2">Selected Questions</p>
                {selectedIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No questions selected. Browse and add from the right panel.
                  </p>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-1">
                      {selectedQuestions.map((q, idx) => (
                        <div key={q.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 group">
                          <span className="text-xs text-muted-foreground mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs line-clamp-2">{stripHtml(q.question_text)}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {q.standards.slice(0, 1).map(s => (
                                <Badge key={s.ngss_code} variant="outline" className="text-[9px] px-1 py-0">{s.ngss_code}</Badge>
                              ))}
                              <span className="text-[10px] text-muted-foreground">{q.points_possible || 1}pt</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => removeQuestion(q.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Saved quizzes */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Saved Quizzes</p>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={startNew}>
                    <Plus className="h-3 w-3" /> New
                  </Button>
                </div>
                {loadingSaved ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : savedQuizzes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No saved quizzes yet</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {savedQuizzes.map(q => (
                      <div
                        key={q.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer group hover:bg-muted/50 ${existingId === q.id ? "bg-primary/10 border border-primary/20" : ""}`}
                        onClick={() => loadQuiz(q)}
                      >
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{q.title}</p>
                          <p className="text-[10px] text-muted-foreground">{q.question_ids?.length || 0} questions</p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={e => { e.stopPropagation(); handleDeleteQuiz(q.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Question browser */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={filterStandard} onValueChange={setFilterStandard}>
                    <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Standard" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Standards</SelectItem>
                      {allStandards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterDok} onValueChange={setFilterDok}>
                    <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue placeholder="DOK" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All DOK</SelectItem>
                      {[1, 2, 3, 4].map(d => <SelectItem key={d} value={String(d)}>DOK {d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterBlooms} onValueChange={setFilterBlooms}>
                    <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Bloom's" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bloom's</SelectItem>
                      {BLOOMS_LEVELS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(QUESTION_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">{filtered.length} questions found</p>
              </CardContent>
            </Card>

            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-1.5">
                {filtered.map(q => {
                  const isSelected = selectedIds.includes(q.id);
                  return (
                    <Card
                      key={q.id}
                      className={`cursor-pointer transition-all hover:shadow-sm ${isSelected ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                      onClick={() => toggleQuestion(q.id)}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <Checkbox checked={isSelected} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{stripHtml(q.question_text)}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {q.standards.map(s => (
                              <Badge key={s.ngss_code} variant="outline" className="text-[10px] px-1.5 py-0">{s.ngss_code}</Badge>
                            ))}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {QUESTION_TYPES[q.question_type] || q.question_type}
                            </Badge>
                            {q.dok_level && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">DOK {q.dok_level}</Badge>
                            )}
                            {q.blooms_level && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{q.blooms_level}</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">{q.points_possible || 1}pt</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <Badge className="shrink-0 text-[10px]">Added</Badge>
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No questions match your filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {canvasConnected && canvasConfig && (
        <PushToCanvasDialog
          open={showPush}
          onOpenChange={setShowPush}
          questions={selectedQuestions}
          config={canvasConfig}
        />
      )}
    </div>
  );
}
