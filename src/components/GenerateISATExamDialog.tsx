import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, Sparkles, CheckCircle2, FileText, Atom, Leaf, Globe, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const DISCIPLINES = [
  {
    id: "physical",
    label: "Physical Science",
    icon: Atom,
    grade: "6th",
    groups: ["MS-PS1", "MS-PS2", "MS-PS3", "MS-PS4"],
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "life",
    label: "Life Science",
    icon: Leaf,
    grade: "7th",
    groups: ["MS-LS1", "MS-LS2", "MS-LS3", "MS-LS4"],
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "earth",
    label: "Earth & Space Science",
    icon: Globe,
    grade: "8th",
    groups: ["MS-ESS1", "MS-ESS2", "MS-ESS3"],
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
];

export default function GenerateISATExamDialog({ open, onOpenChange, onComplete }: Props) {
  const [questionCount, setQuestionCount] = useState(35);
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);

  // Standards selection: set of selected substandard codes
  const [selectedStandards, setSelectedStandards] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Get all substandard codes for a discipline
  const getSubstandardsForDiscipline = (disc: typeof DISCIPLINES[number]) => {
    return disc.groups.flatMap(g => (ALL_SUBSTANDARDS[g] || []).map(s => s.code));
  };

  // Get all substandard codes for a group
  const getSubstandardsForGroup = (group: string) => {
    return (ALL_SUBSTANDARDS[group] || []).map(s => s.code);
  };

  // Check states
  const isDisciplineFullySelected = (disc: typeof DISCIPLINES[number]) => {
    const codes = getSubstandardsForDiscipline(disc);
    return codes.length > 0 && codes.every(c => selectedStandards.has(c));
  };

  const isDisciplinePartiallySelected = (disc: typeof DISCIPLINES[number]) => {
    const codes = getSubstandardsForDiscipline(disc);
    return codes.some(c => selectedStandards.has(c)) && !codes.every(c => selectedStandards.has(c));
  };

  const isGroupFullySelected = (group: string) => {
    const codes = getSubstandardsForGroup(group);
    return codes.length > 0 && codes.every(c => selectedStandards.has(c));
  };

  const isGroupPartiallySelected = (group: string) => {
    const codes = getSubstandardsForGroup(group);
    return codes.some(c => selectedStandards.has(c)) && !codes.every(c => selectedStandards.has(c));
  };

  // Toggle handlers
  const toggleDiscipline = (disc: typeof DISCIPLINES[number]) => {
    const codes = getSubstandardsForDiscipline(disc);
    const next = new Set(selectedStandards);
    if (isDisciplineFullySelected(disc)) {
      codes.forEach(c => next.delete(c));
    } else {
      codes.forEach(c => next.add(c));
    }
    setSelectedStandards(next);
  };

  const toggleGroup = (group: string) => {
    const codes = getSubstandardsForGroup(group);
    const next = new Set(selectedStandards);
    if (isGroupFullySelected(group)) {
      codes.forEach(c => next.delete(c));
    } else {
      codes.forEach(c => next.add(c));
    }
    setSelectedStandards(next);
  };

  const toggleStandard = (code: string) => {
    const next = new Set(selectedStandards);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelectedStandards(next);
  };

  const toggleExpanded = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpandedGroups(next);
  };

  // Build selected standards with descriptions for the API
  const selectedStandardsList = useMemo(() => {
    const result: { code: string; description: string }[] = [];
    for (const [group, subs] of Object.entries(ALL_SUBSTANDARDS)) {
      for (const s of subs) {
        if (selectedStandards.has(s.code)) {
          result.push({ code: s.code, description: s.description });
        }
      }
    }
    return result;
  }, [selectedStandards]);

  // Determine grade label for display
  const selectedDisciplineLabels = useMemo(() => {
    return DISCIPLINES.filter(d => d.groups.some(g =>
      (ALL_SUBSTANDARDS[g] || []).some(s => selectedStandards.has(s.code))
    )).map(d => d.label);
  }, [selectedStandards]);

  const handleGenerate = async () => {
    if (selectedStandards.size === 0) {
      toast.error("Please select at least one standard");
      return;
    }

    setGenerating(true);
    setDone(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-isat-exam", {
        body: {
          question_count: questionCount,
          title: title || undefined,
          selected_standards: selectedStandardsList,
        },
      });

      if (error) throw new Error(error.message || "Generation failed");
      if (data?.error) throw new Error(data.error);

      const questions = data?.questions || [];
      if (questions.length === 0) throw new Error("No questions generated");

      const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points_possible || 1), 0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const examTitle = title || `ISAT Practice Exam — ${selectedDisciplineLabels.join(", ")}`;
      const gradeLevel = selectedDisciplineLabels.length === 1
        ? DISCIPLINES.find(d => d.label === selectedDisciplineLabels[0])?.grade || "mixed"
        : "mixed";

      const { data: inserted, error: insertError } = await supabase
        .from("isat_exams")
        .insert({
          user_id: user.id,
          title: examTitle,
          grade_level: gradeLevel,
          question_count: questions.length,
          questions: questions as any,
          total_points: totalPoints,
        } as any)
        .select("id")
        .single();

      if (insertError) throw insertError;

      setExamId((inserted as any)?.id || null);
      setDone(true);
      toast.success(`ISAT exam created with ${questions.length} questions!`);
      onComplete();
    } catch (e: any) {
      console.error("ISAT exam generation error:", e);
      toast.error(e.message || "Failed to generate exam");
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setDone(false);
    setExamId(null);
    setTitle("");
  };

  const selectAll = () => {
    const all = new Set<string>();
    for (const subs of Object.values(ALL_SUBSTANDARDS)) {
      for (const s of subs) all.add(s.code);
    }
    setSelectedStandards(all);
  };

  const clearAll = () => setSelectedStandards(new Set());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!generating) { onOpenChange(v); reset(); } }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate ISAT Practice Exam
          </DialogTitle>
          <DialogDescription>
            Select standards across disciplines to create a customized practice exam.
          </DialogDescription>
        </DialogHeader>

        {!generating && !done ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-1.5">
              <Label>Exam Title (optional)</Label>
              <Input
                placeholder="ISAT Practice Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Number of Questions</Label>
              <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 questions (short)</SelectItem>
                  <SelectItem value="30">30 questions</SelectItem>
                  <SelectItem value="35">35 questions (recommended)</SelectItem>
                  <SelectItem value="45">45 questions (full length)</SelectItem>
                  <SelectItem value="50">50 questions (extended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Standards Picker */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <Label>Standards to Cover</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedStandards.size} selected
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-lg p-3 min-h-0" style={{ maxHeight: "50vh" }}>
                <div className="space-y-2">
                  {DISCIPLINES.map(disc => {
                    const Icon = disc.icon;
                    return (
                      <div key={disc.id} className="space-y-1">
                        {/* Discipline header */}
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${disc.bgColor} cursor-pointer`}
                          onClick={() => toggleDiscipline(disc)}
                        >
                          <Checkbox
                            checked={isDisciplineFullySelected(disc)}
                            className={isDisciplinePartiallySelected(disc) ? "data-[state=unchecked]:bg-primary/30 data-[state=unchecked]:border-primary" : ""}
                            onCheckedChange={() => toggleDiscipline(disc)}
                          />
                          <Icon className={`h-4 w-4 ${disc.color}`} />
                          <span className="text-sm font-medium flex-1">{disc.label}</span>
                          <span className="text-xs text-muted-foreground">{disc.grade} Grade</span>
                        </div>

                        {/* Core idea groups */}
                        <div className="ml-4 space-y-0.5">
                          {disc.groups.map(group => {
                            const subs = ALL_SUBSTANDARDS[group] || [];
                            const isExpanded = expandedGroups.has(group);
                            return (
                              <Collapsible key={group} open={isExpanded} onOpenChange={() => toggleExpanded(group)}>
                                <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50">
                                  <Checkbox
                                    checked={isGroupFullySelected(group)}
                                    className={isGroupPartiallySelected(group) ? "data-[state=unchecked]:bg-primary/30 data-[state=unchecked]:border-primary" : ""}
                                    onCheckedChange={() => toggleGroup(group)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <CollapsibleTrigger asChild>
                                    <button className="flex items-center gap-1.5 flex-1 text-left">
                                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                                      <span className="text-sm font-medium">{group}</span>
                                      <span className="text-xs text-muted-foreground">({subs.length})</span>
                                    </button>
                                  </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent>
                                  <div className="ml-6 space-y-0.5 pb-1">
                                    {subs.map(sub => (
                                      <div
                                        key={sub.code}
                                        className="flex items-start gap-2 py-1 px-2 rounded hover:bg-muted/30 cursor-pointer"
                                        onClick={() => toggleStandard(sub.code)}
                                      >
                                        <Checkbox
                                          checked={selectedStandards.has(sub.code)}
                                          onCheckedChange={() => toggleStandard(sub.code)}
                                          className="mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-mono font-medium text-primary">{sub.code}</span>
                                          <p className="text-xs text-muted-foreground leading-tight">{sub.description}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
              <p className="text-sm font-medium">Question Types Included:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Multiple Choice", "Select All That Apply", "Drag & Drop",
                  "Data Analysis", "Modeling & Diagrams", "Scenario-Based",
                  "Constructed Response", "Investigation Design", "Concept Mapping",
                ].map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full gap-2"
              size="lg"
              disabled={selectedStandards.size === 0}
            >
              <Sparkles className="h-4 w-4" />
              Generate {questionCount}-Question Exam ({selectedStandards.size} standards)
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This may take 30-60 seconds as AI generates a comprehensive exam.
            </p>
          </div>
        ) : generating ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your {questionCount}-question ISAT practice exam...
              </p>
              <p className="text-xs text-muted-foreground">
                Covering {selectedStandards.size} standards across {selectedDisciplineLabels.join(", ")}
              </p>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        ) : done ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-sm font-medium">ISAT Practice Exam Created!</p>
              <p className="text-xs text-muted-foreground">
                Your exam is ready. You can take it from the ISAT Exams tab.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
                Close
              </Button>
              <Button onClick={reset}>Generate Another</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
