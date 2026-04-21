import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

      setUpcoming(
        (upcomingRes.data || []).map((l) => ({
          id: l.id,
          title: l.title,
          lesson_date: l.lesson_date!,
        }))
      );

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bubble-glass bubble-tint-cyan p-6 animate-pulse">
            <div className="h-6 bg-white/60 rounded w-2/3 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-white/60 rounded w-full" />
              <div className="h-4 bg-white/60 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Upcoming Lessons */}
      <div className="bubble-glass bubble-tint-cyan p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-white/70 backdrop-blur flex items-center justify-center shadow-sm border border-white/80">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Upcoming Lessons</h3>
        </div>
        <div className="space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No lessons scheduled this week</p>
          ) : (
            upcoming.map((l) => (
              <button
                key={l.id}
                onClick={() => navigate(`/lesson-planner/${l.id}`)}
                className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-white/50 transition-colors"
              >
                <div className="shrink-0 h-9 w-9 rounded-xl bg-white/70 flex items-center justify-center border border-white/80">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-foreground">{l.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
            className="w-full text-sm mt-2 rounded-full hover:bg-white/60"
            onClick={() => navigate("/lesson-planner")}
          >
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bubble-glass bubble-tint-orange p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-white/70 backdrop-blur flex items-center justify-center shadow-sm border border-white/80">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
        </div>
        <div className="space-y-2">
          {recentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No recent activity</p>
          ) : (
            recentItems.map((item) => {
              const Icon = typeIcon[item.type];
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 rounded-xl p-2.5"
                >
                  <div className="shrink-0 h-9 w-9 rounded-xl bg-white/70 flex items-center justify-center border border-white/80">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs rounded-full bg-white/70 border border-white/80 capitalize shrink-0">
                    {item.type}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Standards Coverage */}
      <div className="bubble-glass bubble-tint-green p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-white/70 backdrop-blur flex items-center justify-center shadow-sm border border-white/80">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Standards Coverage</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-foreground">Standards tagged</span>
              <span className="font-bold text-foreground">{coverage.covered}</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-foreground">Well-covered (3+ questions)</span>
              <span className="font-bold text-foreground">{coverage.wellCovered}</span>
            </div>
            <Progress
              value={coverage.covered > 0 ? (coverage.wellCovered / coverage.covered) * 100 : 0}
              className="h-2"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs rounded-full bg-white/70 border border-white/80">
              🟢 {coverage.wellCovered} solid
            </Badge>
            <Badge variant="secondary" className="text-xs rounded-full bg-white/70 border border-white/80">
              🟡 {coverage.covered - coverage.wellCovered} needs work
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm rounded-full hover:bg-white/60"
            onClick={() => navigate("/question-bank")}
          >
            View coverage grid <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
