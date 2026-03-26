import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityPlayer } from "@/components/activities/ActivityPlayer";
import { FillInBlanksEditor } from "@/components/activities/editors/FillInBlanksEditor";
import { DragTheWordsEditor } from "@/components/activities/editors/DragTheWordsEditor";
import { AccordionEditor } from "@/components/activities/editors/AccordionEditor";
import { TimelineEditor } from "@/components/activities/editors/TimelineEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_TYPES } from "@/lib/h5p-types";
import type { ActivityType, ActivityContent, FillInBlanksContent, DragTheWordsContent, AccordionContent, TimelineContent } from "@/lib/h5p-types";
import { ArrowLeft, Save, Puzzle } from "lucide-react";

export default function ActivityEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("fill_in_blanks");
  const [content, setContent] = useState<ActivityContent>({ text: "", acceptAlternatives: true });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    supabase.from("h5p_activities").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { navigate("/activities"); return; }
      setTitle((data as any).title);
      setActivityType((data as any).activity_type as ActivityType);
      setContent((data as any).content as ActivityContent);
      setLoading(false);
    });
  }, [id, user]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("h5p_activities").update({
      title, content: content as any, updated_at: new Date().toISOString()
    }).eq("id", id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Activity saved" });
  };

  const typeInfo = ACTIVITY_TYPES.find(t => t.type === activityType);

  const renderEditor = () => {
    switch (activityType) {
      case "fill_in_blanks":
        return <FillInBlanksEditor content={content as FillInBlanksContent} onChange={setContent} />;
      case "drag_the_words":
        return <DragTheWordsEditor content={content as DragTheWordsContent} onChange={setContent} />;
      case "accordion":
        return <AccordionEditor content={content as AccordionContent} onChange={setContent} />;
      case "timeline":
        return <TimelineEditor content={content as TimelineContent} onChange={setContent} />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/activities")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold text-foreground flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-primary" />
          {typeInfo?.label ?? "Activity"}
        </span>
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving..." : "Save"}
        </Button>
      </header>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <Label className="text-sm font-medium">Activity Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 text-lg font-semibold" />
        </div>

        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Card className="p-6">
              {renderEditor()}
            </Card>
          </TabsContent>
          <TabsContent value="preview">
            <Card className="p-6">
              <ActivityPlayer type={activityType} content={content} />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
