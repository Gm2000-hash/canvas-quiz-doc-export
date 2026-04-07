import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { getCourses, createCanvasAssignment, type CanvasConfig, type Course } from "@/lib/canvas-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  questionCount: number;
  config: CanvasConfig;
}

const PUBLISHED_BASE = "https://canvas-quiz-doc-export.lovable.app";

export default function PushISATEmbedToCanvasDialog({
  open, onOpenChange, examId, examTitle, questionCount, config,
}: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [assignmentName, setAssignmentName] = useState(examTitle);
  const [points, setPoints] = useState(100);
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ltiBaseUrl, setLtiBaseUrl] = useState<string | null>(null);
  const [ltiChecked, setLtiChecked] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      setDone(false);
      setProgress(0);
      setAssignmentName(examTitle);
      if (courses.length === 0) {
        setLoadingCourses(true);
        getCourses(config)
          .then(setCourses)
          .catch(() => toast.error("Failed to load Canvas courses"))
          .finally(() => setLoadingCourses(false));
      }
      // Check if LTI is configured
      if (!ltiChecked && user) {
        supabase
          .from("lti_platforms")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              setLtiBaseUrl(`${supabaseUrl}/functions/v1/lti-login`);
            }
            setLtiChecked(true);
          });
      }
    }
  }, [open, config, examTitle, user]);

  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const directUrl = `${PUBLISHED_BASE}/isat-exam/${examId}`;
  const embedUrl = ltiBaseUrl
    ? `${ltiBaseUrl}?activity_id=isat-exam-${examId}`
    : directUrl;

  const handlePush = async () => {
    if (selectedCourseIds.size === 0) {
      toast.error("Please select at least one course");
      return;
    }

    setPushing(true);
    setProgress(0);

    try {
      const courseIds = Array.from(selectedCourseIds);
      let completed = 0;

      for (const courseId of courseIds) {
        await createCanvasAssignment(config, Number(courseId), {
          name: assignmentName.trim(),
          description: `<p>Complete the <strong>ISAT Practice Exam</strong> (${questionCount} questions) embedded below.</p><p><a href="${embedUrl}" target="_blank">Open exam in new tab</a></p>`,
          submission_types: ["external_tool"],
          external_tool_tag_attributes: {
            url: embedUrl,
            new_tab: true,
          },
          points_possible: points,
          published: publishImmediately,
        });

        completed++;
        setProgress(completed);
      }

      setDone(true);
      toast.success(`ISAT exam embedded in ${courseIds.length} course${courseIds.length > 1 ? "s" : ""}!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to push assignment to Canvas");
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Embed ISAT Exam in Canvas
          </DialogTitle>
          <DialogDescription>
            Create a Canvas assignment that embeds this {questionCount}-question ISAT practice exam as an external tool.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-primary" />
            <p className="text-sm font-medium text-foreground">
              Assignment created in {selectedCourseIds.size} course{selectedCourseIds.size > 1 ? "s" : ""}!
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {publishImmediately
                ? "The assignment is live — students can take the exam from Canvas."
                : "Saved as a draft. Publish it in Canvas when ready."}
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
                  <p className="text-sm text-muted-foreground">No Canvas courses found. Configure Canvas in Settings first.</p>
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
                <Label htmlFor="isatAssignmentName">Assignment Name</Label>
                <Input id="isatAssignmentName" value={assignmentName} onChange={e => setAssignmentName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isatPoints">Points Possible</Label>
                <Input id="isatPoints" type="number" min={0} value={points} onChange={e => setPoints(Number(e.target.value))} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isatPublish">Publish Immediately</Label>
                <Switch id="isatPublish" checked={publishImmediately} onCheckedChange={setPublishImmediately} />
              </div>

              <div className="rounded-md bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Embed URL</p>
                <p className="text-xs text-muted-foreground break-all font-mono">{embedUrl}</p>
              </div>
            </div>

            {pushing && (
              <div className="space-y-1.5">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${selectedCourseIds.size > 0 ? (progress / selectedCourseIds.size) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Pushing to course {progress} of {selectedCourseIds.size}...
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushing}>Cancel</Button>
              <Button onClick={handlePush} disabled={pushing || selectedCourseIds.size === 0} className="gap-2">
                {pushing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Pushing...</>
                ) : (
                  <><ExternalLink className="h-4 w-4" /> Embed in Canvas</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
