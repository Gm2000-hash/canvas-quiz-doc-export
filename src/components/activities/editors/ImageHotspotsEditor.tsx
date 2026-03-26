import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { ImageHotspotsContent } from "@/lib/h5p-types";

interface Props { content: ImageHotspotsContent; onChange: (c: ImageHotspotsContent) => void; }

export function ImageHotspotsEditor({ content, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Image URL</Label>
        <Input className="mt-1.5" value={content.imageUrl} onChange={e => onChange({ ...content, imageUrl: e.target.value })} placeholder="https://example.com/image.jpg" />
      </div>
      <Label className="text-sm font-medium">Hotspots</Label>
      <p className="text-xs text-muted-foreground">Position hotspots using X/Y percentages (0–100).</p>
      {content.hotspots.map((h, i) => (
        <div key={h.id} className="border border-border/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hotspot {i + 1}</span>
            <div className="flex-1" />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onChange({ ...content, hotspots: content.hotspots.filter(x => x.id !== h.id) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Title" value={h.title} onChange={e => onChange({ ...content, hotspots: content.hotspots.map(x => x.id === h.id ? { ...x, title: e.target.value } : x) })} />
            <Input type="number" placeholder="X %" value={h.x} onChange={e => onChange({ ...content, hotspots: content.hotspots.map(x => x.id === h.id ? { ...x, x: parseFloat(e.target.value) || 0 } : x) })} />
            <Input type="number" placeholder="Y %" value={h.y} onChange={e => onChange({ ...content, hotspots: content.hotspots.map(x => x.id === h.id ? { ...x, y: parseFloat(e.target.value) || 0 } : x) })} />
          </div>
          <Textarea placeholder="Hotspot content..." className="min-h-[60px] text-sm" value={h.content} onChange={e => onChange({ ...content, hotspots: content.hotspots.map(x => x.id === h.id ? { ...x, content: e.target.value } : x) })} />
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={() => onChange({ ...content, hotspots: [...content.hotspots, { id: crypto.randomUUID(), x: 50, y: 50, title: "", content: "" }] })}>
        <Plus className="h-4 w-4 mr-1.5" /> Add Hotspot
      </Button>
    </div>
  );
}
