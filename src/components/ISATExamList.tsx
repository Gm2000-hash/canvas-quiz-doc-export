import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Play, CheckCircle2, FileText, Clock, Sparkles, Lightbulb } from "lucide-react";
import { format } from "date-fns";

interface ISATExam {
  id: string;
  title: string;
  grade_level: string;
  question_count: number;
  score: number | null;
  total_points: number | null;
  completed_at: string | null;
  created_at: string;
  hints_used: number;
}

interface Props {
  onTakeExam: (examId: string) => void;
  onGenerateNew: () => void;
  refreshKey?: number;
}

const GRADE_LABELS: Record<string, string> = {
  "6th": "Physical Science",
  "7th": "Life Science",
  "8th": "Earth & Space Science",
};

export default function ISATExamList({ onTakeExam, onGenerateNew, refreshKey }: Props) {
  const [exams, setExams] = useState<ISATExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ISATExam | null>(null);

  const loadExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("isat_exams")
        .select("id, title, grade_level, question_count, score, total_points, completed_at, created_at, hints_used")
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;
      setExams(data || []);
    } catch {
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExams(); }, [refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("isat_exams")
        .delete()
        .eq("id", deleteTarget.id) as any;
      if (error) throw error;
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success("Exam deleted");
    } catch {
      toast.error("Failed to delete exam");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <p className="text-sm font-medium">No ISAT practice exams yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a practice exam to help students prepare for the ISAT ECA.
          </p>
        </div>
        <Button onClick={onGenerateNew} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Practice Exam
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{exams.length} exam{exams.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={onGenerateNew} className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          Generate New Exam
        </Button>
      </div>

      {exams.map((exam) => (
        <Card key={exam.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{exam.title}</p>
                {exam.completed_at && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-base">
                  {exam.grade_level} Grade — {GRADE_LABELS[exam.grade_level] || exam.grade_level}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {exam.question_count} questions
                </Badge>
                {exam.completed_at && exam.score != null && exam.total_points != null && (
                  <Badge variant="default" className="text-xs">
                    Score: {exam.score}/{exam.total_points} ({Math.round((exam.score / exam.total_points) * 100)}%)
                  </Badge>
                )}
                {exam.completed_at && exam.hints_used > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 bg-amber-50">
                    <Lightbulb className="h-3 w-3" />
                    {exam.hints_used} hint{exam.hints_used !== 1 ? "s" : ""} used
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(exam.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => onTakeExam(exam.id)}
                className="gap-1.5"
              >
                <Play className="h-4 w-4" />
                {exam.completed_at ? "Review" : "Take Exam"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setDeleteTarget(exam)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
