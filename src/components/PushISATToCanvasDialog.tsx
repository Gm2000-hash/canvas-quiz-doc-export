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

interface ExamQuestion {
  question_number: number;
  question_type: string;
  question_text: string;
  standard_code: string;
  points_possible: number;
  dok_level: number;
  blooms_level: string;
  answers: any;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examTitle: string;
  questions: ExamQuestion[];
  config: CanvasConfig;
}

/** Map ISAT question types to Canvas quiz question types */
function mapISATType(type: string): string {
  const map: Record<string, string> = {
    multiple_choice_question: "multiple_choice_question",
    multiple_answers_question: "multiple_answers_question",
    data_analysis_question: "multiple_choice_question",
    scenario_question: "multiple_choice_question",
    investigation_design_question: "multiple_choice_question",
    constructed_response_question: "essay_question",
    concept_map_question: "essay_question",
    multi_step_question: "essay_question",
    drag_and_drop_question: "essay_question",
  };
  return map[type] || "essay_question";
}

function buildAnswers(q: ExamQuestion) {
  if (!q.answers || !Array.isArray(q.answers)) return undefined;
  const canvasType = mapISATType(q.question_type);
  if (canvasType === "essay_question") return undefined;

  return q.answers.map((a: any) => ({
    answer_text: a.text || "",
    answer_weight: a.weight ?? 0,
  }));
}

export default function PushISATToCanvasDialog({ open, onOpenChange, examTitle, questions, config }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [quizTitle, setQuizTitle] = useState(examTitle);
  const [quizType, setQuizType] = useState<string>("practice_quiz");
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
      setQuizTitle(examTitle);
    }
  }, [open, config, examTitle]);

  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalWork = questions.length * selectedCourseIds.size;

  const handlePush = async () => {
    if (selectedCourseIds.size === 0) { toast.error("Select at least one course"); return; }
    if (!quizTitle.trim()) { toast.error("Enter a quiz title"); return; }

    setPushing(true);
    setProgress(0);
    try {
      let completed = 0;
      const courseIds = Array.from(selectedCourseIds);

      for (const courseId of courseIds) {
        const quiz = await createCanvasQuiz(config, Number(courseId), {
          title: quizTitle.trim(),
          quiz_type: quizType as any,
          shuffle_answers: shuffleAnswers,
          published: publishImmediately,
        });

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await createCanvasQuizQuestion(config, Number(courseId), quiz.id, {
            question_name: `Q${q.question_number} – ${q.standard_code}`,
            question_text: q.question_text,
            question_type: mapISATType(q.question_type),
            points_possible: q.points_possible,
            answers: buildAnswers(q),
          });
          completed++;
          setProgress(completed);
        }
      }

      setDone(true);
      toast.success(`ISAT exam pushed to ${courseIds.length} course${courseIds.length > 1 ? "s" : ""}!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to push to Canvas");
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Push ISAT Exam to Canvas
          </DialogTitle>
          <DialogDescription>
            Push {questions.length} questions from this ISAT practice exam as a native Canvas quiz.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-primary" />
            <p className="text-sm font-medium">Exam pushed to {selectedCourseIds.size} course{selectedCourseIds.size > 1 ? "s" : ""}!</p>
            <p className="text-xs text-muted-foreground text-center">
              {publishImmediately ? "The quiz is live." : "Saved as a draft — publish in Canvas when ready."}
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
                <Label>Quiz Title</Label>
                <Input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Quiz Type</Label>
                <Select value={quizType} onValueChange={setQuizType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice_quiz">Practice Quiz</SelectItem>
                    <SelectItem value="assignment">Graded Quiz</SelectItem>
                    <SelectItem value="graded_survey">Graded Survey</SelectItem>
                    <SelectItem value="survey">Ungraded Survey</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Shuffle Answers</Label>
                <Switch checked={shuffleAnswers} onCheckedChange={setShuffleAnswers} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Publish Immediately</Label>
                <Switch checked={publishImmediately} onCheckedChange={setPublishImmediately} />
              </div>
            </div>

            {pushing && (
              <div className="space-y-1.5">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${totalWork > 0 ? (progress / totalWork) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Adding question {progress} of {totalWork}...
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushing}>Cancel</Button>
              <Button onClick={handlePush} disabled={pushing || selectedCourseIds.size === 0} className="gap-2">
                {pushing ? <><Loader2 className="h-4 w-4 animate-spin" /> Pushing...</> : <><Upload className="h-4 w-4" /> Push to Canvas</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
