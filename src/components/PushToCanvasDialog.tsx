import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { getCourses, createCanvasQuiz, createCanvasQuizQuestion, type CanvasConfig, type Course } from "@/lib/canvas-api";
import { mapQuestionToCanvas } from "@/lib/canvas-question-mapper";
import { saveLastCanvasPush, type CanvasPushTarget } from "@/lib/canvas-last-push";
import type { QuestionBankItem } from "@/lib/question-bank";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle, Info } from "lucide-react";

export interface PushQuizDefaults {
  title?: string;
  /** Rendered as the Canvas quiz description / instructions. */
  description?: string;
  instructions?: string;
  timeLimitMinutes?: number | null;
  pointsPerQuestion?: number | null;
  shuffleAnswers?: boolean;
  showOneAtATime?: boolean;
}

interface PushToCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuestionBankItem[];
  config: CanvasConfig;
  defaults?: PushQuizDefaults;
}

export default function PushToCanvasDialog({ open, onOpenChange, questions, config, defaults }: PushToCanvasDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [quizTitle, setQuizTitle] = useState(defaults?.title || "Quiz from Question Bank");
  const [quizType, setQuizType] = useState<string>("assignment");
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(defaults?.shuffleAnswers ?? true);
  const [oneAtATime, setOneAtATime] = useState(defaults?.showOneAtATime ?? false);
  const [pushing, setPushing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open && courses.length === 0) {
      setLoadingCourses(true);
      getCourses(config)
        .then(setCourses)
        .catch(() => toast.error("Failed to load Canvas courses"))
        .finally(() => setLoadingCourses(false));
    }
    if (open) {
      setDone(false);
      setProgress(0);
      if (defaults?.title) setQuizTitle(defaults.title);
      if (defaults?.shuffleAnswers !== undefined) setShuffleAnswers(defaults.shuffleAnswers);
      if (defaults?.showOneAtATime !== undefined) setOneAtATime(defaults.showOneAtATime);
    }
  }, [open, config]);

  // Pre-compute the Canvas payloads so conversion notes can be shown up front.
  const mapped = useMemo(
    () =>
      questions.map((q, i) =>
        mapQuestionToCanvas(q, {
          position: i + 1,
          pointsOverride: defaults?.pointsPerQuestion ?? null,
        })
      ),
    [questions, defaults?.pointsPerQuestion]
  );

  const conversionNotes = useMemo(
    () => Array.from(new Set(mapped.map(m => m.note).filter(Boolean) as string[])),
    [mapped]
  );

  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalWork = questions.length * selectedCourseIds.size;

  const handlePush = async () => {
    if (selectedCourseIds.size === 0) {
      toast.error("Please select at least one course");
      return;
    }
    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    setPushing(true);
    setProgress(0);

    try {
      let completed = 0;
      const courseIds = Array.from(selectedCourseIds);
      const description = defaults?.instructions || defaults?.description || undefined;
      const targets: CanvasPushTarget[] = [];

      for (const courseId of courseIds) {
        const quiz = await createCanvasQuiz(config, Number(courseId), {
          title: quizTitle.trim(),
          description,
          quiz_type: quizType as any,
          shuffle_answers: shuffleAnswers,
          published: publishImmediately,
          time_limit: defaults?.timeLimitMinutes ?? null,
          one_question_at_a_time: oneAtATime,
        });

        targets.push({
          courseId,
          courseName: courses.find(c => String(c.id) === courseId)?.name,
          quizId: String(quiz.id),
        });

        for (let i = 0; i < mapped.length; i++) {
          await createCanvasQuizQuestion(config, Number(courseId), quiz.id, mapped[i].payload);
          completed++;
          setProgress(completed);
        }
      }

      if (targets.length > 0) {
        saveLastCanvasPush({
          quizTitle: quizTitle.trim(),
          questionCount: questions.length,
          pushedAt: new Date().toISOString(),
          targets,
        });
      }

      setDone(true);
      toast.success(`Quiz "${quizTitle}" pushed to ${courseIds.length} course${courseIds.length > 1 ? 's' : ''} with ${questions.length} questions!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to push quiz to Canvas");
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Push to Canvas</DialogTitle>
          <DialogDescription>
            Create a native Canvas quiz with {questions.length} selected question{questions.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-primary" />
            <p className="text-sm font-medium text-foreground">
              Quiz created in {selectedCourseIds.size} course{selectedCourseIds.size > 1 ? 's' : ''}!
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {publishImmediately
                ? "The quiz is live and visible to students."
                : "The quiz is saved as a draft. Publish it in Canvas when ready."}
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Canvas Courses ({selectedCourseIds.size} selected)</Label>
                {loadingCourses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
                    {courses.map(c => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={selectedCourseIds.has(String(c.id))}
                          onCheckedChange={() => toggleCourse(String(c.id))}
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pushTitle">Quiz Title</Label>
                <Input id="pushTitle" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Quiz Type</Label>
                <Select value={quizType} onValueChange={setQuizType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Graded Quiz</SelectItem>
                    <SelectItem value="practice_quiz">Practice Quiz</SelectItem>
                    <SelectItem value="graded_survey">Graded Survey</SelectItem>
                    <SelectItem value="survey">Ungraded Survey</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="shuffle">Shuffle Answers</Label>
                <Switch id="shuffle" checked={shuffleAnswers} onCheckedChange={setShuffleAnswers} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="oneAtATime">One Question at a Time</Label>
                <Switch id="oneAtATime" checked={oneAtATime} onCheckedChange={setOneAtATime} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="publish">Publish Immediately</Label>
                <Switch id="publish" checked={publishImmediately} onCheckedChange={setPublishImmediately} />
              </div>

              {conversionNotes.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Info className="h-3.5 w-3.5" /> Formatting notes
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                    {conversionNotes.map(note => <li key={note}>{note}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {pushing && (
              <div className="space-y-1.5">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${totalWork > 0 ? (progress / totalWork) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Adding question {progress} of {totalWork}...
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushing}>Cancel</Button>
              <Button onClick={handlePush} disabled={pushing || selectedCourseIds.size === 0} className="gap-2">
                {pushing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Pushing...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Push to Canvas</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
