import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { ALL_SUBSTANDARDS, DOK_LEVELS, BLOOMS_LEVELS } from "@/lib/ngss-data";

// ─── NGSS Standards Picker ───

interface StandardsPickerProps {
  standards: { ngss_code: string; ngss_description: string }[];
  onChange: (standards: { ngss_code: string; ngss_description: string }[]) => void;
}

export function StandardsPicker({ standards, onChange }: StandardsPickerProps) {
  const [search, setSearch] = useState("");

  const removeStandard = (index: number) => {
    onChange(standards.filter((_, i) => i !== index));
  };

  const addStandard = (code: string, description: string) => {
    onChange([...standards, { ngss_code: code, ngss_description: description }]);
    setSearch("");
  };

  const filteredStandards = search.trim()
    ? Object.values(ALL_SUBSTANDARDS)
        .flat()
        .filter(sub => {
          const q = search.toLowerCase();
          return (
            (sub.code.toLowerCase().includes(q) || sub.description.toLowerCase().includes(q)) &&
            !standards.some(s => s.ngss_code === sub.code)
          );
        })
        .slice(0, 20)
    : [];

  return (
    <div className="space-y-2">
      <Label>NGSS Standards</Label>
      {standards.length > 0 && (
        <div className="space-y-1.5">
          {standards.map((s, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2 min-w-0">
              <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">{s.ngss_code}</Badge>
              <span className="text-xs text-muted-foreground flex-1 break-words">{s.ngss_description}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => removeStandard(idx)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search standards (e.g. MS-ESS2-3 or 'plate')..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 text-sm h-9"
        />
      </div>
      {search.trim() && (
        <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
          {filteredStandards.length > 0 ? (
            filteredStandards.map(sub => (
              <button
                key={sub.code}
                type="button"
                className="w-full flex items-start gap-2 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                onClick={() => addStandard(sub.code, sub.description)}
              >
                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{sub.code}</Badge>
                <span className="text-xs text-muted-foreground">{sub.description}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground p-3">No matching standards found</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DOK & Bloom's Picker ───

interface CognitiveLevelPickerProps {
  dokLevel: number | null;
  bloomsLevel: string | null;
  onDokChange: (dok: number | null) => void;
  onBloomsChange: (blooms: string | null) => void;
  compact?: boolean;
}

export function CognitiveLevelPicker({ dokLevel, bloomsLevel, onDokChange, onBloomsChange, compact }: CognitiveLevelPickerProps) {
  return (
    <div className={compact ? "flex gap-3" : "grid grid-cols-2 gap-3"}>
      <div className="space-y-1.5">
        <Label className="text-xs">DOK Level</Label>
        <Select value={dokLevel != null ? String(dokLevel) : "auto"} onValueChange={v => onDokChange(v === "auto" ? null : Number(v))}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Auto-detect" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect</SelectItem>
            {DOK_LEVELS.map(d => (
              <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Bloom's Level</Label>
        <Select value={bloomsLevel || "auto"} onValueChange={v => onBloomsChange(v === "auto" ? null : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Auto-detect" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect</SelectItem>
            {BLOOMS_LEVELS.map(b => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
