import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { AgamottoContent } from "@/lib/h5p-types";

interface Props { content: AgamottoContent; onChange: (c: AgamottoContent) => void; }

export function AgamottoEditor({ content, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Image Sequence</Label>
      <p className="text-xs text-muted-foreground">Add images in order. Students use a slider to transition between them.</p>
      {content.images.map((img, i) => (
        <div key={img.id} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
          <Input className="flex-1" placeholder="Image URL" value={img.imageUrl} onChange={e => onChange({ images: content.images.map(x => x.id === img.id ? { ...x, imageUrl: e.target.value } : x) })} />
          <Input className="w-32" placeholder="Label" value={img.label} onChange={e => onChange({ images: content.images.map(x => x.id === img.id ? { ...x, label: e.target.value } : x) })} />
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onChange({ images: content.images.filter(x => x.id !== img.id) })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={() => onChange({ images: [...content.images, { id: crypto.randomUUID(), imageUrl: "", label: "" }] })}>
        <Plus className="h-4 w-4 mr-1.5" /> Add Image
      </Button>
    </div>
  );
}
