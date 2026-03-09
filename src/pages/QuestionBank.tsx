import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getQuestionBank, deleteFromBank, type QuestionBankItem } from "@/lib/question-bank";
import { exportBankQuizToDocx } from "@/lib/export-bank-quiz";
import { toast } from "sonner";
import { Loader2, Search, Trash2, FlaskConical, BookOpen, ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

const QuestionBank = () => {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [quizTitle, setQuizTitle] = useState("Custom Quiz");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await getQuestionBank();
      setQuestions(data);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuestions(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteFromBank(id);
      setQuestions(q => q.filter(item => item.id !== id));
      toast.success("Question removed");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (filtered.every(q => selected.has(q.id))) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(q => next.delete(q.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(q => next.add(q.id));
        return next;
      });
    }
  };

  const handleExport = async () => {
    const selectedQuestions = questions.filter(q => selected.has(q.id));
    if (selectedQuestions.length === 0) return;
    setExporting(true);
    try {
      await exportBankQuizToDocx(quizTitle, selectedQuestions, includeAnswerKey);
      toast.success("Quiz exported!");
      setShowExportDialog(false);
    } catch {
      toast.error("Failed to export quiz");
    } finally {
      setExporting(false);
    }
  };

  // Collect all unique standards
  const allStandards = Array.from(
    new Set(questions.flatMap(q => q.standards.map(s => s.ngss_code)))
  ).sort();

  // Filter questions
  const filtered = questions.filter(q => {
    const matchesSearch = !search || stripHtml(q.question_text).toLowerCase().includes(search.toLowerCase());
    const matchesStandard = !selectedStandard || q.standards.some(s => s.ngss_code === selectedStandard);
    return matchesSearch && matchesStandard;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selected.has(q.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 h-16 border-b bg-primary text-primary-foreground flex items-center px-4 gap-4 shadow-md">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Question Bank</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
        {/* Search & filter + create quiz button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {selected.size > 0 && (
            <Button onClick={() => setShowExportDialog(true)} className="gap-2">
              <FileText className="h-4 w-4" />
              Create Quiz ({selected.size})
            </Button>
          )}
        </div>

        {/* NGSS standard filter chips */}
        {allStandards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={!selectedStandard ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedStandard(null)}
            >
              All Standards
            </Badge>
            {allStandards.map(code => (
              <Badge
                key={code}
                variant={selectedStandard === code ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedStandard(selectedStandard === code ? null : code)}
              >
                {code}
              </Badge>
            ))}
          </div>
        )}

        {/* Questions list */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{questions.length === 0 ? "Your question bank is empty. Export a quiz to start building it!" : "No questions match your filter."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={selectAllFiltered}
              />
              <p className="text-sm text-muted-foreground">
                {allFilteredSelected ? "Deselect all" : "Select all"} · {filtered.length} question{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            {filtered.map(q => (
              <Card
                key={q.id}
                className={`group cursor-pointer transition-colors ${selected.has(q.id) ? "ring-2 ring-primary" : ""}`}
                onClick={() => toggleSelect(q.id)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(q.id)}
                      onCheckedChange={() => toggleSelect(q.id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <p className="text-sm text-foreground flex-1">{stripHtml(q.question_text)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); handleDelete(q.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-7">
                    {q.standards.map(s => (
                      <div key={s.ngss_code} className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {s.ngss_code}
                        </Badge>
                        <span className="text-xs text-muted-foreground italic">{s.ngss_description}</span>
                      </div>
                    ))}
                    {q.source_course && (
                      <span className="text-xs text-muted-foreground">
                        {q.source_course}{q.source_quiz ? ` · ${q.source_quiz}` : ""}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{q.points_possible} pts · {q.question_type.replace(/_/g, " ")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Quiz Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input
                id="quiz-title"
                value={quizTitle}
                onChange={e => setQuizTitle(e.target.value)}
                placeholder="Enter quiz title..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="answer-key">Include Answer Key</Label>
              <Switch
                id="answer-key"
                checked={includeAnswerKey}
                onCheckedChange={setIncludeAnswerKey}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {selected.size} question{selected.size !== 1 ? "s" : ""} selected
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={exporting || !quizTitle.trim()}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
