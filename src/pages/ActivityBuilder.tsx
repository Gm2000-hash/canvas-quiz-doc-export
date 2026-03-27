import { useState, useEffect, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageBanner } from "@/components/PageBanner";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivityPlayer } from "@/components/activities/ActivityPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActivityStandards, type ActivityStandard } from "@/hooks/useActivityStandards";
import { useProfileDefaults } from "@/hooks/useProfileDefaults";
import { ACTIVITY_TYPES, getDefaultContent } from "@/lib/h5p-types";
import type { ActivityType, ActivityContent } from "@/lib/h5p-types";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { ALL_IDAHO_STANDARDS, ALL_IDAHO_STANDARDS_FLAT, IDAHO_CATEGORY_LABELS } from "@/lib/idaho-standards-data";
import { Plus, Puzzle, Search, Sparkles, Loader2, LayoutGrid, List, FileText, BookOpen } from "lucide-react";

interface SourceOption { id: string; title: string; type: "lesson_plan" | "curriculum_lesson"; }

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  content: any;
  updated_at: string;
}

export default function ActivityBuilder() {
  usePageTitle("Activity Builder");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { tagActivity, fetchStandards } = useActivityStandards();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [standardsMap, setStandardsMap] = useState<Record<string, ActivityStandard[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ActivityType>("fill_in_blanks");
  const [useAI, setUseAI] = useState(false);
  const [aiSourceMode, setAiSourceMode] = useState<"lesson" | "standard">("lesson");
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedStandard, setSelectedStandard] = useState<{ code: string; description: string } | null>(null);
  const [standardFramework, setStandardFramework] = useState<"ngss" | "idaho">("idaho");
  const [idahoFilter, setIdahoFilter] = useState<string>("all");
  const [standardSearch, setStandardSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const { defaultFramework } = useProfileDefaults();

  const filteredStandards = useMemo(() => {
    let list: { code: string; description: string; category?: string }[] = [];
    if (standardFramework === "ngss") {
      list = Object.values(ALL_SUBSTANDARDS).flat();
    } else {
      let stds = ALL_IDAHO_STANDARDS_FLAT as { code: string; description: string; category?: string; subject?: string; grade?: string }[];
      if (idahoFilter !== "all") {
        const [subject, grade] = idahoFilter.split("|");
        stds = stds.filter(s => s.subject === subject && s.grade === grade);
      }
      list = stds;
    }
    if (standardSearch.trim()) {
      const q = standardSearch.toLowerCase();
      list = list.filter(s => s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return list;
  }, [standardFramework, idahoFilter, standardSearch]);

  // Preview dialog
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);

  const fetchActivities = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("h5p_activities")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    const acts = (data as Activity[]) ?? [];
    setActivities(acts);
    setLoading(false);

    // Fetch standards for all activities
    if (acts.length > 0) {
      const map = await fetchStandards(acts.map(a => a.id));
      setStandardsMap(map);
    }
  };

  useEffect(() => { fetchActivities(); }, [user]);

  // Fetch sources when AI toggle is enabled
  useEffect(() => {
    if (!useAI || !user || sourcesLoaded) return;
    Promise.all([
      supabase.from("lesson_plans").select("id, title").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("curriculum_lessons").select("id, title").eq("user_id", user.id).order("updated_at", { ascending: false }),
    ]).then(([lp, cl]) => {
      const opts: SourceOption[] = [
        ...((lp.data || []) as any[]).map(d => ({ id: d.id, title: d.title, type: "lesson_plan" as const })),
        ...((cl.data || []) as any[]).map(d => ({ id: d.id, title: d.title, type: "curriculum_lesson" as const })),
      ];
      setSources(opts);
      setSourcesLoaded(true);
      if (opts.length > 0) setSelectedSource(opts[0].id);
    });
  }, [useAI, user, sourcesLoaded]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;

    if (useAI) {
      let invokeBody: any;

      if (aiSourceMode === "standard" && selectedStandard) {
        invokeBody = {
          activityType: newType,
          sourceType: "standard",
          standardCode: selectedStandard.code,
          standardDescription: selectedStandard.description,
        };
      } else if (aiSourceMode === "lesson" && selectedSource) {
        const source = sources.find(s => s.id === selectedSource);
        if (!source) return;
        invokeBody = { activityType: newType, sourceType: source.type, sourceId: source.id };
      } else {
        return;
      }

      setGenerating(true);
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("generate-h5p-activity", {
          body: invokeBody,
        });
        if (fnData?.error) throw new Error(fnData.error);
        if (fnError) throw fnError;
        if (!fnData?.content) throw new Error("No content generated");
        const content = fnData.content;
        const { data, error } = await supabase
          .from("h5p_activities")
          .insert({ user_id: user.id, title: newTitle.trim(), activity_type: newType, content: content as any })
          .select()
          .single();
        if (error) throw error;
        const actId = (data as any).id;

        // If generated from a standard, auto-link that standard
        if (aiSourceMode === "standard" && selectedStandard) {
          await supabase.from("h5p_activity_standards").insert({
            activity_id: actId,
            ngss_code: selectedStandard.code,
            ngss_description: selectedStandard.description,
          });
        }

        setShowCreate(false);
        setNewTitle("");
        setUseAI(false);
        toast({ title: "Activity generated with AI!" });

        // Auto-tag with NGSS standards (non-blocking)
        tagActivity(actId, newType, content, newTitle.trim());

        navigate(`/activities/${actId}`);
      } catch (err: any) {
        toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      } finally {
        setGenerating(false);
      }
      return;
    }

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

  const handleDuplicate = async (activity: Activity) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("h5p_activities")
      .insert({
        user_id: user.id,
        title: `${activity.title} (Copy)`,
        activity_type: activity.activity_type,
        content: activity.content,
      })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Activity duplicated" });
    // Also duplicate standards
    const existingStandards = standardsMap[activity.id];
    if (existingStandards && existingStandards.length > 0) {
      await supabase.from("h5p_activity_standards").insert(
        existingStandards.map(s => ({
          activity_id: (data as any).id,
          ngss_code: s.ngss_code,
          ngss_description: s.ngss_description,
          matched_terms: s.matched_terms || [],
        }))
      );
    }
    fetchActivities();
  };

  const filtered = activities.filter(a => {
    if (filterType !== "all" && a.activity_type !== filterType) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group activities by type for library view
  const grouped = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filtered.forEach(a => {
      if (!map.has(a.activity_type)) map.set(a.activity_type, []);
      map.get(a.activity_type)!.push(a);
    });
    // Sort groups by ACTIVITY_TYPES order
    const sorted: { type: string; label: string; activities: Activity[] }[] = [];
    ACTIVITY_TYPES.forEach(t => {
      const acts = map.get(t.type);
      if (acts && acts.length > 0) {
        sorted.push({ type: t.type, label: t.label, activities: acts });
      }
    });
    return sorted;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <Breadcrumbs items={[{ label: "Activity Builder" }]} />
      </header>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        <PageBanner
          greeting="Activity Library"
          subtitle="Browse, create and manage interactive H5P-style activities organized by type"
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
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
            <Button
              variant={viewMode === "grouped" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grouped")}
              title="Grouped view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
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
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {filtered.map(a => (
              <ActivityCard
                key={a.id}
                id={a.id}
                title={a.title}
                activityType={a.activity_type}
                updatedAt={a.updated_at}
                standards={standardsMap[a.id]}
                onPlay={() => setPreviewActivity(a)}
                onEdit={() => navigate(`/activities/${a.id}`)}
                onDuplicate={() => handleDuplicate(a)}
                onDelete={() => handleDelete(a.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.type}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                  <Badge variant="secondary" className="text-xs">{group.activities.length}</Badge>
                </div>
                <div className="space-y-2 pl-1">
                  {group.activities.map(a => (
                    <ActivityCard
                      key={a.id}
                      id={a.id}
                      title={a.title}
                      activityType={a.activity_type}
                      updatedAt={a.updated_at}
                      standards={standardsMap[a.id]}
                      onPlay={() => setPreviewActivity(a)}
                      onEdit={() => navigate(`/activities/${a.id}`)}
                      onDuplicate={() => handleDuplicate(a)}
                      onDelete={() => handleDelete(a.id)}
                    />
                  ))}
                </div>
              </div>
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

            {/* AI Generation Toggle */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Sparkles className="h-4 w-4 text-primary" /> Generate with AI
                </Label>
                <Switch checked={useAI} onCheckedChange={setUseAI} />
              </div>
              {useAI && (
                <div className="space-y-3">
                  {/* Source mode toggle */}
                  <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
                    <button
                      onClick={() => setAiSourceMode("lesson")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        aiSourceMode === "lesson"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <FileText className="h-3 w-3" /> From Lesson
                    </button>
                    <button
                      onClick={() => setAiSourceMode("standard")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        aiSourceMode === "standard"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <BookOpen className="h-3 w-3" /> From Standard
                    </button>
                  </div>

                  {aiSourceMode === "lesson" ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Source lesson or reading</Label>
                      {!sourcesLoaded ? (
                        <p className="text-xs text-muted-foreground mt-1">Loading sources…</p>
                      ) : sources.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">No lessons found. Create a lesson plan or curriculum lesson first.</p>
                      ) : (
                        <Select value={selectedSource} onValueChange={setSelectedSource}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select a lesson..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sources.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                <span className="mr-1.5 text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                                  {s.type === "lesson_plan" ? "Plan" : "Curriculum"}
                                </span>
                                {s.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Framework</Label>
                      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
                        <button
                          onClick={() => setStandardFramework("idaho")}
                          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            standardFramework === "idaho"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          Idaho
                        </button>
                        <button
                          onClick={() => setStandardFramework("ngss")}
                          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            standardFramework === "ngss"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          NGSS
                        </button>
                      </div>

                      {standardFramework === "idaho" && (
                        <Select value={idahoFilter} onValueChange={setIdahoFilter}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="All subjects" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subjects & Grades</SelectItem>
                            {ALL_IDAHO_STANDARDS.map(gs => (
                              <SelectItem key={`${gs.subject}|${gs.grade}`} value={`${gs.subject}|${gs.grade}`}>
                                {gs.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Input
                        placeholder="Search standards..."
                        value={standardSearch}
                        onChange={e => setStandardSearch(e.target.value)}
                        className="h-8 text-xs"
                      />

                      <ScrollArea className="h-[180px] border rounded-md">
                        <div className="p-1 space-y-0.5">
                          {filteredStandards.map(s => (
                            <button
                              key={s.code + (s.category || "")}
                              onClick={() => setSelectedStandard({ code: s.code, description: s.description })}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                                selectedStandard?.code === s.code
                                  ? "bg-primary/10 border border-primary/30"
                                  : "hover:bg-accent/50"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">{s.code}</span>
                                {s.category && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                                    {IDAHO_CATEGORY_LABELS[s.category] || s.category}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground leading-snug line-clamp-2">{s.description}</p>
                            </button>
                          ))}
                          {filteredStandards.length === 0 && (
                            <p className="text-xs text-muted-foreground p-3 text-center">No matching standards</p>
                          )}
                        </div>
                      </ScrollArea>
                      {selectedStandard && (
                        <div className="mt-2 p-2 rounded-md bg-muted/50 border border-border">
                          <Badge variant="default" className="text-[10px]">{selectedStandard.code}</Badge>
                          <p className="text-[11px] text-muted-foreground mt-1">{selectedStandard.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || generating || (useAI && aiSourceMode === "lesson" && !selectedSource) || (useAI && aiSourceMode === "standard" && !selectedStandard)}
              className="w-full gap-2"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : useAI ? (
                <><Sparkles className="h-4 w-4" /> Generate Activity</>
              ) : (
                "Create Activity"
              )}
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
