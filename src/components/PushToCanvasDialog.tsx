import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { getCourses, createCanvasQuiz, createCanvasQuizQuestion, type CanvasConfig, type Course } from "@/lib/canvas-api";
import type { QuestionBankItem } from "@/lib/question-bank";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle } from "lucide-react";

interface PushToCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuestionBankItem[];
  config: CanvasConfig;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

/** Map our question_type to Canvas quiz question types */
function mapQuestionType(type: string): string {
  const map: Record<string, string> = {
    multiple_choice_question: "multiple_choice_question",
    multiple_answers_question: "multiple_answers_question",
    true_false_question: "true_false_question",
    short_answer_question: "short_answer_question",
    essay_question: "essay_question",
    matching_question: "matching_question",
    fill_in_multiple_blanks_question: "fill_in_multiple_blanks_question",
  };
  return map[type] || "essay_question";
}

function buildCanvasAnswers(q: QuestionBankItem) {
  if (!q.answers || q.answers.length === 0) return undefined;

  if (q.question_type === "matching_question") {
    return q.answers.map((a: any) => ({
      answer_match_left: a.left || a.text || "",
      answer_match_right: a.right || "",
    }));
  }

  return q.answers.map((a: any) => ({
    answer_text: stripHtml(a.text || a.html || ""),
    answer_weight: a.weight ?? 0,
  }));
}

export default function PushToCanvasDialog({ open, onOpenChange, questions, config }: PushToCanvasDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [quizTitle, setQuizTitle] = useState("Quiz from Question Bank");
  const [quizType, setQuizType] = useState<string>("assignment");
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
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

  const handlePush = async () => {
    if (!selectedCourseId) {
      toast.error("Please select a course");
      return;
    }
    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    setPushing(true);
    setProgress(0);

    try {
      // 1. Create the quiz
      const quiz = await createCanvasQuiz(config, Number(selectedCourseId), {
        title: quizTitle.trim(),
        quiz_type: quizType as any,
        shuffle_answers: shuffleAnswers,
        published: publishImmediately,
      });

      // 2. Add questions one by one
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await createCanvasQuizQuestion(config, Number(selectedCourseId), quiz.id, {
          question_name: `Question ${i + 1}`,
          question_text: q.question_text,
          question_type: mapQuestionType(q.question_type),
          points_possible: q.points_possible,
          answers: buildCanvasAnswers(q),
        });
        setProgress(i + 1);
      }

      setDone(true);
      toast.success(`Quiz "${quizTitle}" pushed to Canvas with ${questions.length} questions!`);
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
            Create a native Canvas quiz with {questions.length} selected question{questions.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-primary" />
            <p className="text-sm font-medium text-foreground">Quiz created successfully!</p>
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
                <Label>Canvas Course</Label>
                {loadingCourses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
                  </div>
                ) : (
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Label htmlFor="publish">Publish Immediately</Label>
                <Switch id="publish" checked={publishImmediately} onCheckedChange={setPublishImmediately} />
              </div>
            </div>

            {pushing && (
              <div className="space-y-1.5">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress / questions.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Adding question {progress} of {questions.length}...
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushing}>Cancel</Button>
              <Button onClick={handlePush} disabled={pushing || !selectedCourseId} className="gap-2">
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
