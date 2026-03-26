import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_TYPES } from "@/lib/h5p-types";
import { Play, Pencil, Trash2, Copy } from "lucide-react";
import type { ActivityStandard } from "@/hooks/useActivityStandards";

interface ActivityCardProps {
  id: string;
  title: string;
  activityType: string;
  updatedAt: string;
  standards?: ActivityStandard[];
  onPlay: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ActivityCard({ title, activityType, updatedAt, standards, onPlay, onEdit, onDelete }: ActivityCardProps) {
  const typeInfo = ACTIVITY_TYPES.find(t => t.type === activityType);

  return (
    <Card className="p-4 flex items-center gap-4 group hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="secondary" className="text-xs">{typeInfo?.label ?? activityType}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(updatedAt).toLocaleDateString()}
          </span>
        </div>
        {standards && standards.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {standards.map(s => (
              <Badge key={s.ngss_code} variant="outline" className="text-[10px] px-1.5 py-0 font-mono border-primary/30 text-primary">
                {s.ngss_code}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onPlay} title="Preview">
          <Play className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
