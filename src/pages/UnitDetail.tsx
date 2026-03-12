import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Calendar, List, Trash2, GripVertical, Clock, Sparkles, Download, Lock } from "lucide-react";
import { AppNavSheet } from "@/components/AppNavSheet";
import { GenerateEscapeRoomDialog } from "@/components/GenerateEscapeRoomDialog";
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval, isWeekend, isSameDay, parseISO, addDays } from "date-fns";
import { GenerateLessonDialog } from "@/components/GenerateLessonDialog";
import { exportUnitToDocx } from "@/lib/export-lesson-docx";
import type { Json } from "@/integrations/supabase/types";

interface Unit {
  id: string;
  title: string;
  description: string;
  grade_level: string;
  discipline: string;
  date_start: string | null;
  date_end: string | null;
}

interface LessonPlan {
  id: string;
  title: string;
  lesson_date: string | null;
  duration_minutes: number;
  objectives: string;
  activities: Activity[];
  materials: string;
  assessment: string;
  differentiation: string;
  notes: string;
  sort_order: number;
  standards?: { ngss_code: string; ngss_description: string }[];
}

interface Activity {
  name: string;
  duration: number;
  description: string;
}

const UnitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [lessons, setLessons] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [escapeRoomOpen, setEscapeRoomOpen] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", lesson_date: "", duration_minutes: 50 });
  const [activeTab, setActiveTab] = useState("list");

  const fetchData = async () => {
    if (!user || !id) return;
    const [unitRes, lessonsRes] = await Promise.all([
      supabase.from("units").select("*").eq("id", id).eq("user_id", user.id).single(),
      supabase.from("lesson_plans").select("*").eq("unit_id", id).eq("user_id", user.id).order("sort_order"),
    ]);

    if (unitRes.error || !unitRes.data) {
      toast({ title: "Unit not found", variant: "destructive" });
      navigate("/lesson-planner");
      return;
    }

    // Fetch standards for all lessons
    const lessonIds = (lessonsRes.data || []).map(l => l.id);
    let standardsMap: Record<string, { ngss_code: string; ngss_description: string }[]> = {};
    if (lessonIds.length > 0) {
      const { data: stds } = await supabase
        .from("lesson_plan_standards")
        .select("*")
        .in("lesson_plan_id", lessonIds);
      (stds || []).forEach(s => {
        if (!standardsMap[s.lesson_plan_id]) standardsMap[s.lesson_plan_id] = [];
        standardsMap[s.lesson_plan_id].push({ ngss_code: s.ngss_code, ngss_description: s.ngss_description });
      });
    }

    setUnit(unitRes.data);
    setLessons((lessonsRes.data || []).map(l => ({
      ...l,
      activities: (Array.isArray(l.activities) ? l.activities : []) as unknown as Activity[],
      standards: standardsMap[l.id] || [],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, id]);

  const handleCreateLesson = async () => {
    if (!user || !id || !newLesson.title.trim()) return;
    const { error } = await supabase.from("lesson_plans").insert({
      user_id: user.id,
      unit_id: id,
      title: newLesson.title.trim(),
      lesson_date: newLesson.lesson_date || null,
      duration_minutes: newLesson.duration_minutes,
      sort_order: lessons.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setCreateOpen(false);
    setNewLesson({ title: "", lesson_date: "", duration_minutes: 50 });
    fetchData();
    toast({ title: "Lesson added" });
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const { error } = await supabase.from("lesson_plans").delete().eq("id", lessonId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  // NGSS coverage across unit
  const allStandards = useMemo(() => {
    const map = new Map<string, string>();
    lessons.forEach(l => l.standards?.forEach(s => map.set(s.ngss_code, s.ngss_description)));
    return Array.from(map.entries()).map(([code, desc]) => ({ code, description: desc }));
  }, [lessons]);

  // Calendar data
  const calendarDays = useMemo(() => {
    if (!unit?.date_start || !unit?.date_end) return [];
    try {
      const start = parseISO(unit.date_start);
      const end = parseISO(unit.date_end);
      return eachDayOfInterval({ start, end }).filter(d => !isWeekend(d));
    } catch { return []; }
  }, [unit]);

  const getLessonForDay = (day: Date) => {
    return lessons.find(l => l.lesson_date && isSameDay(parseISO(l.lesson_date), day));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!unit) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <div className="flex-1 min-w-0">
          <span className="text-base font-semibold text-foreground truncate block">{unit.title}</span>
          <span className="text-xs text-muted-foreground">
            {[unit.discipline, unit.grade_level].filter(Boolean).join(" • ")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-primary rounded-xl gap-1.5 text-sm" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="h-4 w-4" /> AI Generate
          </Button>
          <Button variant="ghost" size="sm" className="text-primary rounded-xl gap-1.5 text-sm" onClick={() => setEscapeRoomOpen(true)}>
            <Lock className="h-4 w-4" /> Escape Room
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary rounded-xl gap-1.5 text-sm"
            onClick={() => exportUnitToDocx(unit, lessons)}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* NGSS Coverage */}
        {allStandards.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">NGSS Coverage</h3>
            <div className="flex flex-wrap gap-1.5">
              {allStandards.map(s => (
                <Badge key={s.code} variant="secondary" className="text-xs">{s.code}</Badge>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="rounded-xl">
              <TabsTrigger value="list" className="rounded-lg gap-1.5"><List className="h-3.5 w-3.5" /> Lessons</TabsTrigger>
              <TabsTrigger value="calendar" className="rounded-lg gap-1.5" disabled={!unit.date_start}><Calendar className="h-3.5 w-3.5" /> Pacing</TabsTrigger>
            </TabsList>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-xl"><Plus className="h-4 w-4" /> Add Lesson</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Lesson Title</Label>
                    <Input placeholder="e.g. Introduction to Ecosystems" value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={newLesson.lesson_date} onChange={e => setNewLesson(p => ({ ...p, lesson_date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (min)</Label>
                      <Input type="number" value={newLesson.duration_minutes} onChange={e => setNewLesson(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 50 }))} />
                    </div>
                  </div>
                  <Button onClick={handleCreateLesson} className="w-full rounded-xl" disabled={!newLesson.title.trim()}>Add Lesson</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="list">
            {lessons.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="text-lg font-semibold mb-1">No lessons yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add lessons manually or use AI to generate a full plan</p>
                  <div className="flex gap-2">
                    <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Add Manually</Button>
                    <Button onClick={() => setGenerateOpen(true)} className="gap-2 rounded-xl"><Sparkles className="h-4 w-4" /> AI Generate</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, idx) => (
                  <Card
                    key={lesson.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">{lesson.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {lesson.lesson_date && <span>{format(parseISO(lesson.lesson_date), "MMM d")}</span>}
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{lesson.duration_minutes}m</span>
                          {lesson.standards && lesson.standards.length > 0 && (
                            <span>{lesson.standards.length} standard{lesson.standards.length > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                      {lesson.objectives && (
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate hidden md:block">{lesson.objectives}</p>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="shrink-0 h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={e => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            {calendarDays.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Set start and end dates on your unit to see the pacing calendar.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => (
                  <div key={d} className="text-xs font-medium text-muted-foreground text-center py-1">{d}</div>
                ))}
                {/* Pad to correct weekday (Mon=0) */}
                {Array.from({ length: (calendarDays[0].getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {calendarDays.map(day => {
                  const lesson = getLessonForDay(day);
                  return (
                    <Card
                      key={day.toISOString()}
                      className={`min-h-[72px] cursor-pointer transition-all duration-150 hover:shadow-sm ${lesson ? "bg-primary/5 border-primary/20" : ""}`}
                      onClick={() => lesson && navigate(`/lessons/${lesson.id}`)}
                    >
                      <CardContent className="p-2">
                        <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
                        {lesson && (
                          <div className="mt-1 text-xs font-medium text-foreground line-clamp-2">{lesson.title}</div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <GenerateLessonDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        unitId={id!}
        unitTitle={unit.title}
        discipline={unit.discipline}
        gradeLevel={unit.grade_level}
        onGenerated={fetchData}
      />

      <GenerateEscapeRoomDialog
        open={escapeRoomOpen}
        onOpenChange={setEscapeRoomOpen}
        context={{
          title: unit.title,
          topic: unit.title,
          gradeLevel: unit.grade_level,
          discipline: unit.discipline,
        }}
      />
    </div>
  );
};

export default UnitDetail;
