import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, BookOpen, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { syncDisciplineToLibrary } from "@/lib/content-generator";

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

export function GenerateLessonDialog({ open, onOpenChange, unitId, unitTitle, discipline, gradeLevel, existingLessonCount, onGenerated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [numLessons, setNumLessons] = useState(5);
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Generating lesson plans...");
  const [generateReadings, setGenerateReadings] = useState(false);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setProgress(10);
    setStatusText("Generating lesson plans...");

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

      setProgress(40);

      if (error) throw error;
      if (!data?.lessons || !Array.isArray(data.lessons)) throw new Error("Invalid response from AI");

      const insertedLessons: { id: string; title: string; objectives: string; standardCode: string }[] = [];

      // Insert lessons into database
      setStatusText("Saving lesson plans...");
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
          sort_order: existingLessonCount + i,
        } as any).select().single();

        if (insertError) throw insertError;

        if (inserted) {
          insertedLessons.push({ id: inserted.id, title: lesson.title, objectives: lesson.objectives || "", standardCode: lesson.standards?.[0]?.code || lesson.standards?.[0]?.ngss_code || "" });

          // Insert AI-provided standards if any
          if (lesson.standards && Array.isArray(lesson.standards)) {
            const stds = lesson.standards.map((s: any) => ({
              lesson_plan_id: inserted.id,
              ngss_code: s.code || s.ngss_code,
              ngss_description: s.description || s.ngss_description,
            }));
            if (stds.length > 0) {
              await supabase.from("lesson_plan_standards").insert(stds);
            }
          }
        }

        setProgress(40 + ((i + 1) / data.lessons.length) * 20);
      }

      // Auto-tag NGSS standards for lessons that don't have them
      setStatusText("Auto-identifying NGSS standards...");
      setProgress(65);
      try {
        // Build flat list of all NGSS standards for the tagger
        const allStandards = Object.values(ALL_SUBSTANDARDS).flat().map(s => ({
          code: s.code,
          description: s.description,
        }));

        // Prepare questions-like objects for the tagger
        const questionsForTagger = insertedLessons.map(l => ({
          id: l.id,
          question_text: `${l.title}\n\nObjectives: ${l.objectives}`,
        }));

        const { data: tagData } = await supabase.functions.invoke("standards-tagger", {
          body: {
            questions: questionsForTagger,
            framework: "NGSS",
            standardsList: allStandards,
          },
        });

        if (tagData?.results) {
          for (const result of tagData.results) {
            if (result.standards?.length > 0) {
              // Check which standards already exist for this lesson
              const { data: existing } = await supabase
                .from("lesson_plan_standards")
                .select("ngss_code")
                .eq("lesson_plan_id", result.questionId);

              const existingCodes = new Set((existing || []).map((e: any) => e.ngss_code));
              const newStds = result.standards
                .filter((s: any) => !existingCodes.has(s.code))
                .map((s: any) => ({
                  lesson_plan_id: result.questionId,
                  ngss_code: s.code,
                  ngss_description: s.description,
                }));

              if (newStds.length > 0) {
                await supabase.from("lesson_plan_standards").insert(newStds);
              }
            }
          }
        }
      } catch (tagErr) {
        console.warn("Standards auto-tagging failed (non-fatal):", tagErr);
      }

      setProgress(80);

      // Generate curriculum readings if requested
      if (generateReadings) {
        setStatusText("Generating curriculum readings...");
        
        // Check existing curriculum lessons count for sort_order
        const { count: existingCurrCount } = await supabase
          .from("curriculum_lessons")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId);

        let currSortOrder = existingCurrCount || 0;

        for (let i = 0; i < insertedLessons.length; i++) {
          const lesson = insertedLessons[i];
          setStatusText(`Generating reading ${i + 1} of ${insertedLessons.length}...`);
          
          try {
            const { data: readingData, error: readingError } = await supabase.functions.invoke("generate-curriculum-reading", {
              body: {
                subject_area: lesson.title,
                objectives: lesson.objectives,
                format: "textbook",
                ngss_standard: lesson.standardCode || undefined,
              },
            });

            if (readingError) throw readingError;
            if (!readingData?.lesson) throw new Error("No reading data returned");

            const reading = readingData.lesson;

            await supabase.from("curriculum_lessons").insert({
              unit_id: unitId,
              user_id: user.id,
              title: reading.title || lesson.title,
              sort_order: currSortOrder++,
              objectives: reading.objectives || lesson.objectives.split('\n').filter((o: string) => o.trim()),
              intro: reading.intro || [],
              explanation: reading.explanation || [],
              key_terms: reading.key_terms || [],
              reading_title: reading.reading?.reading_title || null,
              reading_paragraphs: reading.reading?.reading_paragraphs || [],
            } as any);
          } catch (readErr) {
            console.warn(`Failed to generate reading for "${lesson.title}":`, readErr);
          }

          setProgress(80 + ((i + 1) / insertedLessons.length) * 18);
        }


        // Sync to reading library
        await syncDisciplineToLibrary(user.id, discipline);
      }

      setProgress(100);
      setStatusText("Done!");
      const readingMsg = generateReadings ? ` with ${insertedLessons.length} readings` : "";
      toast({ title: `Generated ${data.lessons.length} lesson plans${readingMsg}!` });
      onGenerated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgress(0);
      setStatusText("Generating lesson plans...");
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

          {/* Options */}
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <Label htmlFor="autoNgss" className="text-sm">Auto-identify NGSS standards</Label>
              </div>
              <span className="text-xs text-muted-foreground bg-primary/10 rounded-full px-2 py-0.5">Always on</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <Label htmlFor="genReadings" className="text-sm">Generate curriculum readings</Label>
              </div>
              <Switch id="genReadings" checked={generateReadings} onCheckedChange={setGenerateReadings} />
            </div>
            {generateReadings && (
              <p className="text-xs text-muted-foreground ml-6">
                A textbook-style reading with key terms will be created for each lesson in the Curriculum Editor.
              </p>
            )}
          </div>

          {generating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{statusText}</p>
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
