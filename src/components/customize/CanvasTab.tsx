import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Image as ImageIcon, Type, Heading as HeadingIcon, Minus, MoveVertical, Link2,
  Trash2, Eye, EyeOff, GripVertical, Upload, FlipHorizontal, FlipVertical,
  RotateCw, Scissors, Sparkles, Loader2, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { defaultElement, DEFAULT_FILTERS } from "@/lib/canvas-types";
import type { CanvasElement, CanvasElementType, ImageFilters } from "@/lib/canvas-types";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CropDialog } from "./CropDialog";
import { toast } from "sonner";

const TYPE_ICONS: Record<CanvasElementType, JSX.Element> = {
  image: <ImageIcon className="h-3.5 w-3.5" />,
  text: <Type className="h-3.5 w-3.5" />,
  heading: <HeadingIcon className="h-3.5 w-3.5" />,
  divider: <Minus className="h-3.5 w-3.5" />,
  spacer: <MoveVertical className="h-3.5 w-3.5" />,
  embed: <Link2 className="h-3.5 w-3.5" />,
};

export function CanvasTab() {
  const {
    canvasElements, addCanvasElement, updateCanvasElement, removeCanvasElement,
    reorderCanvasElements, selectedWidgetId, setSelectedWidgetId,
  } = useTheme();

  const sorted = [...canvasElements].sort((a, b) => b.zIndex - a.zIndex);
  const selected = canvasElements.find(e => e.id === selectedWidgetId) || null;

  const insert = (type: CanvasElementType) => {
    const maxZ = canvasElements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el = defaultElement(type, maxZ + 1);
    addCanvasElement(el);
    setSelectedWidgetId(el.id);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Insert</Label>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          <ToolButton icon={<ImageIcon className="h-4 w-4" />} label="Image" onClick={() => insert("image")} />
          <ToolButton icon={<Type className="h-4 w-4" />} label="Text" onClick={() => insert("text")} />
          <ToolButton icon={<HeadingIcon className="h-4 w-4" />} label="Heading" onClick={() => insert("heading")} />
          <ToolButton icon={<Minus className="h-4 w-4" />} label="Divider" onClick={() => insert("divider")} />
          <ToolButton icon={<MoveVertical className="h-4 w-4" />} label="Spacer" onClick={() => insert("spacer")} />
          <ToolButton icon={<Link2 className="h-4 w-4" />} label="Embed" onClick={() => insert("embed")} />
        </div>
      </div>

      <Separator />

      {/* Contextual editor */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          {selected ? "Edit element" : "No selection"}
        </Label>
        {selected ? (
          <div className="mt-2">
            <ContextEditor element={selected} onChange={(p) => updateCanvasElement(selected.id, p)} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            Click an element on the page or in the layers list below to edit it.
          </p>
        )}
      </div>

      <Separator />

      {/* Layers */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Layers</Label>
          <span className="text-[10px] text-muted-foreground">{canvasElements.length} on page</span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No elements yet.</p>
        ) : (
          <SortableLayers
            items={sorted}
            onReorder={(ids) => reorderCanvasElements(ids)}
            selectedId={selectedWidgetId}
            onSelect={setSelectedWidgetId}
            onToggleHide={(id) => {
              const el = canvasElements.find(e => e.id === id);
              if (el) updateCanvasElement(id, { hidden: !el.hidden });
            }}
            onDelete={(id) => {
              if (selectedWidgetId === id) setSelectedWidgetId(null);
              removeCanvasElement(id);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: JSX.Element; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="flex-col h-auto py-2 gap-1">
      {icon}
      <span className="text-[10px]">{label}</span>
    </Button>
  );
}

/* -------------------- Layers (sortable) -------------------- */

function SortableLayers({
  items, onReorder, selectedId, onSelect, onToggleHide, onDelete,
}: {
  items: CanvasElement[];
  onReorder: (ids: string[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const ids = items.map(i => i.id);
        const oldIdx = ids.indexOf(String(active.id));
        const newIdx = ids.indexOf(String(over.id));
        onReorder(arrayMove(ids, oldIdx, newIdx));
      }}
    >
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map(item => (
            <LayerRow
              key={item.id}
              element={item}
              selected={selectedId === item.id}
              onSelect={() => onSelect(item.id)}
              onToggleHide={() => onToggleHide(item.id)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function LayerRow({
  element, selected, onSelect, onToggleHide, onDelete,
}: {
  element: CanvasElement;
  selected: boolean;
  onSelect: () => void;
  onToggleHide: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const label = element.type === "text" || element.type === "heading"
    ? (element.content || `Empty ${element.type}`).slice(0, 24)
    : element.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded border ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      } ${element.hidden ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={onSelect} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        <span className="flex-shrink-0">
          {element.type === "image" && element.src ? (
            <img src={element.src} alt="" className="h-7 w-7 rounded object-cover" />
          ) : (
            <span className="h-7 w-7 rounded bg-muted flex items-center justify-center">
              {TYPE_ICONS[element.type]}
            </span>
          )}
        </span>
        <span className="text-xs truncate">{label}</span>
      </button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onToggleHide} title={element.hidden ? "Show" : "Hide"}>
        {element.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete} title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* -------------------- Contextual editor -------------------- */

function ContextEditor({ element, onChange }: { element: CanvasElement; onChange: (p: Partial<CanvasElement>) => void }) {
  switch (element.type) {
    case "image":   return <ImageEditor element={element} onChange={onChange} />;
    case "text":
    case "heading": return <TextEditor element={element} onChange={onChange} />;
    case "divider": return <DividerEditor element={element} onChange={onChange} />;
    case "spacer":  return <SpacerEditor element={element} onChange={onChange} />;
    case "embed":   return <EmbedEditor element={element} onChange={onChange} />;
  }
}

/* -------------------- Image -------------------- */

function ImageEditor({ element, onChange }: { element: CanvasElement; onChange: (p: Partial<CanvasElement>) => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(element.src || "");

  const filters: Required<ImageFilters> = { ...DEFAULT_FILTERS, ...(element.filters || {}) };
  const setFilter = (patch: Partial<ImageFilters>) => onChange({ filters: { ...filters, ...patch } });

  const onUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `widget-images/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("wallpapers").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = await supabase.storage.from("wallpapers").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) {
        onChange({ src: data.signedUrl });
        setUrlDraft(data.signedUrl);
        toast.success("Image uploaded");
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const onRemoveBg = async () => {
    if (!element.src) { toast.error("Add an image first"); return; }
    setRemoving(true);
    try {
      const { data, error } = await supabase.functions.invoke("remove-image-background", {
        body: { imageUrl: element.src },
      });
      if (error) throw error;
      if (data?.url) {
        onChange({ src: data.url });
        setUrlDraft(data.url);
        toast.success("Background removed");
      } else {
        throw new Error("No image returned");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to remove background");
    } finally { setRemoving(false); }
  };

  return (
    <div className="space-y-3">
      {/* Source */}
      <div className="space-y-1.5">
        <Label className="text-xs">Source</Label>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="ml-1">Upload</span>
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </div>
        <Input
          value={urlDraft}
          placeholder="Or paste image URL"
          className="text-xs h-8"
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={() => onChange({ src: urlDraft })}
        />
      </div>

      {/* Transform */}
      <div className="space-y-1.5">
        <Label className="text-xs">Transform</Label>
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" variant={element.flipH ? "default" : "outline"} onClick={() => onChange({ flipH: !element.flipH })}>
            <FlipHorizontal className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant={element.flipV ? "default" : "outline"} onClick={() => onChange({ flipV: !element.flipV })}>
            <FlipVertical className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onChange({ rotation: ((element.rotation || 0) + 90) % 360 })}>
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <SliderRow label="Rotation" min={-180} max={180} step={1} value={element.rotation || 0}
          unit="°" onChange={(v) => onChange({ rotation: v })} />
      </div>

      {/* Crop */}
      <div className="grid grid-cols-2 gap-1.5">
        <Button size="sm" variant="outline" disabled={!element.src} onClick={() => setCropOpen(true)}>
          <Scissors className="h-3.5 w-3.5 mr-1" /> Crop
        </Button>
        <Button size="sm" variant="outline" disabled={!element.src || removing} onClick={onRemoveBg}>
          {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
          Remove BG
        </Button>
      </div>
      {element.crop && (
        <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => onChange({ crop: null })}>
          Reset crop
        </Button>
      )}

      {/* Opacity */}
      <SliderRow label="Opacity" min={0} max={1} step={0.05} value={element.opacity ?? 1}
        onChange={(v) => onChange({ opacity: v })} />

      {/* Filters */}
      <div className="space-y-2 pt-1">
        <Label className="text-xs">Filters</Label>
        <SliderRow label="Blur" min={0} max={20} step={1} value={filters.blur} unit="px" onChange={(v) => setFilter({ blur: v })} />
        <SliderRow label="Brightness" min={0} max={2} step={0.05} value={filters.brightness} onChange={(v) => setFilter({ brightness: v })} />
        <SliderRow label="Contrast" min={0} max={2} step={0.05} value={filters.contrast} onChange={(v) => setFilter({ contrast: v })} />
        <SliderRow label="Saturation" min={0} max={2} step={0.05} value={filters.saturate} onChange={(v) => setFilter({ saturate: v })} />
        <SliderRow label="Grayscale" min={0} max={1} step={0.05} value={filters.grayscale} onChange={(v) => setFilter({ grayscale: v })} />
        <SliderRow label="Sepia" min={0} max={1} step={0.05} value={filters.sepia} onChange={(v) => setFilter({ sepia: v })} />
        <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => onChange({ filters: { ...DEFAULT_FILTERS } })}>
          Reset filters
        </Button>
      </div>

      {element.src && (
        <CropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageUrl={element.src}
          initialCrop={element.crop}
          onApply={(c) => onChange({ crop: c })}
        />
      )}
    </div>
  );
}

/* -------------------- Text/Heading -------------------- */

function TextEditor({ element, onChange }: { element: CanvasElement; onChange: (p: Partial<CanvasElement>) => void }) {
  return (
    <div className="space-y-3">
      <Textarea
        value={element.content || ""}
        onChange={(e) => onChange({ content: e.target.value })}
        className="text-sm min-h-[70px]"
        placeholder={element.type === "heading" ? "Heading text" : "Text content"}
      />

      {element.type === "heading" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Heading level</Label>
          <Select value={String(element.level || 2)} onValueChange={(v) => onChange({ level: Number(v) as 1|2|3|4 })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">H1</SelectItem>
              <SelectItem value="2">H2</SelectItem>
              <SelectItem value="3">H3</SelectItem>
              <SelectItem value="4">H4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <SliderRow label="Font size" min={10} max={96} step={1} value={element.fontSize || 16} unit="px"
        onChange={(v) => onChange({ fontSize: v })} />

      <div className="grid grid-cols-2 gap-1.5">
        <Button size="sm" variant={element.bold ? "default" : "outline"} onClick={() => onChange({ bold: !element.bold })}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant={element.italic ? "default" : "outline"} onClick={() => onChange({ italic: !element.italic })}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Button size="sm" variant={element.align === "left" || !element.align ? "default" : "outline"} onClick={() => onChange({ align: "left" })}>
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant={element.align === "center" ? "default" : "outline"} onClick={() => onChange({ align: "center" })}>
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant={element.align === "right" ? "default" : "outline"} onClick={() => onChange({ align: "right" })}>
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ColorRow label="Text color" value={element.color || ""} onChange={(c) => onChange({ color: c || undefined })} />
      <ColorRow label="Background" value={element.bg || ""} onChange={(c) => onChange({ bg: c || undefined })} />
    </div>
  );
}

/* -------------------- Divider/Spacer/Embed -------------------- */

function DividerEditor({ element, onChange }: { element: CanvasElement; onChange: (p: Partial<CanvasElement>) => void }) {
  return (
    <div className="space-y-3">
      <ColorRow label="Color" value={element.color || ""} onChange={(c) => onChange({ color: c || undefined })} />
    </div>
  );
}

function SpacerEditor({ element, onChange }: { element: CanvasElement; onChange: (p: Partial<CanvasElement>) => void }) {
  return (
    <div className="space-y-3">
      <ColorRow label="Background" value={element.bg || ""} onChange={(c) => onChange({ bg: c || undefined })} />
    </div>
  );
}

function EmbedEditor({ element, onChange }: { element: CanvasElement; onChange: (p: Partial<CanvasElement>) => void }) {
  return (
    <div className="space-y-3">
      <Label className="text-xs">Embed URL</Label>
      <Input
        value={element.content || ""}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="https://..."
        className="text-xs"
      />
    </div>
  );
}

/* -------------------- Shared -------------------- */

function SliderRow({ label, value, onChange, min, max, step, unit = "" }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{step < 1 ? value.toFixed(2) : Math.round(value)}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // Accept any CSS color (hex, hsl, named); use a color input as a quick picker.
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex ? value : "#888888"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border border-border cursor-pointer bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="(none)" className="h-8 text-xs flex-1" />
        {value && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onChange("")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
