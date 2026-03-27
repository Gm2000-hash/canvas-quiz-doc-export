import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Clock, FileText, BookOpen, Puzzle,
  ArrowRight, TrendingUp, Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentItem {
  id: string;
  title: string;
  type: "lesson" | "question" | "activity" | "unit";
  updated_at: string;
}

interface UpcomingLesson {
  id: string;
  title: string;
  lesson_date: string;
  unit_title?: string;
}

interface StandardsCoverage {
  total: number;
  covered: number;
  wellCovered: number;
}

interface Props {
  userId: string;
}

export function DashboardAnalytics({ userId }: Props) {
  const navigate = useNavigate();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);
  const [coverage, setCoverage] = useState<StandardsCoverage>({ total: 0, covered: 0, wellCovered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

      const [recentLessons, recentQuestions, recentActivities, upcomingRes, standardsRes] =
        await Promise.all([
          supabase
            .from("lesson_plans")
            .select("id, title, updated_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(3),
          supabase
            .from("question_bank")
            .select("id, question_text, updated_at:created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("h5p_activities")
            .select("id, title, updated_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(3),
          supabase
            .from("lesson_plans")
            .select("id, title, lesson_date, unit_id")
            .eq("user_id", userId)
            .gte("lesson_date", today)
            .lte("lesson_date", nextWeek)
            .order("lesson_date", { ascending: true })
            .limit(5),
          supabase
            .from("question_bank_standards")
            .select("ngss_code, question_bank_id")
            .limit(1000),
        ]);

      // Merge recent items
      const items: RecentItem[] = [
        ...(recentLessons.data || []).map((l) => ({
          id: l.id,
          title: l.title,
          type: "lesson" as const,
          updated_at: l.updated_at,
        })),
        ...(recentQuestions.data || []).map((q) => ({
          id: q.id,
          title: (q.question_text || "").replace(/<[^>]+>/g, "").slice(0, 60),
          type: "question" as const,
          updated_at: q.updated_at,
        })),
        ...(recentActivities.data || []).map((a) => ({
          id: a.id,
          title: a.title,
          type: "activity" as const,
          updated_at: a.updated_at,
        })),
      ];
      items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setRecentItems(items.slice(0, 5));

      // Upcoming lessons
      setUpcoming(
        (upcomingRes.data || []).map((l) => ({
          id: l.id,
          title: l.title,
          lesson_date: l.lesson_date!,
        }))
      );

      // Standards coverage
      const stdRows = standardsRes.data || [];
      const codeMap = new Map<string, number>();
      stdRows.forEach((r) => {
        codeMap.set(r.ngss_code, (codeMap.get(r.ngss_code) || 0) + 1);
      });
      const uniqueCodes = codeMap.size;
      const well = [...codeMap.values()].filter((c) => c >= 3).length;
      setCoverage({ total: Math.max(uniqueCodes, 1), covered: uniqueCodes, wellCovered: well });

      setLoading(false);
    };
    fetchAll();
  }, [userId]);

  const typeIcon = {
    lesson: FileText,
    question: BookOpen,
    activity: Puzzle,
    unit: TrendingUp,
  };

  const typeColor = {
    lesson: "text-primary",
    question: "text-neon-orange",
    activity: "text-neon-purple",
    unit: "text-neon-cyan",
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Upcoming Lessons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Upcoming Lessons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-xs italic text-sidebar-foreground">No lessons scheduled this week</p>
          ) : (
            upcoming.map((l) => (
              <button
                key={l.id}
                onClick={() => navigate(`/lesson-planner/${l.id}`)}
                className="w-full flex items-center gap-2 rounded-lg p-2 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate text-sidebar-foreground">{l.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(l.lesson_date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </button>
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs mt-1"
            onClick={() => navigate("/lesson-planner")}
          >
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-neon-orange" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No recent activity</p>
          ) : (
            recentItems.map((item) => {
              const Icon = typeIcon[item.type];
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-2 rounded-lg p-2 text-foreground"
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${typeColor[item.type]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate text-sidebar-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 capitalize">
                    {item.type}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Standards Coverage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neon-green" />
            Standards Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Standards tagged</span>
              <span className="font-semibold text-foreground">{coverage.covered}</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Well-covered (3+ questions)</span>
              <span className="font-semibold text-foreground">{coverage.wellCovered}</span>
            </div>
            <Progress
              value={coverage.covered > 0 ? (coverage.wellCovered / coverage.covered) * 100 : 0}
              className="h-2"
            />
          </div>
          <div className="pt-1 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              🟢 {coverage.wellCovered} solid
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              🟡 {coverage.covered - coverage.wellCovered} needs work
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs mt-1"
            onClick={() => navigate("/question-bank")}
          >
            View coverage grid <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
