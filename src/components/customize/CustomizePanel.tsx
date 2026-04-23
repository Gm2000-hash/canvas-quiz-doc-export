import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FILTER_PRESETS } from "@/lib/customization-types";
import type { CustomWidget, WallpaperFilters } from "@/lib/customization-types";
import { Upload, Sparkles, Trash2, Palette, Image as ImageIcon, Plus, Type, Heading, Minus, MoveVertical, Link2, Loader2, Save, RotateCcw, Layers, ChevronUp, ChevronDown, Crosshair, GripVertical } from "lucide-react";
import { toast } from "sonner";

const COLOR_PROPS = ["bg", "text", "border"] as const;
type ColorProp = typeof COLOR_PROPS[number];

export function CustomizePanel() {
  const {
    editMode, setEditMode, panelOpen, setPanelOpen, selectedElement, setSelectedElement,
    pageScopeKey, get, mutate, addWidget, hasDraft, saveAll, discardDraft, publicUrl,
  } = useTheme();
  const { user } = useAuth();

  const page = get("page", pageScopeKey);
  const global = get("global", "global");
  const wpScope: "page" | "global" = page.wallpaper_path ? "page" : "global";
  const activeWp = wpScope === "page" ? page : global;

  const [wpUrl, setWpUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    publicUrl(activeWp.wallpaper_path).then(u => { if (!cancelled) setWpUrl(u); });
    return () => { cancelled = true; };
  }, [activeWp.wallpaper_path, publicUrl]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("wallpaper");

  // Auto-switch to Element tab whenever an element is selected (unless user is in Layers)
  useEffect(() => {
    if (selectedElement && panelOpen && activeTab !== "layers") setActiveTab("element");
  }, [selectedElement, panelOpen]);

  const setFilter = (target: "page" | "global", patch: WallpaperFilters) => {
    mutate(target, target === "page" ? pageScopeKey : "global", prev => ({
      wallpaper_filters: { ...(prev.wallpaper_filters || {}), ...patch },
    }));
  };
  const setWallpaperPath = (target: "page" | "global", path: string | null) => {
    mutate(target, target === "page" ? pageScopeKey : "global", { wallpaper_path: path });
  };

  const onUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("wallpapers").upload(path, file, { upsert: false });
      if (error) throw error;
      setWallpaperPath("page", path);
      toast.success("Wallpaper uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const onGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-wallpaper", {
        body: { prompt: aiPrompt },
      });
      if (error) throw error;
      if (data?.path) {
        setWallpaperPath("page", data.path);
        toast.success("Wallpaper generated");
        setAiPrompt("");
      }
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally { setGenerating(false); }
  };

  // Element color editor
  const ElementEditor = () => {
    if (!selectedElement) {
      return (
        <div className="space-y-3 p-1">
          <div className="text-sm text-muted-foreground text-center">
            Click any element on the page to edit it.
          </div>
          <p className="text-[11px] text-muted-foreground/80 text-center">
            Or pick a virtual target:
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setSelectedElement("wallpaper")}>
              <ImageIcon className="h-4 w-4 mr-2" /> Wallpaper layer
            </Button>
          </div>
        </div>
      );
    }

    // Special-case: wallpaper is a virtual element. Surface its filters here so users
    // can tweak opacity/blur on the wallpaper itself the same way as any element.
    if (selectedElement === "wallpaper") {
      const f = activeWp.wallpaper_filters || {};
      const setF = (patch: WallpaperFilters) => setFilter(wpScope, patch);
      return (
        <div className="space-y-4">
          <div className="text-xs font-mono bg-muted rounded px-2 py-1 break-all">
            wallpaper · {wpScope === "page" ? `page ${pageScopeKey}` : "global"}
          </div>
          {!activeWp.wallpaper_path && (
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
              No wallpaper set yet. Add one in the Wallpaper tab.
            </div>
          )}
          <FilterSlider label="Opacity" min={0} max={1} step={0.05}
            value={f.opacity ?? 1} onChange={(v) => setF({ opacity: v })} />
          <FilterSlider label="Blur" min={0} max={20} step={1} unit="px"
            value={f.blur ?? 0} onChange={(v) => setF({ blur: v })} />
          <FilterSlider label="Brightness" min={0} max={2} step={0.05}
            value={f.brightness ?? 1} onChange={(v) => setF({ brightness: v })} />
          <FilterSlider label="Contrast" min={0} max={2} step={0.05}
            value={f.contrast ?? 1} onChange={(v) => setF({ contrast: v })} />
          <FilterSlider label="Saturation" min={0} max={2} step={0.05}
            value={f.saturate ?? 1} onChange={(v) => setF({ saturate: v })} />
          <Button variant="outline" className="w-full" onClick={() => setSelectedElement(null)}>
            Clear selection
          </Button>
        </div>
      );
    }

    const opacityKey = `${selectedElement}|opacity`;
    const opacityCur = get("element", opacityKey);
    // We stash the per-element opacity inside `color` as a string like "opacity:0.6"
    const opacityVal = parseFloat((opacityCur.color || "").replace("opacity:", "")) || 1;
    const zKey = `${selectedElement}|zindex`;
    const zCur = get("element", zKey);
    // Stored as "zindex:<n>" where n is integer (-50..50). 0 = default.
    const zVal = parseInt((zCur.color || "").replace("zindex:", ""), 10);
    const zSafe = Number.isFinite(zVal) ? zVal : 0;

    const friendlyLabel = selectedElement.startsWith("auto:")
      ? selectedElement.slice(5).split(">").pop() || selectedElement
      : selectedElement;

    return (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-mono bg-muted rounded px-2 py-1 break-all">{friendlyLabel}</div>
          {selectedElement.startsWith("auto:") && (
            <p className="text-[10px] text-muted-foreground mt-1 break-all">
              Auto-targeted. Full path: <span className="font-mono">{selectedElement.slice(5)}</span>
            </p>
          )}
        </div>
        {COLOR_PROPS.map(prop => {
          const sk = `${selectedElement}|${prop}`;
          const cur = get("element", sk);
          const value = cur.color || "";
          const { hex, alpha } = parseColorValue(value);
          const updateColor = (nextHex: string, nextAlpha: number) => {
            mutate("element", sk, { color: buildHslWithAlpha(nextHex, nextAlpha) });
          };
          return (
            <div key={prop} className="space-y-1.5">
              <Label className="capitalize">{prop === "bg" ? "Background" : prop === "text" ? "Text" : "Border"}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hex || "#888888"}
                  onChange={(e) => updateColor(e.target.value, alpha)}
                  className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={value}
                  placeholder="hsl(0 0% 50% / 1)"
                  onChange={(e) => mutate("element", sk, { color: e.target.value || null })}
                />
                {value && (
                  <Button size="icon" variant="ghost" onClick={() => mutate("element", sk, { color: null })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {value && (
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-[10px] text-muted-foreground w-12">Alpha</span>
                  <Slider
                    value={[alpha]} min={0} max={1} step={0.05}
                    onValueChange={([v]) => updateColor(hex || "#888888", v)}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{alpha.toFixed(2)}</span>
                </div>
              )}
            </div>
          );
        })}
        <Separator />
        <div className="space-y-1.5">
          <Label>Whole-element opacity</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[opacityVal]} min={0} max={1} step={0.05}
              onValueChange={([v]) => mutate("element", opacityKey, { color: `opacity:${v}` })}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">{opacityVal.toFixed(2)}</span>
            {opacityCur.color && (
              <Button size="icon" variant="ghost" onClick={() => mutate("element", opacityKey, { color: null })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Layer (z-index)</Label>
          <p className="text-[11px] text-muted-foreground">Negative sends behind, positive brings forward. 0 = default.</p>
          <div className="flex items-center gap-2">
            <Slider
              value={[zSafe]} min={-50} max={50} step={1}
              onValueChange={([v]) => mutate("element", zKey, { color: v === 0 ? null : `zindex:${v}` })}
              className="flex-1"
            />
            <Input
              type="number"
              value={zSafe}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n)) mutate("element", zKey, { color: n === 0 ? null : `zindex:${n}` });
              }}
              className="w-16 h-9"
            />
            {zCur.color && (
              <Button size="icon" variant="ghost" onClick={() => mutate("element", zKey, { color: null })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <Button size="sm" variant="outline" onClick={() => mutate("element", zKey, { color: "zindex:-10" })}>Back</Button>
            <Button size="sm" variant="outline" onClick={() => mutate("element", zKey, { color: `zindex:${zSafe - 1}` })}>−1</Button>
            <Button size="sm" variant="outline" onClick={() => mutate("element", zKey, { color: `zindex:${zSafe + 1}` })}>+1</Button>
            <Button size="sm" variant="outline" onClick={() => mutate("element", zKey, { color: "zindex:10" })}>Front</Button>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => setSelectedElement(null)}>
          Clear selection
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto" data-customize-ui>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Customize
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between p-3 rounded-lg border border-border bg-card">
          <div className="text-sm">
            <div className="font-medium">Edit mode</div>
            <div className="text-xs text-muted-foreground">Click elements to recolor them.</div>
          </div>
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode(!editMode)}
            type="button"
          >
            {editMode ? "On" : "Off"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="wallpaper" title="Wallpaper"><ImageIcon className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="element" title="Element"><Palette className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="layers" title="Layers"><Layers className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="widgets" title="Widgets"><Plus className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="sections" title="Sections"><Heading className="h-4 w-4" /></TabsTrigger>
          </TabsList>

          {/* WALLPAPER */}
          <TabsContent value="wallpaper" className="space-y-4 mt-4">
            <div className="text-xs text-muted-foreground">Page: <span className="font-mono">{pageScopeKey}</span></div>

            {wpUrl ? (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={wpUrl} alt="" className="w-full aspect-video object-cover" />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No wallpaper set
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
              </Button>
              <Button variant="outline" onClick={() => setWallpaperPath("page", null)}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
              <input
                ref={fileRef} type="file" accept="image/*" hidden
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Generate with AI</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. soft watercolor mountains at sunrise"
                className="min-h-[70px]"
              />
              <Button onClick={onGenerate} disabled={generating || !aiPrompt.trim()} className="w-full">
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Generate
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Filter preset</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.keys(FILTER_PRESETS).map(name => (
                  <Button
                    key={name} size="sm" variant="outline"
                    onClick={() => setFilter(wpScope, FILTER_PRESETS[name])}
                  >
                    {name}
                  </Button>
                ))}
              </div>

              <FilterSlider label="Blur" min={0} max={20} step={1} unit="px"
                value={activeWp.wallpaper_filters?.blur ?? 0}
                onChange={(v) => setFilter(wpScope, { blur: v })} />
              <FilterSlider label="Brightness" min={0} max={2} step={0.05}
                value={activeWp.wallpaper_filters?.brightness ?? 1}
                onChange={(v) => setFilter(wpScope, { brightness: v })} />
              <FilterSlider label="Contrast" min={0} max={2} step={0.05}
                value={activeWp.wallpaper_filters?.contrast ?? 1}
                onChange={(v) => setFilter(wpScope, { contrast: v })} />
              <FilterSlider label="Saturation" min={0} max={2} step={0.05}
                value={activeWp.wallpaper_filters?.saturate ?? 1}
                onChange={(v) => setFilter(wpScope, { saturate: v })} />
              <FilterSlider label="Opacity" min={0} max={1} step={0.05}
                value={activeWp.wallpaper_filters?.opacity ?? 1}
                onChange={(v) => setFilter(wpScope, { opacity: v })} />
            </div>
          </TabsContent>

          {/* ELEMENT COLORS */}
          <TabsContent value="element" className="mt-4">
            <ElementEditor />
          </TabsContent>

          {/* LAYERS */}
          <TabsContent value="layers" className="mt-4">
            <LayersPanel />
          </TabsContent>

          {/* WIDGETS */}
          <TabsContent value="widgets" className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Add custom blocks to this page.</p>
            <Button variant="outline" className="w-full justify-start" onClick={() => addWidget({ type: "text", content: "New text block" })}>
              <Type className="h-4 w-4 mr-2" /> Text
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => addWidget({ type: "heading", content: "New heading", level: 2 })}>
              <Heading className="h-4 w-4 mr-2" /> Heading
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => addWidget({ type: "image", content: "" })}>
              <ImageIcon className="h-4 w-4 mr-2" /> Image
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => addWidget({ type: "divider" })}>
              <Minus className="h-4 w-4 mr-2" /> Divider
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => addWidget({ type: "spacer", height: 32 })}>
              <MoveVertical className="h-4 w-4 mr-2" /> Spacer
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => addWidget({ type: "embed", content: "" })}>
              <Link2 className="h-4 w-4 mr-2" /> Embed
            </Button>
            <Separator className="my-3" />
            <WidgetEditList />
          </TabsContent>

          {/* SECTIONS */}
          <TabsContent value="sections" className="mt-4">
            <SectionsEditor />
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="flex gap-2">
          <Button onClick={async () => {
            const r = await saveAll();
            if (r.ok) toast.success("Saved to your account");
            else toast.error(r.error || "Save failed");
          }} disabled={!hasDraft} className="flex-1">
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button variant="outline" onClick={discardDraft} disabled={!hasDraft}>
            <RotateCcw className="h-4 w-4 mr-1" /> Discard
          </Button>
        </div>
        {hasDraft && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            You have unsaved local changes (preview only).
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FilterSlider({ label, value, onChange, min, max, step, unit = "" }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function WidgetEditList() {
  const { getPageWidgets, updateWidget, deleteWidget } = useTheme();
  const widgets = getPageWidgets();
  if (widgets.length === 0) return <p className="text-xs text-muted-foreground text-center">No widgets yet.</p>;
  return (
    <div className="space-y-3">
      {widgets.map(w => (
        <div key={w.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase">{w.type}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteWidget(w.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {(w.type === "text" || w.type === "heading") && (
            <Textarea value={w.content || ""} onChange={(e) => updateWidget(w.id, { content: e.target.value })} className="text-xs" />
          )}
          {w.type === "heading" && (
            <Select value={String(w.level || 2)} onValueChange={(v) => updateWidget(w.id, { level: Number(v) as 1 | 2 | 3 | 4 })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">H1</SelectItem><SelectItem value="2">H2</SelectItem>
                <SelectItem value="3">H3</SelectItem><SelectItem value="4">H4</SelectItem>
              </SelectContent>
            </Select>
          )}
          {(w.type === "image" || w.type === "embed") && (
            <Input value={w.content || ""} onChange={(e) => updateWidget(w.id, { content: e.target.value })} placeholder="URL" className="text-xs" />
          )}
          {w.type === "spacer" && (
            <Slider value={[w.height || 24]} min={8} max={200} step={4} onValueChange={([v]) => updateWidget(w.id, { height: v })} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionsEditor() {
  const { pageScopeKey, get, mutate, toggleSection, panelOpen } = useTheme();
  const page = get("page", pageScopeKey);
  const hiddenList = page.hidden_sections || [];

  // Discover keys: union of DOM-present [data-section] and already-hidden keys (which may not be in DOM if their wrappers unmounted)
  const [domKeys, setDomKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!panelOpen) return;
    const scan = () => {
      const els = document.querySelectorAll<HTMLElement>("[data-section]");
      const keys = Array.from(new Set(
        Array.from(els).map(e => e.getAttribute("data-section") || "").filter(Boolean)
      )).sort();
      setDomKeys(prev => (prev.length === keys.length && prev.every((k, i) => k === keys[i])) ? prev : keys);
    };
    scan();
    // Re-scan as the DOM changes (sections rendered async, route content swaps, etc.)
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-section"] });
    const interval = window.setInterval(scan, 1500);
    return () => { obs.disconnect(); window.clearInterval(interval); };
  }, [pageScopeKey, panelOpen]);

  // Friendly label from labels we capture via [data-section-label] or fallback to the key
  const labelFor = (key: string): string => {
    const el = document.querySelector<HTMLElement>(`[data-section="${CSS.escape(key)}"]`);
    return el?.getAttribute("data-section-label") || key;
  };

  const allKeys = Array.from(new Set([...domKeys, ...hiddenList])).sort();

  const showAll = () => {
    mutate("page", pageScopeKey, { hidden_sections: [] });
  };

  if (allKeys.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          No hideable sections detected on this page.
        </p>
        <p className="text-[11px] text-muted-foreground/70 text-center">
          Wrap a built-in block in <span className="font-mono">&lt;HideableSection sectionKey="..." /&gt;</span> to make it toggleable here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Toggle built-in sections on this page.
        </p>
        {hiddenList.length > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={showAll}>
            Show all
          </Button>
        )}
      </div>
      {allKeys.map(s => {
        const hidden = hiddenList.includes(s);
        const inDom = domKeys.includes(s);
        return (
          <div key={s} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
            <div className="min-w-0 flex-1 mr-2">
              <div className="text-sm truncate">{labelFor(s)}</div>
              <div className="text-[10px] font-mono text-muted-foreground truncate">
                {s}{!inDom && " · not currently rendered"}
              </div>
            </div>
            <Button
              size="sm"
              variant={hidden ? "outline" : "default"}
              onClick={() => toggleSection(s)}
              className="shrink-0"
            >
              {hidden ? "Hidden" : "Visible"}
            </Button>
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Changes are saved when you press <span className="font-medium">Save</span> below.
      </p>
    </div>
  );
}

// ============ Layers Panel (Canva-style) ============
type LayerRow = {
  key: string;          // themeable key OR "wallpaper" OR "auto:..." selector key
  label: string;        // friendly label
  rect?: DOMRect;       // for ordering top-down
  z: number;            // current z-index from store (0 if none)
  isVirtual?: boolean;  // wallpaper
};

function LayersPanel() {
  const { selectedElement, setSelectedElement, get, mutate, panelOpen } = useTheme();
  const [rows, setRows] = useState<LayerRow[]>([]);

  const readZ = (key: string): number => {
    const cur = get("element", `${key}|zindex`);
    const v = parseInt((cur.color || "").replace("zindex:", ""), 10);
    return Number.isFinite(v) ? v : 0;
  };

  // Scan the page for themeable elements + wallpaper. Re-scan on DOM mutations.
  useEffect(() => {
    if (!panelOpen) return;
    const scan = () => {
      const seen = new Map<string, LayerRow>();
      // Wallpaper as a virtual top-of-list entry
      seen.set("wallpaper", {
        key: "wallpaper",
        label: "Wallpaper",
        z: 0,
        isVirtual: true,
      });
      // Named [data-themeable] elements
      document.querySelectorAll<HTMLElement>("[data-themeable]").forEach(el => {
        if (el.closest("[data-customize-ui]")) return;
        const key = el.getAttribute("data-themeable") || "";
        if (!key || seen.has(key)) return;
        seen.set(key, {
          key,
          label: prettifyLabel(key),
          rect: el.getBoundingClientRect(),
          z: readZ(key),
        });
      });
      // Sort: wallpaper first, then by visual top position, then alpha
      const arr = Array.from(seen.values()).sort((a, b) => {
        if (a.isVirtual) return -1;
        if (b.isVirtual) return 1;
        const ay = a.rect?.top ?? 0;
        const by = b.rect?.top ?? 0;
        return ay - by || a.label.localeCompare(b.label);
      });
      setRows(prev => {
        // shallow compare to avoid re-renders
        if (prev.length === arr.length && prev.every((r, i) => r.key === arr[i].key && r.z === arr[i].z)) {
          return prev;
        }
        return arr;
      });
    };
    scan();
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-themeable"] });
    const interval = window.setInterval(scan, 1500);
    return () => { obs.disconnect(); window.clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen, get]);

  // Hover highlight overlay
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  useEffect(() => {
    const styleId = "tk-layer-hover";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    if (!hoverKey || hoverKey === "wallpaper") {
      style.textContent = "";
      return;
    }
    const sel = hoverKey.startsWith("auto:")
      ? hoverKey.slice(5)
      : `[data-themeable="${cssEscapeSafe(hoverKey)}"]`;
    style.textContent = `${sel}{outline:2px solid hsl(var(--ring)) !important;outline-offset:2px !important;}`;
  }, [hoverKey]);

  // Selection highlight (persistent while selected)
  useEffect(() => {
    const styleId = "tk-layer-selected";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    if (!selectedElement || selectedElement === "wallpaper") {
      style.textContent = "";
      return;
    }
    const sel = selectedElement.startsWith("auto:")
      ? selectedElement.slice(5)
      : `[data-themeable="${cssEscapeSafe(selectedElement)}"]`;
    style.textContent = `${sel}{outline:2px dashed hsl(var(--primary)) !important;outline-offset:3px !important;}`;
    return () => { if (style) style.textContent = ""; };
  }, [selectedElement]);

  const selectAndScroll = (key: string) => {
    setSelectedElement(key);
    if (key === "wallpaper") return;
    const sel = key.startsWith("auto:") ? key.slice(5) : `[data-themeable="${cssEscapeSafe(key)}"]`;
    try {
      const el = document.querySelector<HTMLElement>(sel);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch { /* invalid selector */ }
  };

  const setZ = (key: string, n: number) => {
    if (key === "wallpaper") return;
    mutate("element", `${key}|zindex`, { color: n === 0 ? null : `zindex:${n}` });
  };

  // ----- Drag & drop reordering (Canva-style: top of list = front-most) -----
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  // Reassign z-indexes based on visual order. Top row = highest z.
  // Skips the wallpaper virtual row.
  const applyOrder = (orderedKeys: string[]) => {
    const real = orderedKeys.filter(k => k !== "wallpaper");
    const n = real.length;
    real.forEach((k, i) => {
      // Top of list (i=0) -> highest z. Spread from +n down to +1.
      const z = n - i;
      mutate("element", `${k}|zindex`, { color: `zindex:${z}` });
    });
  };

  const onDragStart = (e: React.DragEvent, key: string) => {
    if (key === "wallpaper") { e.preventDefault(); return; }
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", key); } catch { /* ignore */ }
  };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    if (!dragKey) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIdx(idx);
  };
  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (!dragKey) return;
    const fromIdx = rows.findIndex(r => r.key === dragKey);
    if (fromIdx === -1 || fromIdx === idx) {
      setDragKey(null); setDropIdx(null); return;
    }
    const next = rows.slice();
    const [moved] = next.splice(fromIdx, 1);
    // Adjust target index when removing earlier element
    const insertAt = fromIdx < idx ? idx - 1 : idx;
    next.splice(insertAt, 0, moved);
    // Lock wallpaper to the top
    const wpIdx = next.findIndex(r => r.key === "wallpaper");
    if (wpIdx > 0) {
      const [wp] = next.splice(wpIdx, 1);
      next.unshift(wp);
    }
    setRows(next);
    applyOrder(next.map(r => r.key));
    setDragKey(null); setDropIdx(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Drag rows to reorder layers (top = front). Click to select. Use ↑/↓ for fine z-index tweaks.
      </p>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">
          No layered elements detected on this page.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {rows.map((row, idx) => {
            const isSel = selectedElement === row.key;
            const isDragging = dragKey === row.key;
            const showDropAbove = dropIdx === idx && dragKey && dragKey !== row.key;
            return (
              <div
                key={row.key}
                draggable={!row.isVirtual}
                onDragStart={(e) => onDragStart(e, row.key)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragLeave={() => setDropIdx(prev => prev === idx ? null : prev)}
                onDrop={(e) => onDrop(e, idx)}
                onDragEnd={() => { setDragKey(null); setDropIdx(null); }}
                onMouseEnter={() => setHoverKey(row.key)}
                onMouseLeave={() => setHoverKey(prev => prev === row.key ? null : prev)}
                onClick={() => selectAndScroll(row.key)}
                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors relative ${
                  isSel ? "bg-primary/10" : "hover:bg-muted/60"
                } ${isDragging ? "opacity-40" : ""} ${showDropAbove ? "border-t-2 border-t-primary" : ""}`}
              >
                {!row.isVirtual ? (
                  <GripVertical
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Layers className={`h-3.5 w-3.5 shrink-0 ${isSel ? "text-primary" : "text-muted-foreground"}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{row.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate font-mono">
                    {row.isVirtual ? "virtual · always behind" : row.key}
                  </div>
                </div>
                {!row.isVirtual && (
                  <>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">z:{row.z}</span>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); setZ(row.key, row.z + 1); }}
                      title="Bring forward"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); setZ(row.key, row.z - 1); }}
                      title="Send backward"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground text-center pt-2">
        For finer control of any element, switch to the <span className="font-medium">Element</span> tab.
      </p>
    </div>
  );
}

function prettifyLabel(key: string): string {
  // "home.tile.notes.title" -> "home › tile › notes › title"
  return key.split(".").join(" › ");
}

function cssEscapeSafe(s: string): string {
  return (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(s) : s.replace(/[^\w-]/g, "\\$&");
}

// ------- helpers -------
function parseColorValue(v: string): { hex: string; alpha: number } {
  if (!v) return { hex: "", alpha: 1 };
  const m = v.match(/hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*(\d*\.?\d+))?\s*\)/i);
  if (m) {
    return { hex: hslToHex(`hsl(${m[1]} ${m[2]}% ${m[3]}%)`), alpha: m[4] !== undefined ? +m[4] : 1 };
  }
  if (v.startsWith("#") && (v.length === 7 || v.length === 9)) {
    const a = v.length === 9 ? parseInt(v.slice(7, 9), 16) / 255 : 1;
    return { hex: v.slice(0, 7), alpha: a };
  }
  return { hex: "", alpha: 1 };
}

function buildHslWithAlpha(hex: string, alpha: number): string {
  const hsl = hexToHslCss(hex);
  if (alpha >= 1) return hsl;
  return hsl.replace(/\)$/, ` / ${alpha.toFixed(2)})`);
}

function hslToHex(hslStr: string): string {
  const m = hslStr?.match(/hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/i);
  if (!m) return "";
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function hexToHslCss(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}
