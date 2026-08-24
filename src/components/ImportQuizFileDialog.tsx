import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Check, ClipboardCheck, FileText, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ParsedQuizQuestion {
  question_text: string;
  question_type?: string;
  points_possible?: number;
  answers?: { text: string; weight: number }[];
  dok_level?: number | null;
  blooms_level?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after questions are saved to the bank */
  onImported: () => void;
  /** Called with the new quiz id when a quiz was created */
  onQuizCreated?: (quizId: string) => void;
}

const ACCEPTED_TYPES = ".docx,.xlsx,.pptx,.pdf,.txt,.md,.csv";
const MAX_MB = 25;

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function ImportQuizFileDialog({ open, onOpenChange, onImported, onQuizCreated }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "review">("upload");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [questions, setQuestions] = useState<ParsedQuizQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [makeQuiz, setMakeQuiz] = useState(true);
  const [quizTitle, setQuizTitle] = useState("");

  const reset = () => {
    setStep("upload");
    setParsing(false);
    setSaving(false);
    setError("");
    setSourceName("");
    setQuestions([]);
    setSelected(new Set());
    setMakeQuiz(true);
    setQuizTitle("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB}MB`);
      return;
    }

    setError("");
    setParsing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "questions");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-import-file`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse file");

      const parsed: ParsedQuizQuestion[] = (data.questions || []).filter(
        (q: ParsedQuizQuestion) => q?.question_text?.trim(),
      );
      if (!parsed.length) throw new Error("No quiz questions could be extracted from that file");

      setQuestions(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setSourceName(file.name);
      setQuizTitle(file.name.replace(/\.[^.]+$/, ""));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggle = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || selected.size === 0) return;
    if (makeQuiz && !quizTitle.trim()) {
      setError("Enter a quiz title");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const rows = questions
        .filter((_, i) => selected.has(i))
        .map(q => ({
          user_id: user.id,
          question_text: q.question_text,
          question_type: q.question_type || "multiple_choice_question",
          points_possible: q.points_possible ?? 1,
          answers: (q.answers || []) as any,
          source_course: "File Import",
          source_quiz: sourceName,
          dok_level: q.dok_level ?? null,
          blooms_level: q.blooms_level ?? null,
        }));

      const { data: inserted, error: insertError } = await supabase
        .from("question_bank")
        .insert(rows as never)
        .select("id");

      if (insertError) throw insertError;

      const ids = (inserted || []).map(r => r.id);

      if (makeQuiz && ids.length > 0) {
        const { data: quiz, error: quizError } = await (supabase
          .from("custom_quizzes")
          .insert({
            user_id: user.id,
            title: quizTitle.trim(),
            description: `Imported from ${sourceName}`,
            question_ids: ids,
            settings: {},
          })
          .select("id")
          .single() as any);

        if (quizError) throw quizError;
        toast.success(`Created quiz "${quizTitle.trim()}" with ${ids.length} question(s)`);
        onQuizCreated?.(quiz.id);
      } else {
        toast.success(`Imported ${ids.length} question(s) to your bank`);
      }

      onImported();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Quiz File
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a quiz or test document and AI will extract the questions, answer choices, and
              suggested DOK / Bloom's levels. Supports{" "}
              <strong>.docx, .xlsx, .pptx, .pdf, .txt, .md, .csv</strong>.
            </p>

            <div
              onClick={() => !parsing && fileRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Extracting questions…</p>
                </>
              ) : (
                <>
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">Click to select a quiz file</p>
                  <p className="text-xs text-muted-foreground">Max {MAX_MB}MB</p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileSelect}
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {questions.length} question(s) from {sourceName}
              </Badge>
              <Button variant="ghost" size="sm" onClick={reset}>
                Start over
              </Button>
            </div>

            <ScrollArea className="h-[240px] border rounded-lg">
              <div className="p-2 space-y-1">
                {questions.map((q, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(idx)}
                      onCheckedChange={() => toggle(idx)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{stripHtml(q.question_text)}</p>
                      <p className="text-xs text-muted-foreground">
                        {(q.question_type || "multiple_choice_question").replace(/_/g, " ")}
                        {q.answers?.length ? ` · ${q.answers.length} options` : ""}
                        {q.dok_level ? ` · DOK ${q.dok_level}` : ""}
                        {q.blooms_level ? ` · ${q.blooms_level}` : ""}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelected(
                    selected.size === questions.length
                      ? new Set()
                      : new Set(questions.map((_, i) => i)),
                  )
                }
              >
                {selected.size === questions.length ? "Deselect All" : "Select All"}
              </Button>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="make-quiz" className="flex items-center gap-2 text-sm">
                  <ClipboardCheck className="h-4 w-4" />
                  Also create a quiz from these questions
                </Label>
                <Switch id="make-quiz" checked={makeQuiz} onCheckedChange={setMakeQuiz} />
              </div>
              {makeQuiz && (
                <Input
                  placeholder="Quiz title"
                  value={quizTitle}
                  onChange={(e) => { setQuizTitle(e.target.value); setError(""); }}
                />
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || selected.size === 0}
              className="w-full gap-2 rounded-xl"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {makeQuiz
                ? `Import ${selected.size} & Create Quiz`
                : `Import ${selected.size} Question(s)`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImportQuizFileDialog;
