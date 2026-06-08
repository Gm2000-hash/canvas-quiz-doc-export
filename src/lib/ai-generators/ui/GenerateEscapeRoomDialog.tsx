/**
 * Portable starter dialog for the escape room generator.
 *
 * Returns the full escape room payload via onGenerated. Consumer renders the preview.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { generateEscapeRoom } from "../client";
import type {
  AiPreferences,
  EscapeRoomDifficulty,
  GenerateEscapeRoomOutput,
  SupabaseFunctionsClient,
} from "../index";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseFunctionsClient;
  defaults?: {
    title?: string;
    topic?: string;
    gradeLevel?: string;
    discipline?: string;
    objectives?: string;
    vocabulary?: string;
  };
  aiPreferences?: AiPreferences;
  onGenerated: (result: GenerateEscapeRoomOutput) => void;
  onError?: (err: Error) => void;
}

export function GenerateEscapeRoomDialog({
  open, onOpenChange, supabase, defaults, aiPreferences, onGenerated, onError,
}: Props) {
  const [topic, setTopic] = useState(defaults?.topic ?? defaults?.title ?? "");
  const [numPuzzles, setNumPuzzles] = useState(5);
  const [difficulty, setDifficulty] = useState<EscapeRoomDifficulty>("medium");
  const [additionalContext, setAdditionalContext] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      const result = await generateEscapeRoom(supabase, {
        title: defaults?.title ?? topic,
        topic,
        gradeLevel: defaults?.gradeLevel ?? "Middle School",
        discipline: defaults?.discipline ?? "Science",
        objectives: defaults?.objectives,
        vocabulary: defaults?.vocabulary,
        numPuzzles,
        difficulty,
        additionalContext: additionalContext || undefined,
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

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> Generate Escape Room
          </DialogTitle>
          <DialogDescription>
            Multi-room digital escape room with continuous storyline, designed for Google Forms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Topic / focus *</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Cell Division & Mitosis"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label># Rooms</Label>
              <Input
                type="number"
                min={3}
                max={10}
                value={numPuzzles}
                onChange={(e) => setNumPuzzles(Math.max(3, Math.min(10, Number(e.target.value) || 5)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as EscapeRoomDifficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Additional instructions (optional)</Label>
            <Textarea
              rows={3}
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. Use Chapter 5 vocabulary, focus on mitosis vs meiosis..."
            />
          </div>

          <Button className="w-full gap-2" disabled={!topic.trim() || busy} onClick={handle}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating..." : `Generate ${numPuzzles}-room escape room`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Uses heavy-tier model. May take 60–90 seconds.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
