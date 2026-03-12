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
import { ChevronLeft, ChevronRight, Clock, Layers, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface UnitOption {
  id: string;
  title: string;
}

export function WeeklyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<UnitOption[]>([]);

  // Quick-add state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddUnitId, setQuickAddUnitId] = useState<string>("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => d.getDay() !== 0 && d.getDay() !== 6),
    [weekStart, weekEnd]
  );

  const fetchLessons = async () => {
    if (!user) return;
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

    const unitIds = [...new Set(data.filter(l => l.unit_id).map(l => l.unit_id!))];
    let unitMap: Record<string, string> = {};
    if (unitIds.length > 0) {
      const { data: u } = await supabase.from("units").select("id, title").in("id", unitIds);
      (u || []).forEach(u => { unitMap[u.id] = u.title; });
    }

    setLessons(data.map(l => ({ ...l, unit_title: l.unit_id ? unitMap[l.unit_id] : undefined })));
    setLoading(false);
  };

  useEffect(() => { fetchLessons(); }, [user, weekStart]);

  // Fetch units once for the quick-add picker
  useEffect(() => {
    if (!user) return;
    supabase.from("units").select("id, title").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setUnits(data || []));
  }, [user]);

  const getLessonsForDay = (day: Date) =>
    lessons.filter(l => l.lesson_date && isSameDay(parseISO(l.lesson_date), day));

  const hasAnyLessons = lessons.length > 0;

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
              ) : (
                <>
                  {dayLessons.map(lesson => (
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
                  ))}
                  <button
                    onClick={() => openQuickAdd(day)}
                    className="w-full h-7 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </>
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
