import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurriculumLessons, type CurriculumLesson } from "@/hooks/useCurriculum";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, GripVertical, Copy,
  BookOpen, Sparkles, Loader2, Eye, RotateCcw, Save, X, FileDown, Library, ExternalLink, Puzzle, Download, Tag,
} from "lucide-react";
import { EmbedActivityPicker, type EmbeddedActivity } from "@/components/EmbedActivityPicker";
import { ACTIVITY_TYPES } from "@/lib/h5p-types";
import { exportActivityAsH5P } from "@/lib/export-h5p";
import type { ActivityType, ActivityContent } from "@/lib/h5p-types";
import { useNavigate } from "react-router-dom";
import { exportCurriculumUnitToDocx, exportCurriculumLessonToDocx } from "@/lib/export-curriculum-docx";
import { LessonStandardsPicker } from "@/components/LessonStandardsPicker";
import { toast as sonnerToast } from "sonner";

/** Convert a string[] (from DB) into a single HTML string for TipTap */
function arrayToHtml(arr: string[]): string {
  if (!arr || arr.length === 0) return "";
  return arr.map(p => {
    // If already contains HTML tags, use as-is
    if (/<[a-z][\s\S]*>/i.test(p)) return p;
    return `<p>${p}</p>`;
  }).join("");
}

/** Convert HTML back to a string[] for DB storage */
function htmlToArray(html: string): string[] {
  if (!html || html === "<p></p>") return [];
  return [html];
}

/** Strip HTML tags for plain-text extraction (AI tagging) */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface CurriculumEditorProps {
  units: { id: string; title: string; discipline: string; grade_level: string; description: string }[];
  onRefreshUnits: () => void;
}

