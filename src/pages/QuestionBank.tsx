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
import { Loader2, Search, Trash2, FlaskConical, BookOpen, ArrowLeft, FileText, Pencil, Plus, X, List, LayoutGrid, Leaf, Globe, Atom, ChevronRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// NGSS discipline categories
interface DisciplineConfig {
  key: string;
  label: string;
  icon: typeof Leaf;
  coreIdeas: string[]; // All MS core idea codes for this discipline
}

const DISCIPLINES: DisciplineConfig[] = [
  { key: "LS", label: "Life Science", icon: Leaf, coreIdeas: ["MS-LS1", "MS-LS2", "MS-LS3", "MS-LS4"] },
  { key: "ESS", label: "Earth & Space Science", icon: Globe, coreIdeas: ["MS-ESS1", "MS-ESS2", "MS-ESS3"] },
  { key: "PS", label: "Physical Science", icon: Atom, coreIdeas: ["MS-PS1", "MS-PS2", "MS-PS3", "MS-PS4"] },
];

// Parse a standard code like "MS-LS1-3" into { discipline: "LS", coreIdea: "MS-LS1", full: "MS-LS1-3" }
function parseStandardCode(code: string) {
  // Match patterns like MS-LS1-3, HS-PS2-1, MS-ESS1-4
  const match = code.match(/^(MS|HS)-(LS|ESS|PS)(\d+)(-\d+)?$/i);
  if (!match) return null;
  const level = match[1].toUpperCase(); // MS or HS
  const discipline = match[2].toUpperCase(); // LS, ESS, PS
  const coreNum = match[3]; // 1, 2, 3, etc.
  return {
    level,
    discipline,
    coreNum,
    // The "core idea" grouping key — always use MS prefix for grouping
    coreIdea: `MS-${discipline}${coreNum}`,
    full: code,
  };
}

// Get the core idea label (e.g., "MS-LS1" from "MS-LS1" or "HS-LS1")
function getCoreIdeaFromCode(code: string): string | null {
  const parsed = parseStandardCode(code);
  return parsed ? parsed.coreIdea : null;
}

function getDisciplineForCode(code: string): string | null {
  const parsed = parseStandardCode(code);
  return parsed ? parsed.discipline : null;
}

const QuestionBank = () => {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [quizTitle, setQuizTitle] = useState("Custom Quiz");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  // Drill-down state for grouped view
  const [expandedDiscipline, setExpandedDiscipline] = useState<string | null>(null);
  const [expandedCoreIdea, setExpandedCoreIdea] = useState<string | null>(null);

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

  const filtered = questions.filter(q => {
    return !search || stripHtml(q.question_text).toLowerCase().includes(search.toLowerCase());
  });

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

  // Build discipline → coreIdea → questions hierarchy
  // HS standards are grouped under their MS counterpart core idea
  const buildHierarchy = () => {
    // Map: discipline key → { coreIdea → { questions: Set<id>, descriptions: Set<string> } }
    const hierarchy: Map<string, Map<string, { questionIds: Set<string>; descriptions: Set<string> }>> = new Map();
    const untagged: QuestionBankItem[] = [];

    for (const disc of DISCIPLINES) {
      const discMap = new Map<string, { questionIds: Set<string>; descriptions: Set<string> }>();
      // Pre-populate all core ideas so they always appear
      for (const ci of disc.coreIdeas) {
        discMap.set(ci, { questionIds: new Set(), descriptions: new Set() });
      }
      hierarchy.set(disc.key, discMap);
    }

    for (const q of filtered) {
      if (q.standards.length === 0) {
        untagged.push(q);
        continue;
      }

      for (const s of q.standards) {
        const discipline = getDisciplineForCode(s.ngss_code);
        const coreIdea = getCoreIdeaFromCode(s.ngss_code);
        if (!discipline || !coreIdea) {
          // Non-standard code, treat as untagged if no other standards match
          continue;
        }

        const discMap = hierarchy.get(discipline);
        if (!discMap) continue;

        if (!discMap.has(coreIdea)) {
          discMap.set(coreIdea, { questionIds: new Set(), descriptions: new Set() });
        }
        const group = discMap.get(coreIdea)!;
        group.questionIds.add(q.id);
        if (s.ngss_description) group.descriptions.add(s.ngss_description);
      }
    }

    // Check if question has no recognized discipline tags → untagged
    for (const q of filtered) {
      if (q.standards.length > 0 && !q.standards.some(s => getDisciplineForCode(s.ngss_code))) {
        untagged.push(q);
      }
    }

    return { hierarchy, untagged };
  };

  const { hierarchy, untagged } = buildHierarchy();

  // Count questions per discipline
  const disciplineCounts = (discKey: string) => {
    const discMap = hierarchy.get(discKey);
    if (!discMap) return 0;
    const ids = new Set<string>();
    for (const group of discMap.values()) {
      group.questionIds.forEach(id => ids.add(id));
    }
    return ids.size;
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selected.has(q.id));

  const questionCard = (q: QuestionBankItem, keyPrefix: string) => (
    <Card key={`${keyPrefix}-${q.id}`} className={`group cursor-pointer transition-colors ${selected.has(q.id) ? "ring-2 ring-primary" : ""}`} onClick={() => toggleSelect(q.id)}>
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
          {q.standards.map(s => (
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
  );

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

        {/* Breadcrumb trail for grouped view */}
        {viewMode === "grouped" && (expandedDiscipline || expandedCoreIdea) && (
          <nav className="flex items-center gap-1.5 text-sm">
            <button
              className="text-primary hover:underline font-medium"
              onClick={() => { setExpandedDiscipline(null); setExpandedCoreIdea(null); }}
            >
              All Standards
            </button>
            {expandedDiscipline && expandedDiscipline !== "untagged" && (() => {
              const disc = DISCIPLINES.find(d => d.key === expandedDiscipline);
              return disc ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <button
                    className={`font-medium ${expandedCoreIdea ? "text-primary hover:underline" : "text-foreground"}`}
                    onClick={() => setExpandedCoreIdea(null)}
                  >
                    {disc.label}
                  </button>
                </>
              ) : null;
            })()}
            {expandedDiscipline === "untagged" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">Untagged</span>
              </>
            )}
            {expandedCoreIdea && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{expandedCoreIdea}</span>
              </>
            )}
          </nav>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{questions.length === 0 ? "Your question bank is empty. Export a quiz to start building it!" : "No questions match your search."}</p>
            </CardContent>
          </Card>
        ) : viewMode === "grouped" ? (
          /* 3-tier grouped view: Discipline tiles → Core Ideas → Questions */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox checked={allFilteredSelected} onCheckedChange={selectAllFiltered} />
              <p className="text-sm text-muted-foreground">
                {allFilteredSelected ? "Deselect all" : "Select all"} · {filtered.length} unique question{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Discipline tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DISCIPLINES.map(disc => {
                const count = disciplineCounts(disc.key);
                const isExpanded = expandedDiscipline === disc.key;
                const Icon = disc.icon;

                return (
                  <Card
                    key={disc.key}
                    className={`cursor-pointer transition-all hover:shadow-md ${isExpanded ? "ring-2 ring-primary col-span-1 sm:col-span-3" : ""} ${count === 0 ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (count === 0) return;
                      setExpandedDiscipline(isExpanded ? null : disc.key);
                      setExpandedCoreIdea(null);
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{disc.label}</h3>
                          <p className="text-sm text-muted-foreground">{count} question{count !== 1 ? "s" : ""}</p>
                        </div>
                        {count > 0 && (
                          isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Expanded: show core ideas for this discipline */}
                      {isExpanded && (
                        <div className="mt-4 space-y-2 border-t border-border pt-4" onClick={e => e.stopPropagation()}>
                          {Array.from(hierarchy.get(disc.key)?.entries() || [])
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([coreIdea, group]) => {
                              const isCoreExpanded = expandedCoreIdea === coreIdea;
                              const coreQuestions = filtered.filter(q => group.questionIds.has(q.id));
                              const firstDesc = Array.from(group.descriptions)[0] || "";

                              return (
                                <div key={coreIdea}>
                                  <button
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                                    onClick={() => setExpandedCoreIdea(isCoreExpanded ? null : coreIdea)}
                                  >
                                    {isCoreExpanded ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="default" className="text-xs shrink-0">{coreIdea}</Badge>
                                        <span className="text-sm text-muted-foreground">({coreQuestions.length} question{coreQuestions.length !== 1 ? "s" : ""})</span>
                                      </div>
                                      {firstDesc && <p className="text-xs text-muted-foreground mt-1 truncate">{firstDesc}</p>}
                                    </div>
                                  </button>

                                  {/* Expanded: show questions for this core idea */}
                                  {isCoreExpanded && (
                                    <div className="space-y-2 mt-2 ml-6 border-l-2 border-primary/20 pl-4">
                                      {coreQuestions.map(q => questionCard(q, coreIdea))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Untagged section */}
            {untagged.length > 0 && (
              <Card className="mt-4">
                <CardContent className="p-5">
                  <button
                    className="w-full flex items-center gap-3 text-left"
                    onClick={() => setExpandedDiscipline(expandedDiscipline === "untagged" ? null : "untagged")}
                  >
                    <FlaskConical className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-muted-foreground">Untagged</h3>
                      <p className="text-sm text-muted-foreground">{untagged.length} question{untagged.length !== 1 ? "s" : ""}</p>
                    </div>
                    {expandedDiscipline === "untagged" ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  {expandedDiscipline === "untagged" && (
                    <div className="space-y-2 mt-4 border-t border-border pt-4">
                      {untagged.map(q => questionCard(q, "untagged"))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
            {filtered.map(q => questionCard(q, "flat"))}
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
                <Input placeholder="Code (e.g. MS-PS1-1)" value={newCode} onChange={e => setNewCode(e.target.value)} className="w-36" />
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
