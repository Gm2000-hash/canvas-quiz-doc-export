import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: { code: string; description: string }[];
  onSave: (selected: { code: string; description: string }[]) => void;
}

export function LessonStandardsPicker({ open, onOpenChange, selected, onSave }: Props) {
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState<Map<string, string>>(
    new Map(selected.map(s => [s.code, s.description]))
  );

  // Reset when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSelected(new Map(selected.map(s => [s.code, s.description])));
      setSearch("");
    }
    onOpenChange(isOpen);
  };

  const allStandards = Object.values(ALL_SUBSTANDARDS).flat();
  const filtered = search
    ? allStandards.filter(s => s.code.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()))
    : allStandards;

  const toggle = (code: string, desc: string) => {
    const next = new Map(localSelected);
    if (next.has(code)) next.delete(code);
    else next.set(code, desc);
    setLocalSelected(next);
  };

  const handleSave = () => {
    onSave(Array.from(localSelected.entries()).map(([code, description]) => ({ code, description })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select NGSS Standards</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search standards..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 pr-3">
            {filtered.map(s => (
              <label key={s.code} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <Checkbox
                  checked={localSelected.has(s.code)}
                  onCheckedChange={() => toggle(s.code, s.description)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">{s.code}</span>
                  <p className="text-xs text-muted-foreground leading-snug">{s.description}</p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{localSelected.size} selected</span>
          <Button onClick={handleSave} className="rounded-xl">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
