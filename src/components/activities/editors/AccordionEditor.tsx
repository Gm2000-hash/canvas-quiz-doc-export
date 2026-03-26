import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { AccordionContent, AccordionPanel } from "@/lib/h5p-types";

interface Props {
  content: AccordionContent;
  onChange: (c: AccordionContent) => void;
}

export function AccordionEditor({ content, onChange }: Props) {
  const updatePanel = (id: string, patch: Partial<AccordionPanel>) => {
    onChange({ panels: content.panels.map(p => p.id === id ? { ...p, ...patch } : p) });
  };

  const addPanel = () => {
    onChange({ panels: [...content.panels, { id: crypto.randomUUID(), title: "", content: "" }] });
  };

  const removePanel = (id: string) => {
    onChange({ panels: content.panels.filter(p => p.id !== id) });
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Accordion Panels</Label>
      {content.panels.map((panel, idx) => (
        <div key={panel.id} className="border border-border/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Panel {idx + 1}</span>
            <div className="flex-1" />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removePanel(panel.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            placeholder="Panel title"
            value={panel.title}
            onChange={e => updatePanel(panel.id, { title: e.target.value })}
          />
          <Textarea
            placeholder="Panel content..."
            className="min-h-[80px] text-sm"
            value={panel.content}
            onChange={e => updatePanel(panel.id, { content: e.target.value })}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addPanel} className="w-full">
        <Plus className="h-4 w-4 mr-1.5" /> Add Panel
      </Button>
    </div>
  );
}
