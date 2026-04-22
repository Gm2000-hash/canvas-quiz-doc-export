import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { ALL_IDAHO_STANDARDS, ALL_IDAHO_STANDARDS_FLAT, IDAHO_CATEGORY_LABELS } from "@/lib/idaho-standards-data";
import { NGSS_DIMENSIONS, getDimensionByCode } from "@/lib/ngss-dimensions";
import { NgssDimensionPicker } from "@/components/NgssDimensionPicker";
import { useProfileDefaults } from "@/hooks/useProfileDefaults";
import { Search, Layers } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: { code: string; description: string }[];
  onSave: (selected: { code: string; description: string }[]) => void;
}

export function LessonStandardsPicker({ open, onOpenChange, selected, onSave }: Props) {
  const { defaultFramework, defaultIdahoFilter } = useProfileDefaults();
  const [search, setSearch] = useState("");
  const [framework, setFramework] = useState<"ngss" | "idaho">(defaultFramework);
  const [idahoFilter, setIdahoFilter] = useState<string>(defaultIdahoFilter);
  const [idahoCategoryFilter, setIdahoCategoryFilter] = useState<string>("all");
  const [localSelected, setLocalSelected] = useState<Map<string, string>>(
    new Map(selected.map(s => [s.code, s.description]))
  );
  const [dimensionPickerOpen, setDimensionPickerOpen] = useState(false);

  // Sync defaults when profile loads
  useEffect(() => {
    setFramework(defaultFramework);
    setIdahoFilter(defaultIdahoFilter);
  }, [defaultFramework, defaultIdahoFilter]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSelected(new Map(selected.map(s => [s.code, s.description])));
      setSearch("");
    }
    onOpenChange(isOpen);
  };

  const ngssStandards = Object.values(ALL_SUBSTANDARDS).flat();

  const getFilteredStandards = () => {
    if (framework === "ngss") {
      return search
        ? ngssStandards.filter(s => s.code.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()))
        : ngssStandards;
    }

    let standards = ALL_IDAHO_STANDARDS_FLAT;
    if (idahoFilter !== "all") {
      const [subject, grade] = idahoFilter.split("|");
      standards = standards.filter(s => s.subject === subject && s.grade === grade);
    }
    if (idahoCategoryFilter !== "all") {
      standards = standards.filter(s => s.category === idahoCategoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      standards = standards.filter(s => s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return standards;
  };

  const filtered = getFilteredStandards();

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

  // NGSS PEs that are currently selected — eligible for sub-component drill-down
  const selectedNgssParents = Array.from(localSelected.keys()).filter(code => NGSS_DIMENSIONS[code]);
  // Currently chosen sub-component codes (anything that resolves via getDimensionByCode)
  const selectedDimensionCodes = Array.from(localSelected.keys()).filter(code => !!getDimensionByCode(code));

  const handleDimensionsSave = (codes: string[]) => {
    const next = new Map(localSelected);
    // Drop existing dimensions whose parent PE is in scope, then add fresh selections
    for (const code of Array.from(next.keys())) {
      const dim = getDimensionByCode(code);
      if (dim) {
        const parentPE = code.split(".")[0];
        if (selectedNgssParents.includes(parentPE)) next.delete(code);
      }
    }
    for (const code of codes) {
      const dim = getDimensionByCode(code);
      if (dim) next.set(dim.code, `${dim.type} · ${dim.title} — ${dim.description}`);
    }
    setLocalSelected(next);
  };

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "essential": return "default";
      case "supporting": return "secondary";
      case "additional": return "outline";
      case "teacher_guidance": return "secondary";
      case "big_idea": return "default";
      default: return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Standards</DialogTitle>
        </DialogHeader>

        <Tabs value={framework} onValueChange={v => setFramework(v as "ngss" | "idaho")}>
          <TabsList className="w-full">
            <TabsTrigger value="idaho" className="flex-1">Idaho Standards</TabsTrigger>
            <TabsTrigger value="ngss" className="flex-1">NGSS (Science)</TabsTrigger>
          </TabsList>
        </Tabs>

        {framework === "idaho" && (
          <div className="flex gap-2">
            <Select value={idahoFilter} onValueChange={setIdahoFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects & Grades</SelectItem>
                {ALL_IDAHO_STANDARDS.map(gs => (
                  <SelectItem key={`${gs.subject}|${gs.grade}`} value={`${gs.subject}|${gs.grade}`}>
                    {gs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={idahoCategoryFilter} onValueChange={setIdahoCategoryFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(IDAHO_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search standards..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-1 pr-3">
            {filtered.map((s: any) => (
              <label key={s.code + (s.category || "")} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <Checkbox
                  checked={localSelected.has(s.code)}
                  onCheckedChange={() => toggle(s.code, s.description)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{s.code}</span>
                    {s.category && (
                      <Badge variant={categoryColor(s.category) as any} className="text-[10px] px-1.5 py-0">
                        {IDAHO_CATEGORY_LABELS[s.category] || s.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{s.description}</p>
                </div>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-4 text-center">No standards match your search</p>
            )}
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