export const CurriculumEditor = ({ units, onRefreshUnits }: CurriculumEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingLesson, setEditingLesson] = useState<CurriculumLesson | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [genForm, setGenForm] = useState({ subject_area: "", objectives: "", key_terms: "", format: "textbook" as "textbook" | "scripted" | "both" });
  const [genDialogUnit, setGenDialogUnit] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const SCIENCE_DISCIPLINES = ["Life Science", "Physical Science", "Earth & Space Science"];

  const handleSyncToLibrary = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      for (const discipline of SCIENCE_DISCIPLINES) {
        const disciplineUnits = units.filter(u => u.discipline === discipline);
        if (disciplineUnits.length === 0) continue;

        // Check if a library book already exists for this discipline
        const { data: existing } = await supabase
          .from("library_books")
          .select("id")
          .eq("source_discipline", discipline)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          // Update the existing entry (touch updated_at so it shows as fresh)
          await supabase
            .from("library_books")
            .update({ updated_at: new Date().toISOString(), is_published: true } as any)
            .eq("id", existing.id);
        } else {
          // Create a new library book entry
          await supabase
            .from("library_books")
            .insert({
              user_id: user.id,
              title: `${discipline} Readings`,
              file_path: `curriculum/${discipline.toLowerCase().replace(/\s+/g, "-")}`,
              file_size: 0,
              is_published: true,
              source_discipline: discipline,
            } as any);
        }
      }
      sonnerToast.success("Curriculum readings synced to library!");
    } catch (err: any) {
      sonnerToast.error(err.message || "Failed to sync to library");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 border-r border-border pr-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Curriculum Editor</span>
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          disabled={syncing || units.length === 0}
          onClick={handleSyncToLibrary}
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Library className="h-3.5 w-3.5" />}
          {syncing ? "Syncing…" : "Sync to Library"}
        </Button>
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
              refreshKey={refreshKey}
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
                  reading_title: lesson.reading?.reading_title || null,
                  reading_paragraphs: lesson.reading?.reading_paragraphs || [],
                } as any);

                sonnerToast.success("Lesson generated and saved!");
                setGenDialogUnit(null);
                setRefreshKey(k => k + 1);
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
  refreshKey,
}: {
  unit: { id: string; title: string; discipline: string; grade_level: string };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEditLesson: (lesson: CurriculumLesson) => void;
  onOpenGenerate: () => void;
  refreshKey: number;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lessons, loading, createLesson, deleteLesson, reorderLessons } = useCurriculumLessons(isExpanded ? unit.id : undefined, refreshKey);
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
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground bg-muted/20 border-b border-border/50">
            <BookOpen className="h-3 w-3" />
            <span>Curriculum</span>
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() => navigate(`/units/${unit.id}`)}
              className="font-medium text-primary hover:underline transition-colors"
            >
              {unit.title}
            </button>
          </div>
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
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/units/${unit.id}`)}
                      title="View Lesson Plans"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
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
                        await createLesson({
                          unit_id: unit.id,
                          title: `${lesson.title} (Copy)`,
                          sort_order: lessons.length,
                          objectives: lesson.objectives,
                          intro: lesson.intro,
                          explanation: lesson.explanation,
                          key_terms: lesson.key_terms,
                          reading_title: lesson.reading_title,
                          reading_paragraphs: lesson.reading_paragraphs,
                          interactive_activities: lesson.interactive_activities as any,
                          image_url: lesson.image_url,
                        });
                        sonnerToast.success("Lesson duplicated");
                      }}
                      title="Duplicate"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
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
  const [introHtml, setIntroHtml] = useState(() => arrayToHtml(lesson.intro || []));
  const [explanationHtml, setExplanationHtml] = useState(() => arrayToHtml(lesson.explanation || []));
  const [readingTitle, setReadingTitle] = useState(lesson.reading_title || "");
  const [readingHtml, setReadingHtml] = useState(() => arrayToHtml(lesson.reading_paragraphs || []));
  const [interactiveActivities, setInteractiveActivities] = useState<{ activity_id: string; title: string; activity_type: string }[]>(
    (lesson.interactive_activities as any[]) || []
  );
  const [embedPickerOpen, setEmbedPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Standards state
  const [standards, setStandards] = useState<{ id: string; ngss_code: string; ngss_description: string; matched_terms: string[] }[]>([]);
  const [standardsPickerOpen, setStandardsPickerOpen] = useState(false);
  const [autoTagging, setAutoTagging] = useState(false);

  // Load existing standards
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("curriculum_lesson_standards")
        .select("*")
        .eq("lesson_id", lesson.id);
      if (data) setStandards(data);
    };
    load();
  }, [lesson.id]);

  const handleRemoveStandard = async (stdId: string) => {
    await supabase.from("curriculum_lesson_standards").delete().eq("id", stdId);
    setStandards(s => s.filter(x => x.id !== stdId));
  };

  const handlePickerSave = async (selected: { code: string; description: string }[]) => {
    // Delete all existing, re-insert
    await supabase.from("curriculum_lesson_standards").delete().eq("lesson_id", lesson.id);
    if (selected.length > 0) {
      const rows = selected.map(s => ({
        lesson_id: lesson.id,
        ngss_code: s.code,
        ngss_description: s.description,
        matched_terms: [],
      }));
      await supabase.from("curriculum_lesson_standards").insert(rows);
    }
    // Reload
    const { data } = await supabase
      .from("curriculum_lesson_standards")
      .select("*")
      .eq("lesson_id", lesson.id);
    if (data) setStandards(data);
    sonnerToast.success("Standards updated");
  };

  const handleAutoTag = async () => {
    // Build a text blob from lesson content
    const parts: string[] = [title];
    objectives.forEach(o => parts.push(o));
    keyTerms.forEach(kt => { parts.push(kt.term); parts.push(kt.definition); });
    parts.push(stripHtml(introHtml));
    parts.push(stripHtml(explanationHtml));
    parts.push(stripHtml(readingHtml));
    const text = parts.filter(Boolean).join(" ").substring(0, 4000);
    if (text.length < 20) {
      sonnerToast.error("Not enough content to auto-tag");
      return;
    }

    setAutoTagging(true);
    try {
      const { data, error } = await supabase.functions.invoke("standards-tagger", {
        body: {
          questions: [{ id: 1, question_text: text }],
          framework: "ngss",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const tags = data?.tags?.[0]?.standards || [];
      if (tags.length === 0) {
        sonnerToast.info("No standards matched this content");
        setAutoTagging(false);
        return;
      }

      // Merge with existing (avoid duplicates)
      const existingCodes = new Set(standards.map(s => s.ngss_code));
      const newTags = tags.filter((t: any) => !existingCodes.has(t.code));

      if (newTags.length > 0) {
        const rows = newTags.map((t: any) => ({
          lesson_id: lesson.id,
          ngss_code: t.code,
          ngss_description: t.description,
          matched_terms: t.matched_terms || [],
        }));
        await supabase.from("curriculum_lesson_standards").insert(rows);
        // Reload
        const { data: refreshed } = await supabase
          .from("curriculum_lesson_standards")
          .select("*")
          .eq("lesson_id", lesson.id);
        if (refreshed) setStandards(refreshed);
      }
      sonnerToast.success(`${newTags.length} new standard(s) tagged`);
    } catch (err: any) {
      sonnerToast.error(err.message || "Auto-tagging failed");
    } finally {
      setAutoTagging(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("curriculum_lessons")
      .update({
        title,
        objectives: objectives as any,
        key_terms: keyTerms as any,
        intro: htmlToArray(introHtml) as any,
        explanation: htmlToArray(explanationHtml) as any,
        reading_title: readingTitle || null,
        reading_paragraphs: htmlToArray(readingHtml) as any,
        interactive_activities: interactiveActivities as any,
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

          {/* Standards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" /> Standards
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={handleAutoTag}
                  disabled={autoTagging}
                >
                  {autoTagging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Tag
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={() => setStandardsPickerOpen(true)}
                >
                  <Plus className="h-3 w-3" /> Browse
                </Button>
              </div>
            </div>
            {standards.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {standards.map(s => (
                  <Badge key={s.id} variant="secondary" className="gap-1 text-xs pr-1">
                    <span className="font-semibold">{s.ngss_code}</span>
                    <button
                      onClick={() => handleRemoveStandard(s.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No standards tagged yet. Use AI Tag or Browse to add.</p>
            )}
            {standards.some(s => s.matched_terms?.length > 0) && (
              <div className="text-[11px] text-muted-foreground italic">
                Matched: {standards.flatMap(s => s.matched_terms).filter(Boolean).slice(0, 8).join(", ")}
              </div>
            )}
            <LessonStandardsPicker
              open={standardsPickerOpen}
              onOpenChange={setStandardsPickerOpen}
              selected={standards.map(s => ({ code: s.ngss_code, description: s.ngss_description }))}
              onSave={handlePickerSave}
            />
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
            <Label>Reading Content</Label>
            <RichTextEditor
              content={readingHtml}
              onChange={setReadingHtml}
              placeholder="Write the reading passage content..."
              compact
            />
          </div>

          {/* Interactive Activities */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5"><Puzzle className="h-3.5 w-3.5 text-primary" /> Interactive Activities</Label>
              <span className="text-xs text-muted-foreground">{interactiveActivities.length} embedded</span>
            </div>
            {interactiveActivities.map((ea, idx) => {
              const typeInfo = ACTIVITY_TYPES.find(t => t.type === ea.activity_type);
              return (
                <div key={ea.activity_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50">
                  <Puzzle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">{ea.title}</span>
                  <span className="text-[10px] text-muted-foreground">{typeInfo?.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Export H5P"
                    onClick={async () => {
                      const { data } = await supabase.from("h5p_activities").select("content, activity_type, title").eq("id", ea.activity_id).single();
                      if (data) {
                        await exportActivityAsH5P((data as any).title, (data as any).activity_type as ActivityType, (data as any).content as ActivityContent);
                        sonnerToast.success("H5P file downloaded");
                      }
                    }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70" onClick={() => setInteractiveActivities(interactiveActivities.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setEmbedPickerOpen(true)}>
              <Plus className="h-3 w-3" /> Embed Activity
            </Button>
            <EmbedActivityPicker
              open={embedPickerOpen}
              onOpenChange={setEmbedPickerOpen}
              excludeIds={interactiveActivities.map(e => e.activity_id)}
              onSelect={(a) => setInteractiveActivities([...interactiveActivities, { activity_id: a.id, title: a.title, activity_type: a.activity_type }])}
            />
          </div>

          {/* Introduction */}
          <div className="space-y-2">
            <Label>Introduction</Label>
            <RichTextEditor
              content={introHtml}
              onChange={setIntroHtml}
              placeholder="Write the lesson introduction..."
              compact
            />
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Explanation</Label>
            <RichTextEditor
              content={explanationHtml}
              onChange={setExplanationHtml}
              placeholder="Write the lesson explanation..."
              compact
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}