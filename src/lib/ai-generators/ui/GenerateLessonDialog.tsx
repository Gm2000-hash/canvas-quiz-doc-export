/**
 * Portable starter dialog for the lesson plan generator.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { generateLessons } from "../client";
import type { AiPreferences, GenerateLessonsOutput, SupabaseFunctionsClient } from "../index";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseFunctionsClient;
  defaults?: {
    unitTitle?: string;
    topic?: string;
    discipline?: string;
    gradeLevel?: string;
    numLessons?: number;
  };
  aiPreferences?: AiPreferences;
  onGenerated: (result: GenerateLessonsOutput) => void;
  onError?: (err: Error) => void;
}

export function GenerateLessonDialog({
  open, onOpenChange, supabase, defaults, aiPreferences, onGenerated, onError,
}: Props) {
  const [unitTitle, setUnitTitle] = useState(defaults?.unitTitle ?? "");
  const [topic, setTopic] = useState(defaults?.topic ?? "");
  const [discipline, setDiscipline] = useState(defaults?.discipline ?? "");
  const [gradeLevel, setGradeLevel] = useState(defaults?.gradeLevel ?? "middle school");
  const [numLessons, setNumLessons] = useState(defaults?.numLessons ?? 3);
  const [additionalContext, setAdditionalContext] = useState("");
  const [focusConcepts, setFocusConcepts] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      const result = await generateLessons(supabase, {
        unitTitle, topic, discipline, gradeLevel, numLessons,
        additionalContext: additionalContext || undefined,
        focusConcepts: focusConcepts || undefined,
        ai_preferences: aiPreferences,
      });
      onGenerated(result);
      onOpenChange(false);
    } catch (e) {
      onError?.(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = unitTitle.trim() && topic.trim() && numLessons > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Generate Lesson Plans
          </DialogTitle>
          <DialogDescription>
            Fully scripted, UDL-aligned 50-minute lesson plans. Each lesson includes a phased lesson flow with
            What / How (UDL) / Why / Formative Check labels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Unit title *</Label>
            <Input value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} placeholder="e.g. Cells & Heredity" />
          </div>
          <div className="space-y-1.5">
            <Label>Topic / focus *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Mitosis" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Discipline</Label>
              <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Science" />
            </div>
            <div className="space-y-1.5">
              <Label>Grade level</Label>
              <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label># Lessons</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={numLessons}
                onChange={(e) => setNumLessons(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Focus concepts (optional)</Label>
            <Textarea
              rows={2}
              value={focusConcepts}
              onChange={(e) => setFocusConcepts(e.target.value)}
              placeholder="Key terms / concepts to anchor the lesson around"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Additional context (optional)</Label>
            <Textarea
              rows={2}
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Special accommodations, available materials, etc."
            />
          </div>

          <Button className="w-full gap-2" disabled={!canSubmit || busy} onClick={handle}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating..." : `Generate ${numLessons} lesson${numLessons === 1 ? "" : "s"}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">May take 30–60 seconds.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
