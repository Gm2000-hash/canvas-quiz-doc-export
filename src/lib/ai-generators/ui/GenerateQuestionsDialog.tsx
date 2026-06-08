/**
 * Portable starter dialog for the question generator.
 *
 * UI deps: shadcn/ui components in @/components/ui/* and lucide-react.
 * No app-specific imports. Consumer supplies the Supabase client + onGenerated callback.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { generateQuestions } from "../client";
import type {
  GenerateQuestionsOutput,
  QuestionFramework,
  QuestionStyle,
  QuestionSubject,
  SupabaseFunctionsClient,
  AiPreferences,
} from "../index";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseFunctionsClient;
  /** Standard the questions will be aligned to. */
  standard: { code: string; description: string };
  /** Optional defaults for framework/subject. */
  defaults?: {
    framework?: QuestionFramework;
    subject?: QuestionSubject;
    count?: number;
  };
  aiPreferences?: AiPreferences;
  /** Called with the generated questions; consumer decides what to do (persist, preview, etc). */
  onGenerated: (result: GenerateQuestionsOutput) => void;
  onError?: (err: Error) => void;
}

export function GenerateQuestionsDialog({
  open,
  onOpenChange,
  supabase,
  standard,
  defaults,
  aiPreferences,
  onGenerated,
  onError,
}: Props) {
  const [count, setCount] = useState(defaults?.count ?? 10);
  const [framework, setFramework] = useState<QuestionFramework>(defaults?.framework ?? "NGSS");
  const [subject, setSubject] = useState<QuestionSubject>(defaults?.subject ?? "Science");
  const [style, setStyle] = useState<QuestionStyle>("standard");
  const [dok, setDok] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      const result = await generateQuestions(supabase, {
        standard_code: standard.code,
        standard_description: standard.description,
        count,
        framework,
        subject,
        question_style: subject === "Math" ? style : undefined,
        dok_level: dok ? (Number(dok) as 1 | 2 | 3 | 4) : undefined,
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
            <Sparkles className="h-5 w-5 text-primary" /> Generate Questions
          </DialogTitle>
          <DialogDescription>
            For <span className="font-medium">{standard.code}</span> — {standard.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Count</Label>
              <Input
                type="number"
                min={1}
                max={25}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 10)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>DOK Level</Label>
              <Select value={dok} onValueChange={setDok}>
                <SelectTrigger><SelectValue placeholder="Mixed" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Mixed</SelectItem>
                  <SelectItem value="1">DOK 1 — Recall</SelectItem>
                  <SelectItem value="2">DOK 2 — Skills/Concepts</SelectItem>
                  <SelectItem value="3">DOK 3 — Strategic Thinking</SelectItem>
                  <SelectItem value="4">DOK 4 — Extended Thinking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Framework</Label>
              <Select value={framework} onValueChange={(v) => setFramework(v as QuestionFramework)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGSS">NGSS</SelectItem>
                  <SelectItem value="Idaho">Idaho Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v as QuestionSubject)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Math">Math</SelectItem>
                  <SelectItem value="ELA">ELA</SelectItem>
                  <SelectItem value="Social Studies">Social Studies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {subject === "Math" && (
            <div className="space-y-1.5">
              <Label>Math style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as QuestionStyle)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="big_ideas">Big Ideas Math</SelectItem>
                  <SelectItem value="desmos">Desmos-style</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button className="w-full gap-2" disabled={busy} onClick={handle}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating..." : `Generate ${count} question${count === 1 ? "" : "s"}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            UDL-aligned. Mixes question formats and embeds engagement, representation, and action-expression supports.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
