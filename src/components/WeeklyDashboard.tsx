import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Clock, CalendarDays, CalendarRange, Plus } from "lucide-react";
import { getUnitColor } from "@/lib/unit-colors";
import { useToast } from "@/hooks/use-toast";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
  isToday,
  getDay,
} from "date-fns";

interface LessonRow {
  id: string;
  title: string;
  lesson_date: string | null;
  duration_minutes: number;
  unit_id: string | null;
  unit_title?: string;
}

interface UnitOption {
  id: string;
  title: string;
}

type ViewMode = "week" | "month";

export function WeeklyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<UnitOption[]>([]);

  // Quick-add state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddUnitId, setQuickAddUnitId] = useState<string>("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);

  const rangeStart = viewMode === "week" ? weekStart : monthStart;
  const rangeEnd = viewMode === "week" ? weekEnd : monthEnd;

  // Week days (Mon-Fri)
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => d.getDay() !== 0 && d.getDay() !== 6),
    [weekStart, weekEnd]
  );

  // Month grid: full weeks covering the month, starting Monday
  const monthGridDays = useMemo(() => {
    const firstDay = startOfWeek(monthStart, { weekStartsOn: 1 });
    const lastDay = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: firstDay, end: lastDay });
  }, [monthStart, monthEnd]);

  const fetchLessons = async () => {
    if (!user) return;
    setLoading(true);
    const startStr = viewMode === "week" ? format(weekStart, "yyyy-MM-dd") : format(startOfWeek(monthStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const endStr = viewMode === "week" ? format(weekEnd, "yyyy-MM-dd") : format(endOfWeek(monthEnd, { weekStartsOn: 1 }), "yyyy-MM-dd");

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

    const unitIds = [...new Set(data.filter(l => l.unit_id).map(l => l.unit_id!))];
    let unitMap: Record<string, string> = {};
    if (unitIds.length > 0) {
      const { data: u } = await supabase.from("units").select("id, title").in("id", unitIds);
      (u || []).forEach(u => { unitMap[u.id] = u.title; });
    }

    setLessons(data.map(l => ({ ...l, unit_title: l.unit_id ? unitMap[l.unit_id] : undefined })));
    setLoading(false);
  };

  useEffect(() => { fetchLessons(); }, [user, currentDate, viewMode]);

  useEffect(() => {
    if (!user) return;
    supabase.from("units").select("id, title").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setUnits(data || []));
  }, [user]);

  const getLessonsForDay = (day: Date) =>
    lessons.filter(l => l.lesson_date && isSameDay(parseISO(l.lesson_date), day));

  const navigate_ = (dir: -1 | 1) => {
    if (viewMode === "week") {
      setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const openQuickAdd = (day: Date) => {
    setQuickAddDate(format(day, "yyyy-MM-dd"));
    setQuickAddTitle("");
    setQuickAddUnitId("");
    setQuickAddOpen(true);
  };

  const handleQuickAdd = async () => {
    if (!user || !quickAddTitle.trim()) return;
    setQuickAddSaving(true);
    const { data, error } = await supabase.from("lesson_plans").insert({
      user_id: user.id,
      unit_id: quickAddUnitId && quickAddUnitId !== "none" ? quickAddUnitId : null,
      title: quickAddTitle.trim(),
      lesson_date: quickAddDate,
      duration_minutes: 50,
      sort_order: 0,
    }).select().single();

    setQuickAddSaving(false);
    if (error) {
      toast({ title: "Error creating lesson", description: error.message, variant: "destructive" });
      return;
    }
    setQuickAddOpen(false);
    toast({ title: "Lesson created" });
    fetchLessons();
    if (data) navigate(`/lessons/${data.id}`);
  };

  const headerLabel = viewMode === "week"
    ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  return (
    <div className="mb-6 bg-primary-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground border-2 border-primary-foreground">{headerLabel}</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* View toggle */}
          <div className="flex items-center border border-border/60 rounded-lg p-0.5 mr-2">
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 rounded-md text-xs gap-1 bg-primary-foreground text-card-foreground border-2 border-card-foreground"
              onClick={() => setViewMode("week")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Week
            </Button>
            <Button
              variant={viewMode === "month" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 rounded-md text-xs gap-1"
              onClick={() => setViewMode("month")}
            >
              <CalendarRange className="h-3.5 w-3.5" /> Month
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigate_(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-lg text-xs font-medium px-2 h-8" onClick={goToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigate_(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekly View */}
      {viewMode === "week" && (
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map(day => {
            const dayLessons = getLessonsForDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className="space-y-1.5 border-4 border-primary-foreground">
                <div className={`text-center text-xs font-medium py-1 rounded-lg bg-primary-foreground text-card-foreground border-2 border-card-foreground text-popover-foreground ${today ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  <div className="text-card-foreground">{format(day, "EEE")}</div>
                  <div className={`text-sm font-semibold text-card-foreground bg-primary-foreground border-0 ${today ? "" : "text-foreground"}`}>{format(day, "d")}</div>
                </div>
                {loading ? (
                  <div className="h-16 rounded-xl bg-muted/50 animate-pulse" />
                ) : (
                  <>
                    {dayLessons.map(lesson => {
                      const color = getUnitColor(lesson.unit_id);
                      return (
                        <Card
                          key={lesson.id}
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] border ${color.border} ${color.bg}`}
                          onClick={() => navigate(`/lessons/${lesson.id}`)}
                        >
                          <CardContent className="p-2">
                            <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{lesson.title}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{lesson.duration_minutes}m</span>
                            </div>
                            {lesson.unit_title && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${color.dot}`} />
                                <span className={`text-[9px] truncate ${color.text}`}>{lesson.unit_title}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    <button
                      onClick={() => openQuickAdd(day)}
                      className="w-full h-7 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors bg-primary-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly View */}
      {viewMode === "month" && (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthGridDays.map(day => {
              const dayLessons = getLessonsForDay(day);
              const today = isToday(day);
              const inMonth = isSameMonth(day, currentDate);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[72px] rounded-lg border p-1 transition-colors ${
                    !inMonth ? "opacity-30 border-transparent" :
                    isWeekend ? "bg-muted/30 border-border/30" :
                    today ? "border-primary/40 bg-primary/5" :
                    "border-border/40 hover:border-border/60"
                  }`}
                >
                  <div className={`text-[10px] font-medium mb-0.5 ${
                    today ? "text-primary font-bold" : inMonth ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {format(day, "d")}
                  </div>
                  {!loading && !isWeekend && inMonth && (
                    <>
                      {dayLessons.slice(0, 2).map(lesson => {
                        const color = getUnitColor(lesson.unit_id);
                        return (
                          <div
                            key={lesson.id}
                            onClick={() => navigate(`/lessons/${lesson.id}`)}
                            className={`text-[9px] leading-tight px-1 py-0.5 rounded cursor-pointer transition-colors truncate mb-0.5 ${color.bg} ${color.text} hover:opacity-80`}
                            title={lesson.title}
                          >
                            {lesson.title}
                          </div>
                        );
                      })}
                      {dayLessons.length > 2 && (
                        <div className="text-[9px] text-muted-foreground px-1">+{dayLessons.length - 2} more</div>
                      )}
                      {dayLessons.length === 0 && (
                        <button
                          onClick={() => openQuickAdd(day)}
                          className="w-full h-5 rounded border border-dashed border-transparent hover:border-border/60 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && lessons.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          No lessons scheduled for this {viewMode === "week" ? "week" : "month"}
        </p>
      )}

      {/* Quick-add dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick Add Lesson – {quickAddDate && format(parseISO(quickAddDate), "EEE, MMM d")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input
                placeholder="e.g. Introduction to Ecosystems"
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === "Enter" && quickAddTitle.trim() && handleQuickAdd()}
              />
            </div>
            {units.length > 0 && (
              <div className="space-y-2">
                <Label>Unit (optional)</Label>
                <Select value={quickAddUnitId} onValueChange={setQuickAddUnitId}>
                  <SelectTrigger><SelectValue placeholder="Standalone lesson" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Standalone lesson</SelectItem>
                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleQuickAdd} className="w-full rounded-xl" disabled={!quickAddTitle.trim() || quickAddSaving}>
              {quickAddSaving ? "Creating..." : "Create & Edit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
