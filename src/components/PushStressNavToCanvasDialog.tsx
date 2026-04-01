import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { getCourses, createCanvasQuiz, createCanvasQuizQuestion, type CanvasConfig, type Course } from "@/lib/canvas-api";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle } from "lucide-react";

interface StressScenario {
  title: string;
  description: string;
  choices: { text: string; type: string; points: number; feedback: string }[];
}

interface PushStressNavToCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: StressScenario[];
  config: CanvasConfig;
}

export default function PushStressNavToCanvasDialog({ open, onOpenChange, scenarios, config }: PushStressNavToCanvasDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [quizTitle, setQuizTitle] = useState("Stress Navigator — Coping Skills Quiz");
  const [quizType, setQuizType] = useState<string>("graded_survey");
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
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
    }
  }, [open, config]);

  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalWork = scenarios.length * selectedCourseIds.size;

  const handlePush = async () => {
    if (selectedCourseIds.size === 0) {
      toast.error("Please select at least one course");
      return;
    }

    setPushing(true);
    setProgress(0);

    try {
      let completed = 0;
      const courseIds = Array.from(selectedCourseIds);

      for (const courseId of courseIds) {
        const quiz = await createCanvasQuiz(config, Number(courseId), {
          title: quizTitle.trim(),
          description: "<p>Navigate real-life stress scenarios and choose the healthiest coping response. Each question presents a scenario with multiple options — select the response that best demonstrates healthy coping skills.</p>",
          quiz_type: quizType as any,
          shuffle_answers: shuffleAnswers,
          published: publishImmediately,
        });

        for (let i = 0; i < scenarios.length; i++) {
          const s = scenarios[i];
          // Build question text with scenario description
          const questionText = `<p><strong>${s.title}</strong></p><p><em>"${s.description}"</em></p><p>Which response demonstrates the healthiest coping strategy?</p>`;

          // Build answers — best answer (10 pts) gets weight 100, partial (5 pts) gets 50, unhealthy (0 pts) gets 0
          const maxPoints = Math.max(...s.choices.map(c => c.points));
          const answers = s.choices.map(c => ({
            answer_text: c.text,
            answer_weight: maxPoints > 0 ? Math.round((c.points / maxPoints) * 100) : 0,
            answer_comment: c.feedback,
          }));

          await createCanvasQuizQuestion(config, Number(courseId), quiz.id, {
            question_name: `Scenario ${i + 1}: ${s.title}`,
            question_text: questionText,
            question_type: "multiple_choice_question",
            points_possible: 10,
            answers,
          });

          completed++;
          setProgress(completed);
        }
      }

      setDone(true);
      toast.success(`"${quizTitle}" pushed to ${courseIds.length} course${courseIds.length > 1 ? 's' : ''} with ${scenarios.length} scenarios!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to push quiz to Canvas");
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Push to Canvas</DialogTitle>
          <DialogDescription>
            Create a Canvas quiz with {scenarios.length} stress scenarios as multiple-choice questions.
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
                ) : courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Canvas credentials found. Configure them in Settings first.</p>
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
                <Label htmlFor="stressTitle">Quiz Title</Label>
                <Input id="stressTitle" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
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
                <Label htmlFor="stressShuffle">Shuffle Answers</Label>
                <Switch id="stressShuffle" checked={shuffleAnswers} onCheckedChange={setShuffleAnswers} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="stressPublish">Publish Immediately</Label>
                <Switch id="stressPublish" checked={publishImmediately} onCheckedChange={setPublishImmediately} />
              </div>
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
                  Adding scenario {progress} of {totalWork}...
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
