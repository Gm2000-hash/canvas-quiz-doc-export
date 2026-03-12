import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Layers } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  isToday,
} from "date-fns";

interface LessonRow {
  id: string;
  title: string;
  lesson_date: string | null;
  duration_minutes: number;
  unit_id: string | null;
  unit_title?: string;
}

export function WeeklyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => d.getDay() !== 0 && d.getDay() !== 6),
    [weekStart, weekEnd]
  );

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(weekEnd, "yyyy-MM-dd");

      const { data } = await supabase
        .from("lesson_plans")
        .select("id, title, lesson_date, duration_minutes, unit_id")
        .eq("user_id", user.id)
        .gte("lesson_date", startStr)
        .lte("lesson_date", endStr)
        .order("lesson_date");

      if (!data || data.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      // Fetch unit titles
      const unitIds = [...new Set(data.filter(l => l.unit_id).map(l => l.unit_id!))];
      let unitMap: Record<string, string> = {};
      if (unitIds.length > 0) {
        const { data: units } = await supabase
          .from("units")
          .select("id, title")
          .in("id", unitIds);
        (units || []).forEach(u => { unitMap[u.id] = u.title; });
      }

      setLessons(data.map(l => ({ ...l, unit_title: l.unit_id ? unitMap[l.unit_id] : undefined })));
      setLoading(false);
    };
    fetch();
  }, [user, weekStart]);

  const getLessonsForDay = (day: Date) =>
    lessons.filter(l => l.lesson_date && isSameDay(parseISO(l.lesson_date), day));

  const hasAnyLessons = lessons.length > 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Weekly Overview
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-xs font-medium px-2 h-8"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {weekDays.map(day => {
          const dayLessons = getLessonsForDay(day);
          const today = isToday(day);

          return (
            <div key={day.toISOString()} className="space-y-1.5">
              <div className={`text-center text-xs font-medium py-1 rounded-lg ${today ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                <div>{format(day, "EEE")}</div>
                <div className={`text-sm font-semibold ${today ? "" : "text-foreground"}`}>{format(day, "d")}</div>
              </div>
              {loading ? (
                <div className="h-16 rounded-xl bg-muted/50 animate-pulse" />
              ) : dayLessons.length === 0 ? (
                <div className="h-16 rounded-xl border border-dashed border-border/60 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">No lessons</span>
                </div>
              ) : (
                dayLessons.map(lesson => (
                  <Card
                    key={lesson.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] border-primary/15 bg-primary/[0.03]"
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                  >
                    <CardContent className="p-2">
                      <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{lesson.title}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{lesson.duration_minutes}m</span>
                      </div>
                      {lesson.unit_title && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1 max-w-full truncate">
                          {lesson.unit_title}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          );
        })}
      </div>

      {!loading && !hasAnyLessons && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          No lessons scheduled for {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
        </p>
      )}
    </div>
  );
}
