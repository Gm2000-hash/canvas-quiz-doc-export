import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getQuestionBank, deleteFromBank, updateQuestion, type QuestionBankItem } from "@/lib/question-bank";
import { exportBankQuizToDocx } from "@/lib/export-bank-quiz";
import { toast } from "sonner";
import { Loader2, Search, Trash2, FlaskConical, BookOpen, ArrowLeft, FileText, Pencil, Plus, X, List, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [quizTitle, setQuizTitle] = useState("Custom Quiz");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [editText, setEditText] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editStandards, setEditStandards] = useState<{ ngss_code: string; ngss_description: string }[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

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
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast.success("Question removed");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const openEdit = (q: QuestionBankItem) => {
    setEditingQuestion(q);
    setEditText(stripHtml(q.question_text));
    setEditPoints(q.points_possible);
    setEditStandards([...q.standards]);
    setNewCode("");
    setNewDesc("");
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    setSaving(true);
    try {
      await updateQuestion(
        editingQuestion.id,
        { question_text: editText, points_possible: editPoints },
        editStandards
      );
      setQuestions(prev => prev.map(q =>
        q.id === editingQuestion.id
          ? { ...q, question_text: editText, points_possible: editPoints, standards: editStandards }
          : q
      ));
      setEditingQuestion(null);
      toast.success("Question updated");
    } catch {
      toast.error("Failed to update question");
    } finally {
      setSaving(false);
    }
  };

  const addStandard = () => {
    if (!newCode.trim()) return;
    setEditStandards(prev => [...prev, { ngss_code: newCode.trim(), ngss_description: newDesc.trim() }]);
    setNewCode("");
    setNewDesc("");
  };

  const removeStandard = (idx: number) => {
    setEditStandards(prev => prev.filter((_, i) => i !== idx));
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

  // Build a map of standard -> description for display
  const standardDescriptions = new Map<string, string>();
  questions.forEach(q => q.standards.forEach(s => {
    if (!standardDescriptions.has(s.ngss_code)) standardDescriptions.set(s.ngss_code, s.ngss_description);
  }));

  const allStandards = Array.from(standardDescriptions.keys()).sort();

  const filtered = questions.filter(q => {
    const matchesSearch = !search || stripHtml(q.question_text).toLowerCase().includes(search.toLowerCase());
    const matchesStandard = !selectedStandard || q.standards.some(s => s.ngss_code === selectedStandard);
    return matchesSearch && matchesStandard;
  });

  // Group questions by standard (questions with multiple standards appear in each group)
  const groupedByStandard = new Map<string, QuestionBankItem[]>();
  const untagged: QuestionBankItem[] = [];
  filtered.forEach(q => {
    if (q.standards.length === 0) {
      untagged.push(q);
    } else {
      q.standards.forEach(s => {
        if (!selectedStandard || s.ngss_code === selectedStandard) {
          const list = groupedByStandard.get(s.ngss_code) || [];
          list.push(q);
          groupedByStandard.set(s.ngss_code, list);
        }
      });
      // If filtering by a specific standard, also ensure it appears
      if (selectedStandard && !q.standards.some(s => s.ngss_code === selectedStandard)) return;
      if (!selectedStandard) {
        // Already handled above
      }
    }
  });
  const sortedGroupKeys = Array.from(groupedByStandard.keys()).sort();

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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button variant={viewMode === "grouped" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grouped")} className="gap-1.5">
              <LayoutGrid className="h-4 w-4" /> By Standard
            </Button>
            <Button variant={viewMode === "flat" ? "default" : "outline"} size="sm" onClick={() => setViewMode("flat")} className="gap-1.5">
              <List className="h-4 w-4" /> Flat List
            </Button>
          </div>
          {selected.size > 0 && (
            <Button onClick={() => setShowExportDialog(true)} className="gap-2">
              <FileText className="h-4 w-4" />
              Create Quiz ({selected.size})
            </Button>
          )}
        </div>

        {allStandards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={!selectedStandard ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedStandard(null)}>
              All Standards
            </Badge>
            {allStandards.map(code => (
              <Badge key={code} variant={selectedStandard === code ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedStandard(selectedStandard === code ? null : code)}>
                {code}
              </Badge>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{questions.length === 0 ? "Your question bank is empty. Export a quiz to start building it!" : "No questions match your filter."}</p>
            </CardContent>
          </Card>
        ) : viewMode === "grouped" ? (
          /* Grouped by Standard view */
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Checkbox checked={allFilteredSelected} onCheckedChange={selectAllFiltered} />
              <p className="text-sm text-muted-foreground">
                {allFilteredSelected ? "Deselect all" : "Select all"} · {filtered.length} unique question{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            {sortedGroupKeys.map(code => {
              const groupQuestions = groupedByStandard.get(code) || [];
              const desc = standardDescriptions.get(code) || "";
              return (
                <Collapsible key={code} defaultOpen>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <FlaskConical className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">{code}</Badge>
                          <span className="text-sm text-muted-foreground">({groupQuestions.length} question{groupQuestions.length !== 1 ? "s" : ""})</span>
                        </div>
                        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2 ml-4 border-l-2 border-primary/20 pl-4">
                      {groupQuestions.map(q => (
                        <Card key={`${code}-${q.id}`} className={`group cursor-pointer transition-colors ${selected.has(q.id) ? "ring-2 ring-primary" : ""}`} onClick={() => toggleSelect(q.id)}>
                          <CardContent className="p-3 space-y-1.5">
                            <div className="flex items-start gap-3">
                              <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} onClick={e => e.stopPropagation()} className="mt-0.5" />
                              <p className="text-sm text-foreground flex-1">{stripHtml(q.question_text)}</p>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); openEdit(q); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(q.id); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pl-7">
                              {q.standards.filter(s => s.ngss_code !== code).map(s => (
                                <Badge key={s.ngss_code} variant="outline" className="text-xs">{s.ngss_code}</Badge>
                              ))}
                              {q.source_course && (
                                <span className="text-xs text-muted-foreground">
                                  {q.source_course}{q.source_quiz ? ` · ${q.source_quiz}` : ""}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">{q.points_possible} pts</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            {untagged.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <FlaskConical className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Untagged</span>
                        <span className="text-sm text-muted-foreground">({untagged.length})</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2 ml-4 border-l-2 border-muted pl-4">
                    {untagged.map(q => (
                      <Card key={`untagged-${q.id}`} className={`group cursor-pointer transition-colors ${selected.has(q.id) ? "ring-2 ring-primary" : ""}`} onClick={() => toggleSelect(q.id)}>
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-start gap-3">
                            <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} onClick={e => e.stopPropagation()} className="mt-0.5" />
                            <p className="text-sm text-foreground flex-1">{stripHtml(q.question_text)}</p>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); openEdit(q); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(q.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-7">
                            {q.source_course && <span className="text-xs text-muted-foreground">{q.source_course}{q.source_quiz ? ` · ${q.source_quiz}` : ""}</span>}
                            <span className="text-xs text-muted-foreground ml-auto">{q.points_possible} pts</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ) : (
          /* Flat list view */
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox checked={allFilteredSelected} onCheckedChange={selectAllFiltered} />
              <p className="text-sm text-muted-foreground">
                {allFilteredSelected ? "Deselect all" : "Select all"} · {filtered.length} question{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            {filtered.map(q => (
              <Card key={q.id} className={`group cursor-pointer transition-colors ${selected.has(q.id) ? "ring-2 ring-primary" : ""}`} onClick={() => toggleSelect(q.id)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} onClick={e => e.stopPropagation()} className="mt-0.5" />
                    <p className="text-sm text-foreground flex-1">{stripHtml(q.question_text)}</p>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); openEdit(q); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(q.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-7">
                    {q.standards.map(s => (
                      <div key={s.ngss_code} className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs shrink-0">{s.ngss_code}</Badge>
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
            <DialogDescription>Configure your quiz export settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input id="quiz-title" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Enter quiz title..." />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="answer-key">Include Answer Key</Label>
              <Switch id="answer-key" checked={includeAnswerKey} onCheckedChange={setIncludeAnswerKey} />
            </div>
            <p className="text-sm text-muted-foreground">{selected.size} question{selected.size !== 1 ? "s" : ""} selected</p>
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

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => { if (!open) setEditingQuestion(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update the question text, points, and NGSS standards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input type="number" min={0} value={editPoints} onChange={e => setEditPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>NGSS Standards</Label>
              <div className="space-y-2">
                {editStandards.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                    <Badge variant="secondary" className="text-xs shrink-0">{s.ngss_code}</Badge>
                    <span className="text-xs text-muted-foreground flex-1 truncate">{s.ngss_description}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => removeStandard(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Code (e.g. HS-PS1-1)" value={newCode} onChange={e => setNewCode(e.target.value)} className="w-36" />
                <Input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="flex-1" />
                <Button variant="outline" size="icon" onClick={addStandard} disabled={!newCode.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editText.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
