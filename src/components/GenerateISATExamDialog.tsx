import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, FileText, Atom, Leaf, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const GRADE_OPTIONS = [
  { value: "6th", label: "6th Grade — Physical Science", icon: Atom, standards: "MS-PS1 through MS-PS4" },
  { value: "7th", label: "7th Grade — Life Science", icon: Leaf, standards: "MS-LS1 through MS-LS4" },
  { value: "8th", label: "8th Grade — Earth & Space Science", icon: Globe, standards: "MS-ESS1 through MS-ESS3" },
];

export default function GenerateISATExamDialog({ open, onOpenChange, onComplete }: Props) {
  const [gradeLevel, setGradeLevel] = useState("6th");
  const [questionCount, setQuestionCount] = useState(35);
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);

  const selectedGrade = GRADE_OPTIONS.find(g => g.value === gradeLevel)!;

  const handleGenerate = async () => {
    setGenerating(true);
    setDone(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-isat-exam", {
        body: { grade_level: gradeLevel, question_count: questionCount, title: title || undefined },
      });

      if (error) throw new Error(error.message || "Generation failed");
      if (data?.error) throw new Error(data.error);

      const questions = data?.questions || [];
      if (questions.length === 0) throw new Error("No questions generated");

      // Calculate total points
      const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points_possible || 1), 0);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const examTitle = title || `ISAT Practice Exam — ${selectedGrade.label}`;

      const { data: inserted, error: insertError } = await supabase
        .from("isat_exams")
        .insert({
          user_id: user.id,
          title: examTitle,
          grade_level: gradeLevel,
          question_count: questions.length,
          questions: questions as any,
          total_points: totalPoints,
        } as any)
        .select("id")
        .single();

      if (insertError) throw insertError;

      setExamId((inserted as any)?.id || null);
      setDone(true);
      toast.success(`ISAT exam created with ${questions.length} questions!`);
      onComplete();
    } catch (e: any) {
      console.error("ISAT exam generation error:", e);
      toast.error(e.message || "Failed to generate exam");
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setDone(false);
    setExamId(null);
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!generating) { onOpenChange(v); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate ISAT Practice Exam
          </DialogTitle>
          <DialogDescription>
            Create a realistic practice exam matching the ISAT End-of-Course Assessment format with diverse question types.
          </DialogDescription>
        </DialogHeader>

        {!generating && !done ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Exam Title (optional)</Label>
              <Input
                placeholder={`ISAT Practice Exam — ${selectedGrade.label}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Grade Level & Subject</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Standards covered: {selectedGrade.standards}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Number of Questions</Label>
              <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 questions (short practice)</SelectItem>
                  <SelectItem value="30">30 questions</SelectItem>
                  <SelectItem value="35">35 questions (recommended)</SelectItem>
                  <SelectItem value="45">45 questions (full length)</SelectItem>
                  <SelectItem value="50">50 questions (extended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
              <p className="text-sm font-medium">Question Types Included:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Multiple Choice",
                  "Select All That Apply",
                  "Drag & Drop",
                  "Data Analysis",
                  "Modeling & Diagrams",
                  "Scenario-Based",
                  "Constructed Response",
                  "Investigation Design",
                  "Concept Mapping",
                ].map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                DOK levels 1–4 distributed realistically. All standards covered.
              </p>
            </div>

            <Button onClick={handleGenerate} className="w-full gap-2" size="lg">
              <Sparkles className="h-4 w-4" />
              Generate {questionCount}-Question ISAT Exam
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This may take 30-60 seconds as AI generates a comprehensive exam.
            </p>
          </div>
        ) : generating ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your {questionCount}-question ISAT practice exam...
              </p>
              <p className="text-xs text-muted-foreground">
                Creating diverse question types across all {selectedGrade.label} standards
              </p>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        ) : done ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-sm font-medium">ISAT Practice Exam Created!</p>
              <p className="text-xs text-muted-foreground">
                Your exam is ready. You can take it from the ISAT Exams tab.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
                Close
              </Button>
              <Button onClick={reset}>Generate Another</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
