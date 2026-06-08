/**
 * Portable starter dialog for the curriculum reading generator.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { generateReading } from "../client";
import type { AiPreferences, GenerateReadingOutput, ReadingFormat, SupabaseFunctionsClient } from "../index";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseFunctionsClient;
  defaults?: {
    subject_area?: string;
    objectives?: string;
    key_terms?: string;
    ngss_standard?: string;
    grade_level?: string;
    format?: ReadingFormat;
  };
  aiPreferences?: AiPreferences;
  onGenerated: (result: GenerateReadingOutput) => void;
  onError?: (err: Error) => void;
}

export function GenerateReadingDialog({
  open, onOpenChange, supabase, defaults, aiPreferences, onGenerated, onError,
}: Props) {
  const [subjectArea, setSubjectArea] = useState(defaults?.subject_area ?? "");
  const [objectives, setObjectives] = useState(defaults?.objectives ?? "");
  const [keyTerms, setKeyTerms] = useState(defaults?.key_terms ?? "");
  const [ngssStandard, setNgssStandard] = useState(defaults?.ngss_standard ?? "");
  const [gradeLevel, setGradeLevel] = useState(defaults?.grade_level ?? "8th grade");
  const [format, setFormat] = useState<ReadingFormat>(defaults?.format ?? "both");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      const result = await generateReading(supabase, {
        subject_area: subjectArea,
        objectives,
        key_terms: keyTerms || undefined,
        ngss_standard: ngssStandard || undefined,
        grade_level: gradeLevel,
        format,
        ai_preferences: aiPreferences,
      });
      onGenerated(result);
      onOpenChange(false);
    } catch (e) {
      onError?.(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = subjectArea.trim() && objectives.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Generate Curriculum Reading
          </DialogTitle>
          <DialogDescription>
            Five-act narrative reading anchored in a real historical scientist, with inline UDL supports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Subject area *</Label>
            <Input
              value={subjectArea}
              onChange={(e) => setSubjectArea(e.target.value)}
              placeholder="e.g. Plate tectonics, photosynthesis, electromagnetism"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Learning objectives *</Label>
            <Textarea
              rows={2}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="What should students know or be able to do?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>NGSS standard (optional)</Label>
              <Input
                value={ngssStandard}
                onChange={(e) => setNgssStandard(e.target.value)}
                placeholder="MS-ESS2-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grade level</Label>
              <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Key terms (optional)</Label>
            <Input
              value={keyTerms}
              onChange={(e) => setKeyTerms(e.target.value)}
              placeholder="comma-separated terms to weave in"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ReadingFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both (textbook + scripted)</SelectItem>
                <SelectItem value="textbook">Textbook only</SelectItem>
                <SelectItem value="scripted">Scripted lesson only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full gap-2" disabled={!canSubmit || busy} onClick={handle}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating..." : "Generate reading"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Heavy-tier model. May take 60–90 seconds.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
