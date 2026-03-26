import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ALL_SUBSTANDARDS, getAllStandardsFlat } from "@/lib/ngss-data";
import type { ActivityStandard } from "@/hooks/useActivityStandards";
import { Plus, X, Search, Tag, Loader2, Sparkles } from "lucide-react";

interface ActivityStandardsPickerProps {
  standards: ActivityStandard[];
  onAdd: (code: string, description: string) => Promise<void>;
  onRemove: (standardId: string) => Promise<void>;
  onAutoTag: () => void;
  tagging: boolean;
}

export function ActivityStandardsPicker({ standards, onAdd, onRemove, onAutoTag, tagging }: ActivityStandardsPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const existingCodes = new Set(standards.map(s => s.ngss_code));

  const allStandards = useMemo(() => getAllStandardsFlat(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allStandards.filter(s => !existingCodes.has(s.code));
    const q = search.toLowerCase();
    return allStandards.filter(s =>
      !existingCodes.has(s.code) &&
      (s.code.toLowerCase().includes(q) ||
       s.description.toLowerCase().includes(q) ||
       s.keyTerms.some(t => t.toLowerCase().includes(q)))
    );
  }, [search, allStandards, existingCodes]);

  // Group by core idea
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach(s => {
      const group = s.code.replace(/-\d+$/, "");
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const handleAdd = async (code: string, description: string) => {
    setAdding(code);
    await onAdd(code, description);
    setAdding(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" /> NGSS Standards
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onAutoTag}
            disabled={tagging}
          >
            {tagging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Auto-tag
          </Button>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Add Standard
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search standards..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="h-64">
                {grouped.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    {existingCodes.size > 0 && !search ? "All standards already added" : "No matching standards"}
                  </p>
                ) : (
                  <div className="p-1">
                    {grouped.map(([group, stds]) => (
                      <div key={group} className="mb-2">
                        <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase">{group}</p>
                        {stds.map(s => (
                          <button
                            key={s.code}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-xs flex items-start gap-2 disabled:opacity-50"
                            onClick={() => handleAdd(s.code, s.description)}
                            disabled={adding === s.code}
                          >
                            <span className="font-mono text-primary shrink-0 mt-0.5">{s.code}</span>
                            <span className="text-muted-foreground line-clamp-2">{s.description}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {standards.length > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          {standards.map(s => (
            <Badge
              key={s.id}
              variant="outline"
              className="text-xs font-mono border-primary/30 text-primary gap-1 pr-1 group"
              title={`${s.ngss_code}: ${s.ngss_description}${s.matched_terms?.length ? `\nMatched: ${s.matched_terms.join(", ")}` : ""}`}
            >
              {s.ngss_code}
              <button
                onClick={() => onRemove(s.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {tagging && <span className="text-xs text-muted-foreground animate-pulse">Tagging…</span>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {tagging ? "Auto-tagging in progress…" : "No standards tagged yet. Use Auto-tag or add manually."}
        </p>
      )}
    </div>
  );
}
