import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitTitle: string;
  discipline: string;
  gradeLevel: string;
  existingLessonCount: number;
  onGenerated: () => void;
}

export function GenerateLessonDialog({ open, onOpenChange, unitId, unitTitle, discipline, gradeLevel, onGenerated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [numLessons, setNumLessons] = useState(5);
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setProgress(10);

    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-plans", {
        body: {
          unitTitle,
          discipline,
          gradeLevel,
          topic: topic || unitTitle,
          numLessons,
          additionalContext,
        },
      });

      setProgress(60);

      if (error) throw error;
      if (!data?.lessons || !Array.isArray(data.lessons)) throw new Error("Invalid response from AI");

      // Insert lessons into database
      for (let i = 0; i < data.lessons.length; i++) {
        const lesson = data.lessons[i];
        const { data: inserted, error: insertError } = await supabase.from("lesson_plans").insert({
          user_id: user.id,
          unit_id: unitId,
          title: lesson.title,
          lesson_date: lesson.lesson_date || null,
          duration_minutes: lesson.duration_minutes || 50,
          objectives: lesson.objectives || "",
          activities: lesson.activities || [],
          materials: lesson.materials || "",
          assessment: lesson.assessment || "",
          differentiation: lesson.differentiation || "",
          notes: lesson.notes || "",
          vocabulary: lesson.vocabulary || [],
          resources: lesson.resources || [],
          sort_order: i,
        } as any).select().single();

        if (insertError) throw insertError;

        // Insert standards if provided
        if (inserted && lesson.standards && Array.isArray(lesson.standards)) {
          const stds = lesson.standards.map((s: any) => ({
            lesson_plan_id: inserted.id,
            ngss_code: s.code || s.ngss_code,
            ngss_description: s.description || s.ngss_description,
          }));
          if (stds.length > 0) {
            await supabase.from("lesson_plan_standards").insert(stds);
          }
        }

        setProgress(60 + ((i + 1) / data.lessons.length) * 35);
      }

      setProgress(100);
      toast({ title: `Generated ${data.lessons.length} lesson plans!` });
      onGenerated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Lesson Generator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-accent/50 text-sm">
            <p className="text-muted-foreground">Generate NGSS-aligned lesson plans for <span className="font-medium text-foreground">{unitTitle}</span></p>
          </div>
          <div className="space-y-2">
            <Label>Topic / Focus Area</Label>
            <Input placeholder={unitTitle} value={topic} onChange={e => setTopic(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Number of Lessons</Label>
            <Input type="number" min={1} max={20} value={numLessons} onChange={e => setNumLessons(parseInt(e.target.value) || 5)} />
          </div>
          <div className="space-y-2">
            <Label>Additional Instructions (optional)</Label>
            <Textarea
              placeholder="e.g. Include lab activities, focus on vocabulary, etc."
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>
          {generating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">Generating lesson plans...</p>
            </div>
          )}
          <Button onClick={handleGenerate} className="w-full rounded-xl gap-2" disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating..." : `Generate ${numLessons} Lessons`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
