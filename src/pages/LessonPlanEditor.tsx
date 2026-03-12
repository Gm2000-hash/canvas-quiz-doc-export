import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, Clock, Target, BookOpen, CheckCircle, Users, StickyNote, GraduationCap } from "lucide-react";
import { AppNavSheet } from "@/components/AppNavSheet";
import { useToast } from "@/hooks/use-toast";
import { LessonStandardsPicker } from "@/components/LessonStandardsPicker";
import type { Json } from "@/integrations/supabase/types";

interface Activity {
  name: string;
  duration: number;
  description: string;
}

interface VocabularyItem {
  term: string;
  definition: string;
}

interface LessonPlan {
  id: string;
  unit_id: string | null;
  title: string;
  lesson_date: string | null;
  duration_minutes: number;
  objectives: string;
  activities: Activity[];
  materials: string;
  assessment: string;
  differentiation: string;
  notes: string;
  vocabulary: VocabularyItem[];
}

interface Standard {
  id: string;
  ngss_code: string;
  ngss_description: string;
}

const LessonPlanEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [standardsOpen, setStandardsOpen] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      const [lessonRes, stdsRes] = await Promise.all([
        supabase.from("lesson_plans").select("*").eq("id", id).eq("user_id", user.id).single(),
        supabase.from("lesson_plan_standards").select("*").eq("lesson_plan_id", id),
      ]);
      if (lessonRes.error || !lessonRes.data) {
        toast({ title: "Lesson not found", variant: "destructive" });
        navigate(-1);
        return;
      }
      setLesson({
        ...lessonRes.data,
        activities: (Array.isArray(lessonRes.data.activities) ? lessonRes.data.activities : []) as unknown as Activity[],
        vocabulary: (Array.isArray((lessonRes.data as any).vocabulary) ? (lessonRes.data as any).vocabulary : []) as VocabularyItem[],
      });
      setStandards(stdsRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [user, id]);

  const handleSave = async () => {
    if (!lesson || !user) return;
    setSaving(true);
    const { error } = await supabase.from("lesson_plans").update({
      title: lesson.title,
      lesson_date: lesson.lesson_date || null,
      duration_minutes: lesson.duration_minutes,
      objectives: lesson.objectives,
      activities: lesson.activities as unknown as Json,
      materials: lesson.materials,
      assessment: lesson.assessment,
      differentiation: lesson.differentiation,
      notes: lesson.notes,
      vocabulary: lesson.vocabulary as unknown as Json,
      updated_at: new Date().toISOString(),
    } as any).eq("id", lesson.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lesson saved" });
  };

  const addActivity = () => {
    if (!lesson) return;
    setLesson({
      ...lesson,
      activities: [...lesson.activities, { name: "", duration: 10, description: "" }],
    });
  };

  const updateActivity = (idx: number, field: keyof Activity, value: string | number) => {
    if (!lesson) return;
    const acts = [...lesson.activities];
    acts[idx] = { ...acts[idx], [field]: value };
    setLesson({ ...lesson, activities: acts });
  };

  const removeActivity = (idx: number) => {
    if (!lesson) return;
    setLesson({ ...lesson, activities: lesson.activities.filter((_, i) => i !== idx) });
  };

  const addVocabulary = () => {
    if (!lesson) return;
    setLesson({ ...lesson, vocabulary: [...lesson.vocabulary, { term: "", definition: "" }] });
  };

  const updateVocabulary = (idx: number, field: keyof VocabularyItem, value: string) => {
    if (!lesson) return;
    const vocab = [...lesson.vocabulary];
    vocab[idx] = { ...vocab[idx], [field]: value };
    setLesson({ ...lesson, vocabulary: vocab });
  };

  const removeVocabulary = (idx: number) => {
    if (!lesson) return;
    setLesson({ ...lesson, vocabulary: lesson.vocabulary.filter((_, i) => i !== idx) });
  };

  const handleStandardsChange = async (selected: { code: string; description: string }[]) => {
    if (!id) return;
    // Delete existing then insert new
    await supabase.from("lesson_plan_standards").delete().eq("lesson_plan_id", id);
    if (selected.length > 0) {
      await supabase.from("lesson_plan_standards").insert(
        selected.map(s => ({ lesson_plan_id: id, ngss_code: s.code, ngss_description: s.description }))
      );
    }
    const { data } = await supabase.from("lesson_plan_standards").select("*").eq("lesson_plan_id", id);
    setStandards(data || []);
  };

  const totalActivityTime = lesson?.activities.reduce((s, a) => s + (a.duration || 0), 0) || 0;

  if (loading || !lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <div className="flex-1 min-w-0">
          <Input
            value={lesson.title}
            onChange={e => setLesson({ ...lesson, title: e.target.value })}
            className="border-none bg-transparent text-base font-semibold h-8 px-0 focus-visible:ring-0"
            placeholder="Lesson title..."
          />
        </div>
        <Button size="sm" className="gap-1.5 rounded-xl" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </header>

      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={lesson.lesson_date || ""} onChange={e => setLesson({ ...lesson, lesson_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Duration (minutes)</Label>
            <Input type="number" value={lesson.duration_minutes} onChange={e => setLesson({ ...lesson, duration_minutes: parseInt(e.target.value) || 50 })} />
          </div>
        </div>

        {/* Standards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> NGSS Standards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {standards.length === 0 ? (
                <p className="text-xs text-muted-foreground">No standards tagged yet</p>
              ) : standards.map(s => (
                <Badge key={s.id} variant="secondary" className="text-xs">{s.ngss_code}</Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setStandardsOpen(true)}>
              Edit Standards
            </Button>
            <LessonStandardsPicker
              open={standardsOpen}
              onOpenChange={setStandardsOpen}
              selected={standards.map(s => ({ code: s.ngss_code, description: s.ngss_description }))}
              onSave={handleStandardsChange}
            />
          </CardContent>
        </Card>

        {/* Objectives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Learning Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Students will be able to..."
              value={lesson.objectives}
              onChange={e => setLesson({ ...lesson, objectives: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Activities & Timing */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Activities & Timing</CardTitle>
              <span className={`text-xs font-medium ${totalActivityTime > lesson.duration_minutes ? "text-destructive" : "text-muted-foreground"}`}>
                {totalActivityTime}/{lesson.duration_minutes} min
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.activities.map((act, idx) => (
              <div key={idx} className="flex gap-2 items-start p-3 rounded-xl bg-accent/50">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Activity name"
                      value={act.name}
                      onChange={e => updateActivity(idx, "name", e.target.value)}
                      className="text-sm h-8"
                    />
                    <Input
                      type="number"
                      value={act.duration}
                      onChange={e => updateActivity(idx, "duration", parseInt(e.target.value) || 0)}
                      className="w-20 text-sm h-8"
                      placeholder="min"
                    />
                  </div>
                  <Textarea
                    placeholder="Description..."
                    value={act.description}
                    onChange={e => updateActivity(idx, "description", e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeActivity(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full rounded-xl gap-1.5" onClick={addActivity}>
              <Plus className="h-3.5 w-3.5" /> Add Activity
            </Button>
          </CardContent>
        </Card>

        {/* Materials */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Materials & Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="List materials, links, handouts..."
              value={lesson.materials}
              onChange={e => setLesson({ ...lesson, materials: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Assessment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="How will you assess student understanding?"
              value={lesson.assessment}
              onChange={e => setLesson({ ...lesson, assessment: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Differentiation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Differentiation</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Accommodations, extensions, ELL support..."
              value={lesson.differentiation}
              onChange={e => setLesson({ ...lesson, differentiation: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" /> Teacher Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Additional notes, reminders..."
              value={lesson.notes}
              onChange={e => setLesson({ ...lesson, notes: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="h-8" />
      </main>
    </div>
  );
};

export default LessonPlanEditor;
