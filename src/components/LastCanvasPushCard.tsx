import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Upload, X } from "lucide-react";
import {
  CANVAS_LAST_PUSH_EVENT,
  canvasWorkspaceLink,
  clearLastCanvasPush,
  getLastCanvasPush,
  type CanvasLastPush,
} from "@/lib/canvas-last-push";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Shows the most recent quiz pushed to Canvas with deep links into the
 * Results and Analytics tabs for that exact course + quiz.
 */
export function LastCanvasPushCard() {
  const [push, setPush] = useState<CanvasLastPush | null>(() => getLastCanvasPush());

  useEffect(() => {
    const sync = () => setPush(getLastCanvasPush());
    window.addEventListener(CANVAS_LAST_PUSH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CANVAS_LAST_PUSH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!push) return null;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Upload className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Canvas push</p>
            <p className="font-semibold truncate">{push.quizTitle}</p>
            <p className="text-xs text-muted-foreground">
              {push.questionCount} question{push.questionCount !== 1 ? "s" : ""} · {formatWhen(push.pushedAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Dismiss last push"
            onClick={clearLastCanvasPush}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {push.targets.map((t) => (
            <div
              key={`${t.courseId}-${t.quizId}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <Badge variant="secondary" className="max-w-[16rem] truncate">
                {t.courseName || `Course ${t.courseId}`}
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to={canvasWorkspaceLink("results", t)}>
                    <Users className="h-3.5 w-3.5" /> Results
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to={canvasWorkspaceLink("analytics", t)}>
                    <BarChart3 className="h-3.5 w-3.5" /> Analytics
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
