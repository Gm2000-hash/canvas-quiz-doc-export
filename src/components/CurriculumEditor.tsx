import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurriculumLessons, type CurriculumLesson } from "@/hooks/useCurriculum";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, GripVertical,
  BookOpen, Sparkles, Loader2, Eye, RotateCcw, Save, X, FileDown,
} from "lucide-react";
import { exportCurriculumUnitToDocx, exportCurriculumLessonToDocx } from "@/lib/export-curriculum-docx";
import { toast as sonnerToast } from "sonner";

interface CurriculumEditorProps {
  units: { id: string; title: string; discipline: string; grade_level: string; description: string }[];
  onRefreshUnits: () => void;
}

export const CurriculumEditor = ({ units, onRefreshUnits }: CurriculumEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<CurriculumLesson | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [genForm, setGenForm] = useState({ subject_area: "", objectives: "", key_terms: "", format: "textbook" as "textbook" | "scripted" | "both" });
  const [genDialogUnit, setGenDialogUnit] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 border-r border-border pr-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Curriculum Editor</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{units.length} units</span>
      </div>

      {/* Units */}
      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No units yet. Create a unit from the Units tab to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit, idx) => (
            <UnitSection
              key={unit.id}
              unit={unit}
              index={idx}
              isExpanded={expandedUnit === unit.id}
              onToggle={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
              onEditLesson={setEditingLesson}
              onOpenGenerate={() => {
                setGenDialogUnit(unit.id);
                setGenForm({ subject_area: unit.title, objectives: "", key_terms: "", format: "textbook" });
              }}
            />
          ))}
        </div>
      )}

      {/* Lesson Editor Dialog */}
      {editingLesson && (
        <LessonEditorDialog
          lesson={editingLesson}
          open={!!editingLesson}
          onOpenChange={(open) => !open && setEditingLesson(null)}
        />
      )}

      {/* AI Generate Dialog */}
      <Dialog open={!!genDialogUnit} onOpenChange={(open) => !open && setGenDialogUnit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Curriculum Reading
            </DialogTitle>
          </DialogHeader>
          <GenerateForm
            form={genForm}
            setForm={setGenForm}
            generating={!!generatingFor}
            onGenerate={async () => {
              if (!genDialogUnit || !user) return;
              setGeneratingFor(genDialogUnit);
              try {
                const { data, error } = await supabase.functions.invoke("generate-curriculum-reading", {
                  body: {
                    subject_area: genForm.subject_area,
                    objectives: genForm.objectives,
                    key_terms: genForm.key_terms || undefined,
                    format: genForm.format,
                  },
                });
                if (error) throw new Error(error.message);
                if (data?.error) throw new Error(data.error);
                if (!data?.lesson) throw new Error("No lesson returned");

                const lesson = data.lesson;
                const tb = genForm.format === "both" ? lesson.textbook : genForm.format === "textbook" ? lesson : null;
                const sc = genForm.format === "both" ? lesson.scripted : genForm.format === "scripted" ? lesson : null;
                const source = tb || sc;

                // Count existing lessons for sort_order
                const { count } = await supabase
                  .from("curriculum_lessons")
                  .select("id", { count: "exact", head: true })
                  .eq("unit_id", genDialogUnit);

                await supabase.from("curriculum_lessons").insert({
                  unit_id: genDialogUnit,
                  user_id: user.id,
                  title: source?.title || genForm.subject_area,
                  sort_order: (count || 0),
                  objectives: tb?.objectives || [],
                  intro: tb?.intro || sc?.hook || [],
                  explanation: tb?.explanation || sc?.key_concepts?.map((kc: any) => `**${kc.heading}**\n\n${kc.content}`) || [],
                  key_terms: tb?.key_terms || [],
                  quiz: tb?.quiz || sc?.formative_assessment || [],
                  reading_title: lesson.reading?.reading_title || null,
                  reading_paragraphs: lesson.reading?.reading_paragraphs || [],
                  reading_questions: lesson.reading?.reading_questions || [],
                } as any);

                sonnerToast.success("Lesson generated and saved!");
                setGenDialogUnit(null);
              } catch (err: any) {
                sonnerToast.error(err.message || "Failed to generate");
              } finally {
                setGeneratingFor(null);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Unit Section ─── */
function UnitSection({
  unit,
  index,
  isExpanded,
  onToggle,
  onEditLesson,
  onOpenGenerate,
}: {
  unit: { id: string; title: string; discipline: string; grade_level: string };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEditLesson: (lesson: CurriculumLesson) => void;
  onOpenGenerate: () => void;
}) {
  const { user } = useAuth();
  const { lessons, loading, createLesson, deleteLesson, reorderLessons } = useCurriculumLessons(isExpanded ? unit.id : undefined);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const fromIdx = lessons.findIndex(l => l.id === dragId);
    const toIdx = lessons.findIndex(l => l.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...lessons];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await reorderLessons(reordered);
    sonnerToast.success("Lessons reordered");
    setDragId(null);
    setDragOverId(null);
  };

  const handleAddLesson = async () => {
    if (!user) return;
    await createLesson({
      unit_id: unit.id,
      title: "New Lesson",
      sort_order: lessons.length,
    });
    sonnerToast.success("Lesson created");
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary"
        >
          {index + 1}
        </div>
        <button onClick={onToggle} className="flex flex-1 items-center gap-2 text-left min-w-0">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-foreground">{unit.title}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {unit.discipline && <span>{unit.discipline}</span>}
              {unit.grade_level && <><span>·</span><span>{unit.grade_level}</span></>}
            </div>
          </div>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          disabled={lessons.length === 0}
          onClick={async () => {
            try {
              await exportCurriculumUnitToDocx(unit, lessons);
              sonnerToast.success("Unit exported to Word!");
            } catch (err: any) {
              sonnerToast.error(err.message || "Export failed");
            }
          }}
        >
          <FileDown className="h-3.5 w-3.5" /> Export
        </Button>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onOpenGenerate}>
          <Sparkles className="h-3.5 w-3.5" /> AI Generate
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {lessons.map((lesson, lessonIdx) => (
                <div
                  key={lesson.id}
                  draggable
                  onDragStart={() => setDragId(lesson.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(lesson.id); }}
                  onDrop={() => handleDrop(lesson.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  className={`group flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/30 ${
                    dragOverId === lesson.id && dragId !== lesson.id ? "ring-2 ring-inset ring-primary" : ""
                  } ${dragId === lesson.id ? "opacity-50" : ""}`}
                >
                  <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground/30 active:cursor-grabbing" />
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                    {String(lessonIdx + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{(lesson.objectives as any[])?.length || 0} objectives</span>
                      {lesson.reading_title && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Reading</span>
                      )}
                      {(lesson.quiz as any[])?.length > 0 && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">Quiz</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={async () => {
                        try {
                          await exportCurriculumLessonToDocx(lesson);
                          sonnerToast.success("Lesson exported!");
                        } catch (err: any) {
                          sonnerToast.error(err.message || "Export failed");
                        }
                      }}
                      title="Export to Word"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onEditLesson(lesson)} title="Edit" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${lesson.title}"?`)) return;
                        await deleteLesson(lesson.id);
                        sonnerToast.success("Lesson deleted");
                      }}
                      title="Delete"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="p-4">
                <button
                  onClick={handleAddLesson}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Lesson
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Generate Form ─── */
function GenerateForm({
  form,
  setForm,
  generating,
  onGenerate,
}: {
  form: { subject_area: string; objectives: string; key_terms: string; format: string };
  setForm: (f: any) => void;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Subject Area / Topic *</Label>
        <Input
          value={form.subject_area}
          onChange={(e) => setForm({ ...form, subject_area: e.target.value })}
          placeholder="e.g. Photosynthesis, Plate Tectonics"
        />
      </div>
      <div className="space-y-2">
        <Label>Learning Objectives *</Label>
        <Textarea
          value={form.objectives}
          onChange={(e) => setForm({ ...form, objectives: e.target.value })}
          placeholder="Enter 2-4 objectives, one per line"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Key Terms</Label>
        <Input
          value={form.key_terms}
          onChange={(e) => setForm({ ...form, key_terms: e.target.value })}
          placeholder="Comma-separated: chlorophyll, glucose, ..."
        />
      </div>
      <div className="space-y-2">
        <Label>Output Format</Label>
        <div className="flex gap-2">
          {[
            { value: "textbook", label: "Textbook" },
            { value: "scripted", label: "Scripted" },
            { value: "both", label: "Both" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm({ ...form, format: opt.value })}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                form.format === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <Button
        onClick={onGenerate}
        disabled={generating || !form.subject_area.trim() || !form.objectives.trim()}
        className="w-full gap-2 rounded-xl"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? "Generating…" : "Generate Lesson"}
      </Button>
    </div>
  );
}

/* ─── Lesson Editor Dialog ─── */
function LessonEditorDialog({
  lesson,
  open,
  onOpenChange,
}: {
  lesson: CurriculumLesson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [objectives, setObjectives] = useState<string[]>(lesson.objectives || []);
  const [keyTerms, setKeyTerms] = useState<{ term: string; definition: string }[]>(lesson.key_terms || []);
  const [intro, setIntro] = useState<string[]>(lesson.intro || []);
  const [explanation, setExplanation] = useState<string[]>(lesson.explanation || []);
  const [readingTitle, setReadingTitle] = useState(lesson.reading_title || "");
  const [readingParagraphs, setReadingParagraphs] = useState<string[]>(lesson.reading_paragraphs || []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("curriculum_lessons")
      .update({
        title,
        objectives: objectives as any,
        key_terms: keyTerms as any,
        intro: intro as any,
        explanation: explanation as any,
        reading_title: readingTitle || null,
        reading_paragraphs: readingParagraphs as any,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", lesson.id);
    setSaving(false);
    if (error) {
      sonnerToast.error(error.message);
    } else {
      sonnerToast.success("Lesson saved!");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Objectives */}
          <div className="space-y-2">
            <Label>Objectives</Label>
            {objectives.map((obj, i) => (
              <div key={i} className="flex gap-2">
                <Input value={obj} onChange={(e) => { const n = [...objectives]; n[i] = e.target.value; setObjectives(n); }} />
                <Button variant="ghost" size="icon" onClick={() => setObjectives(objectives.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setObjectives([...objectives, ""])} className="gap-1">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          {/* Key Terms */}
          <div className="space-y-2">
            <Label>Key Terms</Label>
            {keyTerms.map((kt, i) => (
              <div key={i} className="flex gap-2">
                <Input value={kt.term} placeholder="Term" onChange={(e) => { const n = [...keyTerms]; n[i] = { ...n[i], term: e.target.value }; setKeyTerms(n); }} className="w-1/3" />
                <Input value={kt.definition} placeholder="Definition" onChange={(e) => { const n = [...keyTerms]; n[i] = { ...n[i], definition: e.target.value }; setKeyTerms(n); }} />
                <Button variant="ghost" size="icon" onClick={() => setKeyTerms(keyTerms.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setKeyTerms([...keyTerms, { term: "", definition: "" }])} className="gap-1">
              <Plus className="h-3 w-3" /> Add Term
            </Button>
          </div>

          {/* Reading */}
          <div className="space-y-2">
            <Label>Reading Title</Label>
            <Input value={readingTitle} onChange={(e) => setReadingTitle(e.target.value)} placeholder="Reading passage title" />
          </div>
          <div className="space-y-2">
            <Label>Reading Paragraphs</Label>
            {readingParagraphs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Textarea value={p} onChange={(e) => { const n = [...readingParagraphs]; n[i] = e.target.value; setReadingParagraphs(n); }} rows={2} />
                <Button variant="ghost" size="icon" className="shrink-0 self-start" onClick={() => setReadingParagraphs(readingParagraphs.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setReadingParagraphs([...readingParagraphs, ""])} className="gap-1">
              <Plus className="h-3 w-3" /> Add Paragraph
            </Button>
          </div>

          {/* Intro & Explanation (collapsible sections) */}
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Introduction ({intro.length} paragraphs)</summary>
            <div className="space-y-2 pt-2">
              {intro.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Textarea value={p} onChange={(e) => { const n = [...intro]; n[i] = e.target.value; setIntro(n); }} rows={2} />
                  <Button variant="ghost" size="icon" className="shrink-0 self-start" onClick={() => setIntro(intro.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setIntro([...intro, ""])} className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </details>

          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Explanation ({explanation.length} paragraphs)</summary>
            <div className="space-y-2 pt-2">
              {explanation.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Textarea value={p} onChange={(e) => { const n = [...explanation]; n[i] = e.target.value; setExplanation(n); }} rows={2} />
                  <Button variant="ghost" size="icon" className="shrink-0 self-start" onClick={() => setExplanation(explanation.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setExplanation([...explanation, ""])} className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </details>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
