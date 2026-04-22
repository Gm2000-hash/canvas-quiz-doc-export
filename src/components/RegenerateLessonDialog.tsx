import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, RefreshCw, BookOpen, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { syncDisciplineToLibrary } from "@/lib/content-generator";
import { AiEngineSelect } from "@/components/AiEngineSelect";
import { useAiPreferences } from "@/hooks/useAiPreferences";

interface LessonData {
  id: string;
  unit_id: string | null;
  title: string;
  objectives: string;
  activities: { name: string; duration: number; description: string }[];
  materials: string;
  assessment: string;
  differentiation: string;
  notes: string;
  vocabulary: { term: string; definition: string }[];
  resources: { title: string; url: string; type: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonData;
  discipline: string;
  gradeLevel: string;
  unitTitle: string;
  onRegenerated: () => void;
}

export function RegenerateLessonDialog({ open, onOpenChange, lesson, discipline, gradeLevel, unitTitle, onRegenerated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [additionalContext, setAdditionalContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [regenerateReading, setRegenerateReading] = useState(false);
  const [modelOverride, setModelOverride] = useState<string>("");

  const handleRegenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setProgress(10);
    setStatusText("Regenerating lesson plan...");

    try {
      // Call the existing generate-lesson-plans function for 1 lesson
      const { data, error } = await supabase.functions.invoke("generate-lesson-plans", {
        body: {
          unitTitle,
          discipline,
          gradeLevel,
          topic: lesson.title,
          numLessons: 1,
          additionalContext: `Regenerate this specific lesson: "${lesson.title}". 
Current objectives: ${lesson.objectives}
${additionalContext ? `Teacher instructions: ${additionalContext}` : ""}
Improve and fill in any missing information. Keep the same general topic but make it better.`,
          ...(modelOverride ? { model_override: modelOverride } : {}),
        },
      });

      setProgress(40);

      if (error) {
        // Try to extract error message from response context
        let errorMsg = error.message;
        try {
          if (error.context?.body) {
            const body = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
            if (body?.error) errorMsg = body.error;
          }
        } catch {}
        throw new Error(errorMsg);
      }
      if (!data?.lessons?.[0]) throw new Error("Invalid response from AI");

      const newLesson = data.lessons[0];

      // Update the lesson in the database
      setStatusText("Saving updated lesson...");
      const updateData: Record<string, any> = {
        title: newLesson.title || lesson.title,
        objectives: newLesson.objectives || lesson.objectives,
        activities: newLesson.activities || lesson.activities,
        materials: newLesson.materials || lesson.materials,
        assessment: newLesson.assessment || lesson.assessment,
        differentiation: newLesson.differentiation || lesson.differentiation,
        notes: newLesson.notes || lesson.notes,
        vocabulary: newLesson.vocabulary || lesson.vocabulary,
        resources: newLesson.resources || lesson.resources,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await (supabase.from("lesson_plans") as any)
        .update(updateData)
        .eq("id", lesson.id);

      if (updateError) throw updateError;

      setProgress(60);

      // Update standards
      setStatusText("Updating NGSS standards...");
      if (newLesson.standards?.length > 0) {
        // Delete existing standards and insert new ones
        await supabase.from("lesson_plan_standards").delete().eq("lesson_plan_id", lesson.id);
        const stds = newLesson.standards.map((s: any) => ({
          lesson_plan_id: lesson.id,
          ngss_code: s.code || s.ngss_code,
          ngss_description: s.description || s.ngss_description,
        }));
        await supabase.from("lesson_plan_standards").insert(stds);
      }

      setProgress(70);

      // Also run the standards tagger for extra accuracy
      setStatusText("Verifying standards alignment...");
      let detectedStandardCode = "";
      try {
        const allStandards = Object.values(ALL_SUBSTANDARDS).flat().map(s => ({
          code: s.code,
          description: s.description,
        }));

        const { data: tagData } = await supabase.functions.invoke("standards-tagger", {
          body: {
            questions: [{ id: lesson.id, question_text: `${newLesson.title}\n\nObjectives: ${newLesson.objectives}` }],
            framework: "NGSS",
            standardsList: allStandards,
          },
        });

        if (tagData?.results?.[0]?.standards?.length > 0) {
          detectedStandardCode = tagData.results[0].standards[0].code || "";
          const { data: existing } = await supabase
            .from("lesson_plan_standards")
            .select("ngss_code")
            .eq("lesson_plan_id", lesson.id);

          const existingCodes = new Set((existing || []).map((e: any) => e.ngss_code));
          const newStds = tagData.results[0].standards
            .filter((s: any) => !existingCodes.has(s.code))
            .map((s: any) => ({
              lesson_plan_id: lesson.id,
              ngss_code: s.code,
              ngss_description: s.description,
            }));

          if (newStds.length > 0) {
            await supabase.from("lesson_plan_standards").insert(newStds);
          }
        }
      } catch (tagErr) {
        console.warn("Standards verification failed (non-fatal):", tagErr);
      }

      setProgress(85);

      // Regenerate reading if requested
      if (regenerateReading && lesson.unit_id) {
        setStatusText("Regenerating curriculum reading...");
        try {
          const { data: readingData } = await supabase.functions.invoke("generate-curriculum-reading", {
            body: {
              subject_area: newLesson.title || lesson.title,
              objectives: newLesson.objectives || lesson.objectives,
              format: "textbook",
              ngss_standard: detectedStandardCode || undefined,
            },
          });

          if (readingData?.lesson) {
            const reading = readingData.lesson;
            // Find existing curriculum lesson for this unit+title or create new
            const { data: existingReading } = await supabase
              .from("curriculum_lessons")
              .select("id")
              .eq("unit_id", lesson.unit_id)
              .ilike("title", `%${lesson.title}%`)
              .limit(1);

            if (existingReading?.[0]) {
              await (supabase.from("curriculum_lessons") as any).update({
                title: reading.title || newLesson.title,
                objectives: reading.objectives || [],
                intro: reading.intro || [],
                explanation: reading.explanation || [],
                key_terms: reading.key_terms || [],
                reading_title: reading.reading?.reading_title || null,
                reading_paragraphs: reading.reading?.reading_paragraphs || [],
                updated_at: new Date().toISOString(),
              }).eq("id", existingReading[0].id);
            } else {
              const { count } = await supabase
                .from("curriculum_lessons")
                .select("id", { count: "exact", head: true })
                .eq("unit_id", lesson.unit_id);

              await supabase.from("curriculum_lessons").insert({
                unit_id: lesson.unit_id,
                user_id: user.id,
                title: reading.title || newLesson.title,
                sort_order: count || 0,
                objectives: reading.objectives || [],
                intro: reading.intro || [],
                explanation: reading.explanation || [],
                key_terms: reading.key_terms || [],
                reading_title: reading.reading?.reading_title || null,
                reading_paragraphs: reading.reading?.reading_paragraphs || [],
              } as any);
            }
          }
        } catch (readErr) {
          console.warn("Reading regeneration failed (non-fatal):", readErr);
        }
      }

      // Sync to reading library after generating/regenerating readings
      if (regenerateReading && discipline) {
        await syncDisciplineToLibrary(user.id, discipline);
      }

      setProgress(100);
      setStatusText("Done!");
      toast({ title: "Lesson regenerated successfully!" });
      onRegenerated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Regeneration error:", err);
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgress(0);
      setStatusText("");
    }
  };

  // Identify what's missing
  const missingItems: string[] = [];
  if (!lesson.vocabulary?.length) missingItems.push("vocabulary");
  if (!lesson.resources?.length) missingItems.push("resources");
  if (!lesson.assessment?.trim()) missingItems.push("assessment");
  if (!lesson.differentiation?.trim()) missingItems.push("differentiation");
  if (!lesson.notes?.trim()) missingItems.push("teacher notes");
  if (!lesson.materials?.trim()) missingItems.push("materials");
  if ((lesson.activities?.length || 0) < 4) missingItems.push("activities (< 4)");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> Regenerate Lesson
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl text-sm bg-info text-primary-foreground">
            <p className="text-destructive-foreground">
              AI will regenerate <span className="font-medium text-primary-foreground">"{lesson.title}"</span> with updated content, NGSS standards, and vocabulary.
            </p>
          </div>

          {missingItems.length > 0 && (
            <div className="p-3 rounded-xl bg-destructive/10 text-sm">
              <p className="text-destructive font-medium text-xs mb-1">Missing or incomplete:</p>
              <p className="text-destructive/80 text-xs">{missingItems.join(", ")}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Additional Instructions (optional)</Label>
            <Textarea
              placeholder="e.g. Add more hands-on activities, focus on vocabulary, include a lab..."
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <Label className="text-sm">Update NGSS standards</Label>
              </div>
              <span className="text-xs text-muted-foreground bg-primary/10 rounded-full px-2 py-0.5">Always on</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <Label htmlFor="regenReading" className="text-sm">Regenerate curriculum reading</Label>
              </div>
              <Switch id="regenReading" checked={regenerateReading} onCheckedChange={setRegenerateReading} />
            </div>
          </div>

          <AiEngineSelect value={modelOverride} onChange={setModelOverride} tier="default" />

          {generating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{statusText}</p>
            </div>
          )}

          <Button onClick={handleRegenerate} className="w-full rounded-xl gap-2 bg-info hover:bg-info/90" disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Regenerating..." : "Regenerate Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
