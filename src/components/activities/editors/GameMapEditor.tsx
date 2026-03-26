import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { GameMapContent } from "@/lib/h5p-types";

interface Props { content: GameMapContent; onChange: (c: GameMapContent) => void; }

export function GameMapEditor({ content, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Game Title</Label>
        <Input className="mt-1.5" value={content.title} onChange={e => onChange({ ...content, title: e.target.value })} />
      </div>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <p className="text-sm text-muted-foreground">Game Map visual editor coming soon.</p>
        <p className="text-xs text-muted-foreground mt-1">Stages: {content.stages.length}</p>
      </div>
    </div>
  );
}
