import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { PageBanner } from "@/components/PageBanner";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivityPlayer } from "@/components/activities/ActivityPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_TYPES, getDefaultContent } from "@/lib/h5p-types";
import type { ActivityType, ActivityContent } from "@/lib/h5p-types";
import { Plus, Puzzle, Search, ArrowLeft } from "lucide-react";

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  content: any;
  updated_at: string;
}

export default function ActivityBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ActivityType>("fill_in_blanks");

  // Preview dialog
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);

  const fetchActivities = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("h5p_activities")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setActivities((data as Activity[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchActivities(); }, [user]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    const content = getDefaultContent(newType);
    const { data, error } = await supabase
      .from("h5p_activities")
      .insert({ user_id: user.id, title: newTitle.trim(), activity_type: newType, content: content as any })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setShowCreate(false);
    setNewTitle("");
    navigate(`/activities/${(data as any).id}`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("h5p_activities").delete().eq("id", id);
    setActivities(prev => prev.filter(a => a.id !== id));
    toast({ title: "Activity deleted" });
  };

  const filtered = activities.filter(a => {
    if (filterType !== "all" && a.activity_type !== filterType) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold text-foreground flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-primary" />
          Activity Builder
        </span>
      </header>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        <PageBanner
          greeting="Activity Builder"
          subtitle="Create interactive H5P-style activities for your students"
          compact
        />

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ACTIVITY_TYPES.map(t => (
                <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Activity
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <Puzzle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {activities.length === 0 ? "No activities yet. Create your first one!" : "No matching activities."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <ActivityCard
                key={a.id}
                id={a.id}
                title={a.title}
                activityType={a.activity_type}
                updatedAt={a.updated_at}
                onPlay={() => setPreviewActivity(a)}
                onEdit={() => navigate(`/activities/${a.id}`)}
                onDelete={() => handleDelete(a.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My Activity" className="mt-1.5" />
            </div>
            <div>
              <Label>Activity Type</Label>
              <Select value={newType} onValueChange={v => setNewType(v as ActivityType)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t.type} value={t.type}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={!newTitle.trim()} className="w-full">
              Create Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewActivity} onOpenChange={() => setPreviewActivity(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewActivity?.title}</DialogTitle>
          </DialogHeader>
          {previewActivity && (
            <ActivityPlayer
              type={previewActivity.activity_type as ActivityType}
              content={previewActivity.content as ActivityContent}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
